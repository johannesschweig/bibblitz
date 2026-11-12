// The logic of the shelf watch without Supabase, Brevo or voebb.de: subscribe, confirm, stop and the checker run.
import { describe, it, expect, beforeEach } from 'vitest'
import type { AvailabilityInfo } from '../../types/types'
import { createMemoryStore } from '../../server/utils/watchStore'
import { makeWatchToken, verifyWatchToken } from '../../server/utils/watchToken'
import { createRateLimiter } from '../../server/utils/watchRateLimit'
import {
  subscribe, confirmWatch, stopWatch, runWatches, maskEmail, CONFIRM_WINDOW_MS, ACTIVE_WINDOW_MS, type WatchDeps
} from '../../server/utils/watchService'
import type { OutgoingMail } from '../../server/utils/watchMailer'
import type { RecordResult } from '../../server/utils/recordFetch'

const SECRET = 'test-secret'
const NOW = new Date('2026-11-12T10:00:00Z')

// Two libraries from libraries.json; the record has a free copy at the first one only when `free` says so
const copy = (libraryId: string, libraryName: string, free: boolean, shelfmark = 'Roman Must'): AvailabilityInfo =>
  free
    ? { libraryId, libraryName, status: 'Verfügbar', daysToWait: -999, shelfmark }
    : { libraryId, libraryName, status: 'Ausgeliehen - Fällig am: 01.01.2099', daysToWait: 30, shelfmark }

let record: RecordResult
let mails: OutgoingMail[]
let failMail: boolean
let store: ReturnType<typeof createMemoryStore>
let deps: WatchDeps
const fetched: string[] = []

const WASSERTURM = 'bibliothek-am-wasserturm'
const LUISENBAD = 'bibliothek-am-luisenbad'

const recordWith = (wasserturmFree: boolean, luisenbadFree = false, title = 'Die Wartenden : Roman'): RecordResult => ({
  success: true,
  data: {
    id: '3',
    title,
    mediaType: 'Buch',
    availability: [
      copy(WASSERTURM, 'Pankow: Bibliothek am Wasserturm', wasserturmFree),
      copy(LUISENBAD, 'Mitte: Bibliothek am Luisenbad', luisenbadFree)
    ]
  }
})

beforeEach(() => {
  record = recordWith(false)
  mails = []
  failMail = false
  fetched.length = 0
  store = createMemoryStore()
  deps = {
    store,
    secret: SECRET,
    siteUrl: 'https://www.bibblitz.de',
    now: () => NOW,
    fetchRecord: async (id) => { fetched.push(id); return record },
    sendMail: async (mail) => {
      if (failMail) throw new Error('smtp down')
      mails.push(mail)
    }
  }
})

const input = (over: Record<string, unknown> = {}) => ({ email: 'Anna@Beispiel.de', mediaId: '35408557', libraryIds: [WASSERTURM, LUISENBAD], ...over })

describe('watch tokens', () => {
  const id = '3f2b8c1e-5a4d-4e6f-9b0a-1c2d3e4f5a6b'

  it('verifies a genuine token and returns the id', () => {
    expect(verifyWatchToken(SECRET, makeWatchToken(SECRET, id))).toBe(id)
  })

  it('rejects tokens signed with another secret, tampered, malformed or not a string', () => {
    const token = makeWatchToken(SECRET, id)
    expect(verifyWatchToken('other', token)).toBeNull()
    expect(verifyWatchToken(SECRET, token.slice(0, -2) + 'xx')).toBeNull()
    expect(verifyWatchToken(SECRET, `${id}x.${token.split('.')[1]}`)).toBeNull()
    expect(verifyWatchToken(SECRET, 'no-dot')).toBeNull()
    expect(verifyWatchToken(SECRET, 42)).toBeNull()
    expect(verifyWatchToken('', token)).toBeNull()
  })
})

describe('rate limiter', () => {
  it('allows up to the limit within the window and again after it', () => {
    const limiter = createRateLimiter(2, 1000)
    expect(limiter.allow('a', 0)).toBe(true)
    expect(limiter.allow('a', 100)).toBe(true)
    expect(limiter.allow('a', 200)).toBe(false)
    expect(limiter.allow('b', 200)).toBe(true)
    expect(limiter.allow('a', 1200)).toBe(true)
  })
})

