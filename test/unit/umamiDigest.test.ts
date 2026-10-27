import { describe, it, expect } from 'vitest'
// @ts-expect-error plain .mjs script without types
import { buildDigest, cleanEvents, weekKey } from '../../scripts/umami/digest.mjs'

const row = (sessionId: string, createdAt: string, eventName: string | null, urlPath = '/') => ({
  sessionId, createdAt, urlPath, eventName, eventType: eventName ? 2 : 1
})

const meta = { range: { from: '2026-10-01', to: '2026-10-26' }, fetchedAt: '2026-10-26T10:00:00Z', website: 'w' }

describe('cleanEvents', () => {
  const ev = (session: string, t: string, name: string) => ({ session, t: Date.parse(t), path: '/', name, pageview: false })

  it('drops search duplicates (0 s apart) from before the tracking fix only', () => {
    const { events, dropped } = cleanEvents([
      ev('a', '2026-10-01T10:00:00Z', 'search-started'),
      ev('a', '2026-10-01T10:00:00Z', 'search-started'),
      ev('a', '2026-10-01T10:05:00Z', 'search-started'),
      ev('b', '2026-10-10T10:00:00Z', 'search-started'),
      ev('b', '2026-10-10T10:00:00Z', 'search-started')
    ])
    expect(dropped.duplicateSearches).toBe(1)
    expect(events).toHaveLength(4)
  })
})

describe('weekKey', () => {
  it('returns the Monday of the Berlin week', () => {
    expect(weekKey(Date.parse('2026-10-25T12:00:00Z'))).toBe('2026-10-19') // Sunday
    expect(weekKey(Date.parse('2026-10-26T00:30:00+01:00'))).toBe('2026-10-26') // Monday
  })
})

describe('buildDigest', () => {
  const raw = {
    meta,
    stats: { pageviews: { value: 120, prev: 100 }, visitors: { value: 50, prev: 40 }, visits: 60, bounces: 30, totaltime: 1 },
    prevStats: { pageviews: 100, visitors: 40, visits: 50, bounces: 25, totaltime: 1 },
    metrics: { path: [{ x: '/', y: 50 }, { x: '/media/1', y: 10 }, { x: '/media/2', y: 5 }, { x: '/library/3', y: 2 }] },
    eventProps: { 'detail-view': { nearest_available_km: [0, 1, 2, 3, 4, 5, 6, 7].map((v) => ({ value: String(v), total: 1 })) } },
    events: [
      row('a', '2026-10-20T10:00:00Z', null, '/'),
      row('a', '2026-10-20T10:00:05Z', 'search-started'),
      row('a', '2026-10-20T10:00:10Z', null, '/media/1'),
      row('a', '2026-10-20T10:00:15Z', 'voebb-click'),
      row('b', '2026-10-20T11:00:00Z', null, '/'),
      row('b', '2026-10-20T11:00:05Z', 'search-started'),
      row('c', '2026-10-21T11:00:00Z', null, '/library/3'),
      row('c', '2026-10-21T11:00:05Z', 'mystery-event')
    ]
  }

  const d = buildDigest(raw)

  it('computes period deltas from both stats shapes', () => {
    expect(d.overview.pageviews).toEqual({ current: 120, previous: 100, deltaPct: 20 })
    expect(d.overview.visitors.deltaPct).toBe(25)
  })

  it('groups page paths', () => {
    expect(d.pages).toEqual({ home: 50, '/media/*': 15, '/library/*': 2 })
  })

  it('builds the session funnel', () => {
    expect(d.funnel.all.sessions).toBe(3)
    expect(d.funnel.all.search).toBe(2)
    expect(d.funnel.all.detail).toBe(1)
    expect(d.funnel.all.rates.voebbClickOfDetail).toBe(100)
    expect(d.funnel.all.rates.detailOfSearch).toBe(50)
  })

  it('only counts sessions after the tracking date for outbound click rates', () => {
    const withOld = buildDigest({
      ...raw,
      events: [row('old', '2026-09-01T10:00:00Z', null, '/media/9'), ...raw.events]
    })
    expect(withOld.funnel.all.rates.voebbClickOfDetail).toBe(50)
    expect(withOld.funnel.sinceVoebbTracking.rates.voebbClickOfDetail).toBe(100)
  })

  it('flags unknown events and features that never fired', () => {
    expect(d.unknownEvents).toEqual(['mystery-event'])
    expect(d.neverFired).toContain('showcase-click')
    expect(d.neverFired).not.toContain('voebb-click')
  })

  it('summarizes numeric properties', () => {
    expect(d.properties['detail-view'].nearest_available_km).toMatchObject({ n: 8, median: 3, zero: 1 })
  })

  it('does not count the filter events as unknown', () => {
    const filter = buildDigest({ ...raw, events: ['filter-open', 'filter-apply', 'filter-language', 'filter-media-type', 'filter-reset'].map((n) => row('a', '2026-10-28T10:00:00Z', n)) })
    expect(filter.unknownEvents).toEqual([])
  })

  describe('language filter decision', () => {
    const languageEvents = (sessions: number, perSession: number) =>
      Array.from({ length: sessions }, (_, s) =>
        Array.from({ length: perSession }, (_, i) => row(`s${s}`, `2026-11-0${1 + (i % 9)}T10:00:00Z`, 'filter-language'))
      ).flat()

    it('starts at zero', () => {
      expect(d.decisions.languageFilter).toMatchObject({ events: 0, sessions: 0, met: false, due: '2026-12-22', needsEvents: 8, needsSessions: 5 })
    })

    it('needs events and sessions: many events from few sessions are not enough', () => {
      const few = buildDigest({ ...raw, events: languageEvents(2, 6) })
      expect(few.decisions.languageFilter).toMatchObject({ events: 12, sessions: 2, met: false })
    })

    it('is met with 8 events from 5 sessions', () => {
      const enough = buildDigest({ ...raw, events: [...languageEvents(5, 1), ...languageEvents(1, 3).map((e) => ({ ...e, sessionId: 's0' }))] })
      expect(enough.decisions.languageFilter).toMatchObject({ events: 8, sessions: 5, met: true })
    })
  })

  it('drops localhost rows when the snapshot was fetched unfiltered', () => {
    const local = { ...row('dev', '2026-10-20T12:00:00Z', 'showcase-click'), hostname: 'localhost' }
    const filtered = buildDigest({ ...raw, events: [...raw.events, local] })
    expect(filtered.events.find((e: { name: string }) => e.name === 'showcase-click')).toBeUndefined()
    expect(filtered.warnings.some((w: string) => w.includes('localhost'))).toBe(true)
  })

  it('survives a snapshot with failed endpoints', () => {
    const broken = buildDigest({ meta: { ...meta, errors: { stats: '401' } }, stats: null, prevStats: null, metrics: {}, eventProps: {}, events: [] })
    expect(broken.warnings.some((w: string) => w.includes('stats failed'))).toBe(true)
    expect(broken.overview.visitors.current).toBe(0)
  })
})
