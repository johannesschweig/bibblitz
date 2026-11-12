import { describe, it, expect, vi } from 'vitest'
import { describeRunNotification, describeFailureNotification, createNtfySender } from '../../server/utils/watchNotify'
import type { RunReport } from '../../server/utils/watchService'

const SITE = 'https://www.bibblitz.de'

const report = (over: Partial<RunReport> = {}): RunReport => ({
  dry: false,
  expiredRemoved: 0,
  watches: 5,
  records: 3,
  maintenance: false,
  summary: { sent: 0, 'would-send': 0, waiting: 5, 'record-failed': 0, 'send-failed': 0 },
  results: [],
  ...over
})

describe('describeRunNotification', () => {
  it('is quiet when nothing is free', () => {
    const n = describeRunNotification(report(), SITE)
    expect(n.title).toBe('BibBlitz Wecker: 3 checked, nothing free')
    expect(n.message).toBe('3 titles checked (5 watches).\nNothing free yet.')
    expect(n.priority).toBe(2)
    expect(n.tags).toEqual(['white_check_mark'])
    expect(n.click).toBeUndefined()
  })

  it('names the title and libraries of a free copy, loud, with a link to the record', () => {
    const n = describeRunNotification(report({
      summary: { sent: 1, 'would-send': 0, waiting: 4, 'record-failed': 0, 'send-failed': 0 },
      results: [{ who: 'a***@b***.de', mediaId: '34758158', title: 'Die Lücken', action: 'sent', libraries: ['Amerika-Gedenkbibliothek', 'Bibliothek am Luisenbad'] }]
    }), SITE)
    expect(n.title).toBe('BibBlitz Wecker: 1 copy free, 1 alert sent')
    expect(n.message).toContain('1 alert sent, a copy is free:')
    expect(n.message).toContain('- Die Lücken (Amerika-Gedenkbibliothek, Bibliothek am Luisenbad)')
    expect(n.priority).toBe(4)
    expect(n.tags).toEqual(['bell'])
    expect(n.click).toBe('https://www.bibblitz.de/media/34758158')
  })

  it('lists a record once when several people watch it, and has no link when there are several records', () => {
    const sent = (mediaId: string, who: string) => ({ who, mediaId, title: `Titel ${mediaId}`, action: 'sent' as const, libraries: ['Hansabibliothek'] })
    const n = describeRunNotification(report({
      summary: { sent: 3, 'would-send': 0, waiting: 0, 'record-failed': 0, 'send-failed': 0 },
      results: [sent('1', 'a'), sent('1', 'b'), sent('2', 'c')]
    }), SITE)
    expect(n.title).toBe('BibBlitz Wecker: 3 copies free, 3 alerts sent')
    expect(n.message.match(/^- /gm)).toHaveLength(2)
    expect(n.click).toBeUndefined()
  })

  it('never contains an address, not even a masked one', () => {
    const n = describeRunNotification(report({
      summary: { sent: 1, 'would-send': 0, waiting: 0, 'record-failed': 0, 'send-failed': 0 },
      results: [{ who: 'a***@b***.de', mediaId: '1', title: 'Titel', action: 'sent', libraries: ['X'] }]
    }), SITE)
    expect(n.message).not.toContain('@')
    expect(n.message).not.toContain('***')
  })

  it('warns about failed records, failed mails, maintenance and removed watches', () => {
    const n = describeRunNotification(report({
      expiredRemoved: 2,
      maintenance: true,
      summary: { sent: 0, 'would-send': 0, waiting: 1, 'record-failed': 2, 'send-failed': 1 }
    }), SITE)
    expect(n.message).toContain('2 watches could not be checked')
    expect(n.message).toContain('1 alert mail failed to send')
    expect(n.message).toContain('VÖBB is in maintenance')
    expect(n.message).toContain('2 expired removed.')
    expect(n.priority).toBe(4)
    expect(n.tags).toEqual(['warning'])
  })

  it('uses default priority for failed records alone and the singular forms', () => {
    const n = describeRunNotification(report({ watches: 1, records: 1, summary: { sent: 0, 'would-send': 0, waiting: 0, 'record-failed': 1, 'send-failed': 0 } }), SITE)
    expect(n.message).toContain('1 title checked (1 watch).')
    expect(n.message).toContain('1 watch could not be checked')
    expect(n.priority).toBe(3)
  })

  it('keeps the title (an HTTP header) ASCII', () => {
    const n = describeRunNotification(report({
      maintenance: true,
      summary: { sent: 1, 'would-send': 0, waiting: 0, 'record-failed': 0, 'send-failed': 0 },
      results: [{ who: 'x', mediaId: '1', title: 'Über Größe', action: 'sent' }]
    }), SITE)
    expect(n.title).toMatch(/^[\x20-\x7e]+$/)
  })
})

describe('describeFailureNotification', () => {
  it('is loud and carries the error message', () => {
    const n = describeFailureNotification(new Error('supabase down'))
    expect(n.title).toBe('BibBlitz Wecker: run failed')
    expect(n.message).toContain('supabase down')
    expect(n.priority).toBe(4)
  })
})

describe('createNtfySender', () => {
  const notification = { title: 'T', message: 'Böse Überraschung', priority: 4 as const, tags: ['bell', 'x'], click: 'https://www.bibblitz.de/media/1' }

  it('posts the message to the topic with title, priority, tags and click as headers', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    await createNtfySender('geheim-topic', fetchMock as unknown as typeof fetch)(notification)

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://ntfy.sh/geheim-topic')
    expect(init.method).toBe('POST')
    expect(init.body).toBe('Böse Überraschung')
    expect(init.headers).toEqual({ Title: 'T', Priority: '4', Tags: 'bell,x', Click: 'https://www.bibblitz.de/media/1' })
  })

  it('throws when ntfy refuses, without naming the topic', async () => {
    const fetchMock = vi.fn(async () => new Response('no', { status: 429 }))
    const promise = createNtfySender('geheim-topic', fetchMock as unknown as typeof fetch)(notification)
    await expect(promise).rejects.toThrow('ntfy answered 429')
    await expect(promise).rejects.not.toThrow(/geheim/)
  })
})
