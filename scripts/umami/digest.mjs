// Turns a raw Umami snapshot (written by fetch.mjs) into a small, deterministic digest.
// Counting, dedup and funnels happen here in code; interpreting the numbers is left to Claude (see .claude/skills/umami-review).
//
// CLI: node scripts/umami/digest.mjs [snapshot-dir]   (default: newest dir in data/umami)
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Event name -> feature, mirrors the "Feature inventory" in CLAUDE.md. Add new events here.
export const FEATURES = {
  'search-started': 'Text / ISBN search',
  'search-quick': 'Quick-search chips',
  'filter-open': 'Filter page: opened',
  'filter-apply': 'Filter page: applied (language, media type; reset: 1 = cleared)',
  'filter-language': 'Filter page: a language was applied (decision metric 22.12.2026)',
  'filter-media-type': 'Filter page: a media type was applied',
  'filter-reset': 'Filter page: reset',
  'search-next-page': 'Pagination',
  'search-load-more': 'Pagination (old event name)',
  'zip-save': 'ZIP entry',
  'showcase-click': 'Showcase',
  'toggle-faq': 'FAQ accordion',
  'detail-view': 'Detail outcome',
  'branches-expand': 'Expand far branches',
  'voebb-click': 'VÖBB link (closest to a conversion)',
  'isbn-click': 'ISBN click',
  'back-click': 'Navbar "Zurück" (from, had_history: 0 = direct landing, fell back)',
  'logo-click': 'Logo click, clears the results (from, had_results)',
  'author-click': 'Author click',
  'library-maps-click': 'Library: Google Maps',
  'library-website-click': 'Library: website'
}

// Events of removed features: still show up in old data, are not "unknown".
// click-media-filter: the media-type chips moved onto the filter page on 27.10.2026 (filter-apply).
export const REMOVED_EVENTS = ['bookmark-button-clicked', 'share-media', 'library-click', 'click-media-filter']

// Fixed on 09.10.2026: search events fired twice (0 s apart) and FAQ closes were counted as events.
// Only the search duplicates can be repaired from the raw events (FAQ ids live in the event data, not in the event rows).
export const TRACKING_FIX_DATE = '2026-10-09'
const DEDUPE_WINDOW_MS = 2000
// First day with data; a previous period reaching back before this is only partly filled
export const LAUNCH_DATE = '2026-06-15'
export const VOEBB_TRACKING_DATE = '2026-10-09'
export const LIBRARY_OUTBOUND_TRACKING_DATE = '2026-10-17'

// Decision on the language filter (CLAUDE.md, feature inventory): keep it with at least this many
// `filter-language` events from at least this many sessions, otherwise remove the language chips.
export const LANGUAGE_FILTER_DECISION = { since: '2026-10-27', due: '2026-12-22', needsEvents: 8, needsSessions: 5 }

const TZ = 'Europe/Berlin'
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
export const dayKey = (ms) => dayFmt.format(ms)