describe('subscribe', () => {
  it('stores a pending watch and mails the confirmation with links that carry a token', async () => {
    const result = await subscribe(deps, input())
    expect(result).toEqual({ ok: true })

    const [row] = [...store.rows.values()]
    expect(row).toMatchObject({ email: 'anna@beispiel.de', mediaId: '35408557', mediaTitle: 'Die Wartenden', status: 'pending', libraryIds: [WASSERTURM, LUISENBAD] })
    expect(new Date(row!.expiresAt).getTime()).toBe(NOW.getTime() + CONFIRM_WINDOW_MS)

    expect(mails).toHaveLength(1)
    const mail = mails[0]!
    expect(mail.to).toBe('anna@beispiel.de')
    expect(mail.subject).toBe('Bitte bestätigen: Wecker für „Die Wartenden“')
    const token = makeWatchToken(SECRET, row!.id)
    expect(mail.html).toContain(`https://www.bibblitz.de/watch/confirm?token=${encodeURIComponent(token)}&amp;id=35408557&amp;n=2`)
    expect(mail.html).toContain('/watch/stop?token=')
    expect(mail.unsubscribeUrl).toBe(`https://www.bibblitz.de/api/watch/stop?token=${encodeURIComponent(token)}`)
    expect(mail.text).toContain('in einer deiner 2 Bibliotheken')
  })

  it('refuses anything that is not a valid address, record id or known library', async () => {
    for (const bad of [
      input({ email: 'kein-mail' }),
      input({ email: 42 }),
      input({ mediaId: 'abc' }),
      input({ mediaId: '1'.repeat(13) }),
      input({ libraryIds: [] }),
      input({ libraryIds: ['no-such-library'] }),
      input({ libraryIds: 'not-an-array' })
    ]) {
      expect(await subscribe(deps, bad)).toEqual({ ok: false, reason: 'invalid' })
    }
    expect(mails).toHaveLength(0)
    expect(store.rows.size).toBe(0)
  })

  it('refuses libraries that hold no copy of the record: the visitor cannot pick any library', async () => {
    const result = await subscribe(deps, input({ libraryIds: ['hansabibliothek'] }))
    expect(result).toEqual({ ok: false, reason: 'invalid' })
  })

  it('answers with an error when the record cannot be fetched', async () => {
    record = { success: false, error: 'boom' }
    expect(await subscribe(deps, input())).toEqual({ ok: false, reason: 'error' })
    record = { success: false, maintenance: true }
    expect(await subscribe(deps, input())).toEqual({ ok: false, reason: 'error' })
    expect(store.rows.size).toBe(0)
  })

  it('subscribing again for the same address and record keeps one row and the same token', async () => {
    await subscribe(deps, input())
    await subscribe(deps, input({ email: 'ANNA@beispiel.de', libraryIds: [WASSERTURM] }))
    expect(store.rows.size).toBe(1)
    expect([...store.rows.values()][0]!.libraryIds).toEqual([WASSERTURM])
    expect(mails).toHaveLength(2)
    expect(mails[0]!.unsubscribeUrl).toBe(mails[1]!.unsubscribeUrl)
  })

  it('does not leave a watch behind when the confirmation mail cannot be sent', async () => {
    failMail = true
    expect(await subscribe(deps, input())).toEqual({ ok: false, reason: 'error' })
    expect(store.rows.size).toBe(0)
  })
})

describe('confirm and stop', () => {
  async function pending() {
    await subscribe(deps, input())
    const [row] = [...store.rows.values()]
    return { row: row!, token: makeWatchToken(SECRET, row!.id) }
  }

  it('confirming switches the watch on for 30 days, and a second click says it already runs', async () => {
    const { row, token } = await pending()
    expect(await confirmWatch(deps, token)).toBe('ok')
    const after = store.rows.get(row.id)!
    expect(after.status).toBe('active')
    expect(after.confirmedAt).toBe(NOW.toISOString())
    expect(new Date(after.expiresAt).getTime()).toBe(NOW.getTime() + ACTIVE_WINDOW_MS)
    expect(await confirmWatch(deps, token)).toBe('active')
  })

  it('an unconfirmed link past 24 hours is expired and the row is deleted', async () => {
    const { row, token } = await pending()
    const later = { ...deps, now: () => new Date(NOW.getTime() + CONFIRM_WINDOW_MS + 1000) }
    expect(await confirmWatch(later, token)).toBe('expired')
    expect(store.rows.has(row.id)).toBe(false)
  })

  it('a forged or unknown token confirms nothing', async () => {
    const { row } = await pending()
    expect(await confirmWatch(deps, 'garbage')).toBe('expired')
    expect(await confirmWatch(deps, makeWatchToken('wrong-secret', row.id))).toBe('expired')
    expect(store.rows.get(row.id)!.status).toBe('pending')
  })

  it('stopping deletes the row, a second stop and a forged token say it is gone', async () => {
    const { row, token } = await pending()
    expect(await stopWatch(deps, makeWatchToken('wrong-secret', row.id))).toBe('gone')
    expect(store.rows.has(row.id)).toBe(true)
    expect(await stopWatch(deps, token)).toBe('ok')
    expect(store.rows.has(row.id)).toBe(false)
    expect(await stopWatch(deps, token)).toBe('gone')
  })
})

