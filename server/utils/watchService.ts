// The logic of the shelf watch (Wecker): subscribe, confirm, stop and the checker run. Pure functions over
// injected dependencies (store, mail, record fetch, clock), so the tests run them without Supabase, Brevo or
// voebb.de. The API routes in server/api/watch/ only wire the real dependencies in. See docs/shelf-watch.md.
import libraryData from '~/assets/libraries.json'
import { splitLibraryName } from '../../utils/availability'
import { splitSubtitle } from '../../utils/catalogText'
import { accessNote } from '../../utils/shelfmark'
import { groupWatchLibraries, isValidEmail } from '../../utils/watch'
import { confirmMail, alertMail, type AlertLibrary } from '../../utils/watchMail'
import { makeWatchToken, verifyWatchToken } from './watchToken'
import type { WatchStore, WatchRow } from './watchStore'
import type { SendMail } from './watchMailer'
import type { RecordResult } from './recordFetch'

const HOUR = 60 * 60 * 1000
export const CONFIRM_WINDOW_MS = 24 * HOUR
export const ACTIVE_WINDOW_MS = 30 * 24 * HOUR
const MAX_LIBRARIES = 20

const KNOWN_LIBRARIES = new Set((libraryData as Array<{ id: string }>).map(library => library.id))

export interface WatchDeps {
  store: WatchStore
  sendMail: SendMail
  fetchRecord: (id: string) => Promise<RecordResult>
  // Secret that signs the links in the mails
  secret: string
  // https://www.bibblitz.de, no trailing slash
  siteUrl: string
  now?: () => Date
}

const clock = (deps: WatchDeps) => (deps.now ?? (() => new Date()))()

function links(deps: WatchDeps, row: Pick<WatchRow, 'id' | 'mediaId'>, count: number) {
  const token = makeWatchToken(deps.secret, row.id)
  const q = `token=${encodeURIComponent(token)}&id=${row.mediaId}`
  return {
    confirmUrl: `${deps.siteUrl}/watch/confirm?${q}&n=${count}`,
    stopUrl: `${deps.siteUrl}/watch/stop?${q}`,
    unsubscribeUrl: `${deps.siteUrl}/api/watch/stop?token=${encodeURIComponent(token)}`,
    titleUrl: `${deps.siteUrl}/media/${row.mediaId}?ref=wecker`
  }
}

// ---------------------------------------------------------------- subscribe

export interface SubscribeInput {
  email: unknown
  mediaId: unknown
  libraryIds: unknown
}

export type SubscribeResult = { ok: true } | { ok: false, reason: 'invalid' | 'error' }

export async function subscribe(deps: WatchDeps, input: SubscribeInput): Promise<SubscribeResult> {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  const mediaId = typeof input.mediaId === 'string' ? input.mediaId : ''
  const libraryIds = Array.isArray(input.libraryIds) ? [...new Set(input.libraryIds.filter((id): id is string => typeof id === 'string'))] : []

  if (!isValidEmail(email) || email.length > 254) return { ok: false, reason: 'invalid' }
  if (!/^\d{1,12}$/.test(mediaId)) return { ok: false, reason: 'invalid' }
  if (libraryIds.length < 1 || libraryIds.length > MAX_LIBRARIES || !libraryIds.every(id => KNOWN_LIBRARIES.has(id))) {
    return { ok: false, reason: 'invalid' }
  }

  // The record must exist and the libraries must hold a copy of it: the title for the mails comes from VÖBB, not from the visitor
  const record = await deps.fetchRecord(mediaId)
  if (!record.success) return { ok: false, reason: 'error' }
  const holding = new Set(groupWatchLibraries(record.data.availability ?? []).map(library => library.libraryId))
  if (!libraryIds.every(id => holding.has(id))) return { ok: false, reason: 'invalid' }
  const title = splitSubtitle(record.data.title).main

  const now = clock(deps)
  const { row, created } = await deps.store.upsertPending({
    email,
    mediaId,
    mediaTitle: title,
    libraryIds,
    expiresAt: new Date(now.getTime() + CONFIRM_WINDOW_MS).toISOString()
  })

  const { confirmUrl, stopUrl, unsubscribeUrl } = links(deps, row, libraryIds.length)
  const mail = confirmMail({ title, count: libraryIds.length, confirmUrl, stopUrl })
  try {
    await deps.sendMail({ to: email, subject: mail.subject, html: mail.html, text: mail.text, unsubscribeUrl })
  } catch (error) {
    // No mail, no watch: a row nobody can confirm would only sit there
    if (created) await deps.store.deleteById(row.id)
    console.error('[watch] confirmation mail failed:', (error as Error).message)
    return { ok: false, reason: 'error' }
  }
  return { ok: true }
}

// ---------------------------------------------------------------- confirm and stop

export type ConfirmStatus = 'ok' | 'active' | 'expired'