// Monday of the week (Berlin) as YYYY-MM-DD
export function weekKey(ms) {
  const d = new Date(`${dayKey(ms)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null)
const delta = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : null)

// Umami returns stats either as plain numbers or as { value, prev }
const num = (v) => (v && typeof v === 'object' ? (v.value ?? 0) : (v ?? 0))

function normalizeEvents(rawEvents) {
  return rawEvents
    .map((e) => ({
      session: e.sessionId,
      t: Date.parse(e.createdAt),
      path: e.urlPath ?? '',
      name: e.eventName || null,
      // eventType 1 = pageview, 2 = custom event
      pageview: e.eventType === 1 || !e.eventName
    }))
    .filter((e) => e.session && Number.isFinite(e.t))
    .sort((a, b) => a.t - b.t)
}

// Drops the known tracking artefacts so counts are comparable before and after the fix.
export function cleanEvents(events) {
  const fixMs = Date.parse(`${TRACKING_FIX_DATE}T00:00:00+02:00`)
  const lastSearch = new Map()
  const out = []
  const dropped = { duplicateSearches: 0 }

  for (const e of events) {
    if (e.name === 'search-started' && e.t < fixMs) {
      const last = lastSearch.get(e.session)
      lastSearch.set(e.session, e.t)
      if (last !== undefined && e.t - last < DEDUPE_WINDOW_MS) {
        dropped.duplicateSearches++
        continue
      }
    }
    out.push(e)
  }
  return { events: out, dropped }
}

function summarizeProperty(values) {
  const rows = values.map((v) => ({ value: v.value, total: v.total ?? 0 }))
  const n = rows.reduce((s, r) => s + r.total, 0)
  const numeric = rows.length > 0 && rows.every((r) => r.value !== '' && r.value !== null && Number.isFinite(Number(r.value)))
  if (numeric && rows.length > 6) {
    const sorted = rows.map((r) => ({ v: Number(r.value), total: r.total })).sort((a, b) => a.v - b.v)
    const at = (q) => {
      let acc = 0
      for (const r of sorted) {
        acc += r.total
        if (acc >= n * q) return r.v
      }
      return null
    }
    const mean = sorted.reduce((s, r) => s + r.v * r.total, 0) / (n || 1)
    return { n, mean: Math.round(mean * 100) / 100, median: at(0.5), p90: at(0.9), zero: sorted.filter((r) => r.v === 0).reduce((s, r) => s + r.total, 0) }
  }
  return { n, top: rows.sort((a, b) => b.total - a.total).slice(0, 10) }
}

export function buildDigest(raw) {
  const { meta, stats, prevStats, metrics = {}, eventProps = {}, events: rawEvents = [] } = raw
  const warnings = [...(meta.errors ? Object.entries(meta.errors).map(([k, v]) => `fetch ${k} failed: ${v}`) : [])]

  // safety net for snapshots fetched without the hostname filter
  const localhostRows = rawEvents.filter((e) => /^(localhost|127\.0\.0\.1)(:|$)/.test(e.hostname ?? '')).length
  const normalized = normalizeEvents(rawEvents.filter((e) => !/^(localhost|127\.0\.0\.1)(:|$)/.test(e.hostname ?? '')))
  const { events, dropped } = cleanEvents(normalized)
  const custom = events.filter((e) => e.name)
  const pageviews = events.filter((e) => e.pageview)

  // per event: counts, unique sessions, first/last seen
  const byEvent = {}
  for (const e of custom) {
    const x = (byEvent[e.name] ??= { count: 0, sessions: new Set(), first: e.t, last: e.t })
    x.count++
    x.sessions.add(e.session)
    x.last = e.t
  }
  const eventTable = Object.entries(byEvent)
    .map(([name, x]) => ({
      name,
      feature: FEATURES[name] ?? null,
      count: x.count,
      sessions: x.sessions.size,
      first: dayKey(x.first),
      last: dayKey(x.last)
    }))
    .sort((a, b) => b.count - a.count)

  const neverFired = Object.keys(FEATURES).filter((n) => !byEvent[n])
  const unknownEvents = eventTable.filter((e) => !FEATURES[e.name] && !REMOVED_EVENTS.includes(e.name)).map((e) => e.name)

  // session funnel; the outbound-click events only exist since their tracking date, so rates for them
  // must only use sessions that started after it (otherwise the denominator includes untracked sessions)
  const sessionFlags = new Map()
  const flags = (s) => sessionFlags.get(s.session) ?? sessionFlags.set(s.session, { start: s.t, set: new Set() }).get(s.session)
  for (const e of events) {
    const f = flags(e)
    f.start = Math.min(f.start, e.t)
    if (e.pageview) {
      if (e.path === '/') f.set.add('home')
      if (e.path.startsWith('/media/')) f.set.add('detail')
      if (e.path.startsWith('/library/')) f.set.add('library')
    }
    if (e.name) {
      f.set.add('anyEvent')
      if (e.name === 'search-started') f.set.add('search')
      if (e.name === 'voebb-click') f.set.add('voebbClick')
      if (e.name === 'library-maps-click' || e.name === 'library-website-click') f.set.add('libraryOutbound')
      if (e.name === 'zip-save') f.set.add('zip')
    }
  }
  const funnelFor = (sinceDate) => {
    const sinceMs = sinceDate ? Date.parse(`${sinceDate}T00:00:00+02:00`) : -Infinity
    const list = [...sessionFlags.values()].filter((f) => f.start >= sinceMs).map((f) => f.set)
    const count = (...need) => list.filter((f) => need.every((n) => f.has(n))).length
    return {
      since: sinceDate ?? 'all',
      sessions: list.length,
      home: count('home'),
      search: count('search'),
      detail: count('detail'),
      voebbClick: count('voebbClick'),
      library: count('library'),
      libraryOutbound: count('libraryOutbound'),
      anyEvent: count('anyEvent'),
      rates: {
        searchOfHome: pct(count('search'), count('home')),
        detailOfSearch: pct(count('search', 'detail'), count('search')),
        voebbClickOfDetail: pct(count('voebbClick'), count('detail')),
        libraryOutboundOfLibrary: pct(count('libraryOutbound'), count('library'))
      }
    }
  }
  const funnel = {
    all: funnelFor(null),
    // voebb-click and detail-view tracked since 09.10., library outbound clicks since 17.10.
    sinceVoebbTracking: funnelFor(VOEBB_TRACKING_DATE),
    sinceLibraryOutboundTracking: funnelFor(LIBRARY_OUTBOUND_TRACKING_DATE)
  }

  // weekly trend (sessions seen in the raw events, not Umami's "visitors")
  const weeks = new Map()
  for (const e of events) {
    const w = weekKey(e.t)
    const x = weeks.get(w) ?? weeks.set(w, { week: w, sessions: new Set(), pageviews: 0, events: {} }).get(w)
    x.sessions.add(e.session)
    if (e.pageview) x.pageviews++
    if (e.name) x.events[e.name] = (x.events[e.name] ?? 0) + 1
  }
  const weekly = [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week)).map((x) => ({ ...x, sessions: x.sessions.size }))

  const languageFilter = byEvent['filter-language']
  const decisions = {
    languageFilter: {
      ...LANGUAGE_FILTER_DECISION,
      events: languageFilter?.count ?? 0,
      sessions: languageFilter?.sessions.size ?? 0,
      met: (languageFilter?.count ?? 0) >= LANGUAGE_FILTER_DECISION.needsEvents && (languageFilter?.sessions.size ?? 0) >= LANGUAGE_FILTER_DECISION.needsSessions
    }
  }

  const overview = {}
  for (const k of ['pageviews', 'visitors', 'visits', 'bounces', 'totaltime']) {
    const cur = num(stats?.[k])
    const prev = num(prevStats?.[k] ?? stats?.comparison?.[k] ?? (stats?.[k] && typeof stats[k] === 'object' ? { value: stats[k].prev } : undefined))
    overview[k] = { current: cur, previous: prev, deltaPct: delta(cur, prev) }
  }
  overview.bounceRatePct = pct(num(stats?.bounces), num(stats?.visits))

  const group = (path) => {
    if (path === '/') return 'home'
    if (path.startsWith('/media/')) return '/media/*'
    if (path.startsWith('/library/')) return '/library/*'
    return path
  }
  const pages = {}
  for (const p of metrics.path ?? metrics.url ?? []) pages[group(p.x)] = (pages[group(p.x)] ?? 0) + p.y
  const top = (rows, n = 10) => (rows ?? []).slice(0, n).map((r) => ({ name: r.x, count: r.y }))

  const properties = {}
  for (const [event, props] of Object.entries(eventProps)) {
    for (const [prop, values] of Object.entries(props)) (properties[event] ??= {})[prop] = summarizeProperty(values)
  }

  if (meta.range?.previousFrom && meta.range.previousFrom < LAUNCH_DATE) {
    warnings.push(`previous period starts ${meta.range.previousFrom}, before the launch on ${LAUNCH_DATE}: the deltas compare against a partly empty window, do not read them as a decline`)
  }
  if (localhostRows) warnings.push(`dropped ${localhostRows} localhost event rows from the raw events; stats and metrics in this snapshot were not filtered, so they include localhost`)
  if (!rawEvents.length) warnings.push('no raw events fetched: funnel, weekly trend and per-event first/last dates are empty')
  if (dropped.duplicateSearches) warnings.push(`removed ${dropped.duplicateSearches} duplicate search-started events from before ${TRACKING_FIX_DATE}`)
  warnings.push(`toggle-faq before ${TRACKING_FIX_DATE} counts closes as well (about 20% too many opens); the raw events carry no FAQ id to replay`)
  warnings.push(`quick-search chip clicks before ${TRACKING_FIX_DATE} were also logged as search-started and cannot be separated`)

  return {
    meta: { range: meta.range, fetchedAt: meta.fetchedAt, website: meta.website, filter: meta.filter ?? null },
    warnings,
    overview,
    pages,
    referrers: top(metrics.referrer),
    countries: top(metrics.country, 5),
    devices: top(metrics.device, 5),
    events: eventTable,
    neverFired,
    unknownEvents,
    properties,
    decisions,
    funnel,
    weekly
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}

export async function loadRaw(dir) {
  const [meta, stats, prevStats, metrics, eventProps, events] = await Promise.all([
    readJson(join(dir, 'meta.json'), {}),
    readJson(join(dir, 'stats.json'), null),
    readJson(join(dir, 'stats-prev.json'), null),
    readJson(join(dir, 'metrics.json'), {}),
    readJson(join(dir, 'event-properties.json'), {}),
    readJson(join(dir, 'events.json'), [])
  ])
  return { meta, stats, prevStats, metrics, eventProps, events }
}

export async function writeDigest(dir) {
  const digest = buildDigest(await loadRaw(dir))
  const json = JSON.stringify(digest, null, 2)
  await writeFile(join(dir, 'digest.json'), json)
  // stable path for the review skill
  const latest = join(dir, '..', 'latest')
  await mkdir(latest, { recursive: true })
  await writeFile(join(latest, 'digest.json'), json)
  return digest
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = resolve('data/umami')
  const arg = process.argv[2]
  const dir = arg
    ? resolve(arg)
    : join(root, (await readdir(root)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().at(-1))
  await writeDigest(dir)
  console.log(`digest written to ${join(dir, 'digest.json')}`)
}