describe('the checker run', () => {
  async function activeWatch(email = 'anna@beispiel.de', libraryIds = [WASSERTURM, LUISENBAD]) {
    await subscribe(deps, input({ email, libraryIds }))
    mails = []
    const row = [...store.rows.values()].find(r => r.email === email)!
    await confirmWatch(deps, makeWatchToken(SECRET, row.id))
    return row
  }
  const run = (dry: boolean) => runWatches(deps, { dry, pauseMs: 0 })

  it('keeps waiting while none of the chosen libraries has a free copy', async () => {
    await activeWatch()
    const report = await run(false)
    expect(report.summary).toMatchObject({ waiting: 1, sent: 0 })
    expect(mails).toHaveLength(0)
    expect(store.rows.size).toBe(1)
  })

  it('mails the alert once a chosen library has a free copy, then deletes the address', async () => {
    const row = await activeWatch()
    record = recordWith(true)
    const report = await run(false)

    expect(report.summary.sent).toBe(1)
    expect(report.results[0]).toMatchObject({ who: 'a***@b***.de', action: 'sent', libraries: ['Bibliothek am Wasserturm'] })
    expect(store.rows.has(row.id)).toBe(false)

    expect(mails).toHaveLength(1)
    const mail = mails[0]!
    expect(mail.to).toBe('anna@beispiel.de')
    expect(mail.subject).toBe('Wecker: „Die Wartenden“ ist verfügbar')
    expect(mail.html).toContain('Bibliothek am Wasserturm')
    expect(mail.html).toContain('Signatur: Roman Must')
    expect(mail.html).toContain('https://www.bibblitz.de/media/35408557?ref=wecker')
    expect(mail.html).not.toContain('Luisenbad')
  })

  it('only counts the libraries the visitor chose, not other free ones', async () => {
    await activeWatch('anna@beispiel.de', [WASSERTURM])
    record = recordWith(false, true)
    expect((await run(false)).summary).toMatchObject({ waiting: 1, sent: 0 })
  })

  it('a dry run reports what would go out and changes nothing', async () => {
    const row = await activeWatch()
    record = recordWith(true)
    const report = await run(true)
    expect(report.dry).toBe(true)
    expect(report.summary['would-send']).toBe(1)
    expect(mails).toHaveLength(0)
    expect(store.rows.has(row.id)).toBe(true)
  })

  it('looks at each record once, however many people wait for it', async () => {
    await activeWatch('anna@beispiel.de')
    await activeWatch('ben@beispiel.de')
    fetched.length = 0
    record = recordWith(true)
    const report = await run(false)
    expect(fetched).toHaveLength(1)
    expect(report.summary.sent).toBe(2)
    expect(report.records).toBe(1)
  })

  it('stops without sending anything while voebb.de is in maintenance', async () => {
    await activeWatch()
    record = { success: false, maintenance: true }
    const report = await run(false)
    expect(report.maintenance).toBe(true)
    expect(mails).toHaveLength(0)
    expect(store.rows.size).toBe(1)
  })

  it('keeps the watch when a record fails to load, and when the alert mail fails', async () => {
    const row = await activeWatch()
    record = { success: false, error: 'boom' }
    expect((await run(false)).summary['record-failed']).toBe(1)

    record = recordWith(true)
    failMail = true
    expect((await run(false)).summary['send-failed']).toBe(1)
    expect(store.rows.has(row.id)).toBe(true)
  })

  it('removes expired watches and ignores pending ones', async () => {
    const stale = await activeWatch('old@beispiel.de')
    await subscribe(deps, input({ email: 'new@beispiel.de' }))
    const later = { ...deps, now: () => new Date(NOW.getTime() + ACTIVE_WINDOW_MS + 1000) }
    const report = await runWatches(later, { dry: false, pauseMs: 0 })
    expect(report.expiredRemoved).toBe(2)
    expect(store.rows.has(stale.id)).toBe(false)
  })

  it('records when a watch was last checked', async () => {
    const row = await activeWatch()
    await run(false)
    expect(store.rows.get(row.id)!.lastCheckedAt).toBe(NOW.toISOString())
  })
})

describe('maskEmail', () => {
  it('keeps the first letters and the ending only', () => {
    expect(maskEmail('anna@beispiel.de')).toBe('a***@b***.de')
    expect(maskEmail('x@y.co.uk')).toBe('x***@y***.uk')
  })
})