export async function confirmWatch(deps: WatchDeps, token: unknown): Promise<ConfirmStatus> {
  const id = verifyWatchToken(deps.secret, token)
  if (!id) return 'expired'
  const row = await deps.store.findById(id)
  if (!row) return 'expired'

  const now = clock(deps)
  if (new Date(row.expiresAt) < now) {
    await deps.store.deleteById(row.id)
    return 'expired'
  }
  if (row.status === 'active') return 'active'
  await deps.store.activate(row.id, new Date(now.getTime() + ACTIVE_WINDOW_MS).toISOString(), now.toISOString())
  return 'ok'
}

export type StopStatus = 'ok' | 'gone'

export async function stopWatch(deps: WatchDeps, token: unknown): Promise<StopStatus> {
  const id = verifyWatchToken(deps.secret, token)
  if (!id) return 'gone'
  return (await deps.store.deleteById(id)) ? 'ok' : 'gone'
}

// ---------------------------------------------------------------- checker

export type RunAction = 'sent' | 'would-send' | 'waiting' | 'record-failed' | 'send-failed'

export interface RunResult {
  who: string
  mediaId: string
  title: string
  action: RunAction
  libraries?: string[]
}

export interface RunReport {
  dry: boolean
  expiredRemoved: number
  watches: number
  records: number
  // VÖBB was in maintenance: the run stopped, nothing was sent
  maintenance: boolean
  summary: Record<RunAction, number>
  results: RunResult[]
}

/** "anna@beispiel.de" -> "a***@b***.de", enough to recognise an entry in the report without exposing it */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@')
  const dot = domain.lastIndexOf('.')
  const host = dot > 0 ? domain.slice(0, dot) : domain
  const tld = dot > 0 ? domain.slice(dot) : ''
  return `${local.slice(0, 1)}***@${host.slice(0, 1)}***${tld}`
}

export interface RunOptions {
  dry: boolean
  // Pause between two records, to be kind to voebb.de (tests pass 0)
  pauseMs?: number
}

/**
 * Looks at every active watch, once per record. A watch whose libraries have a free copy now gets the alert and
 * is deleted (one-shot); the others wait for the next run. With `dry` nothing is sent or changed.
 */
export async function runWatches(deps: WatchDeps, options: RunOptions): Promise<RunReport> {
  const now = clock(deps)
  const report: RunReport = {
    dry: options.dry,
    expiredRemoved: 0,
    watches: 0,
    records: 0,
    maintenance: false,
    summary: { sent: 0, 'would-send': 0, waiting: 0, 'record-failed': 0, 'send-failed': 0 },
    results: []
  }

  if (!options.dry) report.expiredRemoved = await deps.store.deleteExpired(now.toISOString())
  const active = (await deps.store.listActive()).filter(row => new Date(row.expiresAt) >= now)
  report.watches = active.length

  const byRecord = new Map<string, WatchRow[]>()
  for (const row of active) byRecord.set(row.mediaId, [...(byRecord.get(row.mediaId) ?? []), row])

  const checked: string[] = []
  let first = true
  for (const [mediaId, rows] of byRecord) {
    if (!first && options.pauseMs) await new Promise(resolve => setTimeout(resolve, options.pauseMs))
    first = false
    report.records++

    const record = await deps.fetchRecord(mediaId)
    if ('maintenance' in record && record.maintenance) {
      report.maintenance = true
      break
    }
    if (!record.success) {
      for (const row of rows) push(report, { who: maskEmail(row.email), mediaId, title: row.mediaTitle, action: 'record-failed' })
      continue
    }

    const title = splitSubtitle(record.data.title).main
    const libraries = groupWatchLibraries(record.data.availability ?? [])
    for (const row of rows) {
      checked.push(row.id)
      const free = libraries.filter(library => library.free && row.libraryIds.includes(library.libraryId))
      if (free.length === 0) {
        push(report, { who: maskEmail(row.email), mediaId, title, action: 'waiting' })
        continue
      }

      const alertLibraries: AlertLibrary[] = free.map(library => ({
        name: splitLibraryName(library.libraryName).name,
        shelfmark: library.best.shelfmark,
        note: accessNote(library.best.access)
      }))
      const names = alertLibraries.map(library => library.name)
      if (options.dry) {
        push(report, { who: maskEmail(row.email), mediaId, title, action: 'would-send', libraries: names })
        continue
      }

      const { stopUrl, unsubscribeUrl, titleUrl } = links(deps, row, row.libraryIds.length)
      const mail = alertMail({ title, libraries: alertLibraries, titleUrl, stopUrl })
      try {
        await deps.sendMail({ to: row.email, subject: mail.subject, html: mail.html, text: mail.text, unsubscribeUrl })
      } catch (error) {
        console.error('[watch] alert mail failed:', (error as Error).message)
        push(report, { who: maskEmail(row.email), mediaId, title, action: 'send-failed', libraries: names })
        continue
      }
      // One-shot: the address goes with the alert
      await deps.store.deleteById(row.id)
      push(report, { who: maskEmail(row.email), mediaId, title, action: 'sent', libraries: names })
    }
  }

  if (!options.dry) await deps.store.markChecked(checked, now.toISOString())
  return report
}

function push(report: RunReport, result: RunResult) {
  report.results.push(result)
  report.summary[result.action]++
}
