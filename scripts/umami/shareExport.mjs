// Builds an anonymised, aggregated export of an Umami snapshot for third parties (e.g. the ZLB).
//
//   npm run umami:share -- --out res/zlb-umami-export-2026-11-20
//   npm run umami:share -- --snapshot data/umami/2026-11-20 --out <dir>
//
// Reads a snapshot written by `npm run umami` (default: the newest one in data/umami/). Search terms, the
// availability numbers and the saved ZIP areas live in the Umami event data, which the snapshot does not hold:
// those are fetched once per event (same share link as journeys.mjs) and cached in <snapshot>/event-data-share.json.
//
// What leaves the building (legal reasoning in docs/analytics.md "Sharing data with third parties"):
//   - only aggregates, written as CSV (semicolon, decimal comma, UTF-8 with BOM, so German Excel opens them)
//   - no session, visit or event IDs, no exact timestamps (day, week, weekday and hour only), no city except Berlin,
//     no URLs with query strings, no `?ref=` campaign names, no Wecker tokens (those pages are only counted)
//   - every group of fewer than K_SESSIONS devices is folded into "Other" or shown as "<5"
//   - free-text search terms only when at least K_TERMS different devices searched for them
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { REMOVED_EVENTS, TRACKING_FIX_DATE, dayKey, weekKey } from './digest.mjs'

const K_SESSIONS = 5 // smallest group (distinct devices) that is reported
const K_TERMS = 3 // smallest number of distinct devices behind a published search term
const TOP_TERMS = 150
const TZ = 'Europe/Berlin'
const BASE = process.env.UMAMI_API_URL ?? 'https://cloud.umami.is/analytics/eu/api'
const FIX_MS = Date.parse(`${TRACKING_FIX_DATE}T00:00:00+02:00`)

const { values: args } = parseArgs({
  options: { snapshot: { type: 'string' }, out: { type: 'string' }, 'skip-event-data': { type: 'boolean', default: false } }
})
if (!args.out) {
  console.error('--out <dir> is required (use res/..., it is gitignored).')
  process.exit(1)
}
const root = resolve('data/umami')
const snapshot = args.snapshot
  ? resolve(args.snapshot)
  : join(root, (await readdir(root)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().at(-1))
const out = resolve(args.out)
await mkdir(out, { recursive: true })

const meta = JSON.parse(await readFile(join(snapshot, 'meta.json'), 'utf8'))
const rawEvents = JSON.parse(await readFile(join(snapshot, 'events.json'), 'utf8'))
const libraries = new Map(JSON.parse(await readFile(new URL('../../app/assets/libraries.json', import.meta.url), 'utf8')).map((l) => [l.id, l.name]))

// ---------- 1. clean the raw events ----------
const pageType = (p) =>
  p === '/' ? 'Home page / search'
  : p.startsWith('/media/') ? 'Detail page of a medium'
  : p.startsWith('/library/') ? 'Library page'
  : p === '/libraries' ? 'Library overview'
  : p === '/imprint' ? 'Imprint'
  : p === '/data-privacy' ? 'Privacy policy'
  : p.startsWith('/watch/') ? 'Wecker (alert): confirmation page'
  : null // /dev, scanner probes (/dav, /diagnostic-probe), ...
const events = rawEvents
  .filter((e) => pageType(e.urlPath ?? '') && !REMOVED_EVENTS.includes(e.eventName))
  .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
const sessionsTotal = new Set(events.map((e) => e.sessionId))

// ---------- 2. event data (search terms, availability, ZIP areas) ----------
const cachePath = join(snapshot, 'event-data-share.json')
const cache = await readFile(cachePath, 'utf8').then(JSON.parse).catch(() => ({}))
const needsData = (e) =>
  e.hasData && ((e.eventName === 'search-started' && Date.parse(e.createdAt) >= FIX_MS) || e.eventName === 'detail-view' || e.eventName === 'zip-save')
if (!args['skip-event-data']) {
  const todo = events.filter((e) => needsData(e) && !(e.id in cache))
  if (todo.length) {
    const shareUrl = process.env.UMAMI_SHARE_URL
    if (!shareUrl) throw new Error('Set UMAMI_SHARE_URL in .env (or pass --skip-event-data).')
    const share = await (await fetch(`${BASE}/share/${new URL(shareUrl).pathname.split('/').filter(Boolean).at(-1)}`)).json()
    if (!share.token) throw new Error('share link rejected, check UMAMI_SHARE_URL')
    const headers = { accept: 'application/json', 'x-umami-share-token': share.token, 'x-umami-share-context': '1' }
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    console.log(`event data: ${todo.length} calls, about ${Math.ceil((todo.length * 0.3) / 60)} min`)
    let last = 0
    let n = 0
    for (const e of todo) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const wait = 250 - (Date.now() - last) // Umami Cloud allows 50 calls per 10 s
        if (wait > 0) await sleep(wait)
        last = Date.now()
        const res = await fetch(`${BASE}/websites/${share.websiteId}/event-data/${e.id}`, { headers })
        if (res.status === 429) {
          await sleep(2000 * (attempt + 1))
          continue
        }
        if (res.ok) {
          const rows = await res.json()
          cache[e.id] = Object.fromEntries(rows.map((r) => [r.dataKey, r.dataType === 2 ? r.numberValue : r.stringValue]))
        } else cache[e.id] = { _error: res.status }
        break
      }
      if (++n % 100 === 0) {
        console.log(`  ${n}/${todo.length}`)
        await writeFile(cachePath, JSON.stringify(cache))
      }
    }
    await writeFile(cachePath, JSON.stringify(cache))
  }
}
const dataOf = (e) => cache[e.id] ?? {}

// ---------- 3. helpers ----------
const num = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1).replace('.', ','))
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null)
const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : typeof v === 'number' ? num(v) : String(v)
  return /[;"\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}
async function writeCsv(name, header, rows) {
  const text = '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n'
  await writeFile(join(out, name), text)
  console.log(`${name}: ${rows.length} rows`)
}
const MASK = '<5'
const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', hour: '2-digit', hourCycle: 'h23' })
const berlinParts = (iso) => Object.fromEntries(parts.formatToParts(new Date(iso)).map((p) => [p.type, p.value]))
const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// ---------- 4. visits ----------
const visits = new Map()
for (const e of events) {
  let v = visits.get(e.visitId)
  if (!v) {
    v = { session: e.sessionId, start: e.createdAt, first: e, firstPv: null, evs: [] }
    visits.set(e.visitId, v)
  }
  if (e.eventType === 1 && !v.firstPv) v.firstPv = e
  v.evs.push(e)
}
const visitList = [...visits.values()]

const SEARCH_ENGINES = ['google.com', 'google.de', 'bing.com', 'duckduckgo.com', 'ecosia.org', 'kagi.com', 'com.google.android.googlequicksearchbox']
const TAGS = {
  reddit: 'Social networks / communities', nebenan: 'Social networks / communities', nebenana: 'Social networks / communities',
  loky: 'Blogs / newsletters', 'loky.news': 'Blogs / newsletters', weddingweiser: 'Blogs / newsletters', 'weddingweiser.': 'Blogs / newsletters',
  sticker: 'Offline (QR code on sticker / flyer)', flyer: 'Offline (QR code on sticker / flyer)'
}
function channel(v) {
  const e = v.firstPv ?? v.first
  const q = new URLSearchParams(e.urlQuery ?? '')
  const tag = (q.get('ref') ?? '').toLowerCase()
  if (TAGS[tag]) return TAGS[tag]
  if (/chatgpt|openai|claude|perplexity|gemini/.test(q.get('utm_source') ?? '')) return 'AI assistants'
  if (q.has('fbclid')) return 'Social networks / communities'
  const d = e.referrerDomain ?? ''
  if (!d) return 'Direct / unknown'
  if (SEARCH_ENGINES.includes(d)) return 'Search engines'
  if (d === 'forum.zlb.de') return 'ZLB forum (forum.zlb.de)'
  if (/reddit|facebook|telegram|instagram/.test(d)) return 'Social networks / communities'
  if (/mail|gm$|zoom|teams|trendmicro/.test(d)) return 'E-mail / messenger / meetings'
  if (/chatgpt|openai|perplexity/.test(d)) return 'AI assistants'
  return 'Other websites'
}
const deviceOf = (e) => ({ mobile: 'Smartphone', tablet: 'Tablet', laptop: 'Computer', desktop: 'Computer' })[e.device] ?? 'Other'
const osOf = (e) => (/^iOS/.test(e.os) ? 'iOS' : /Android/.test(e.os) ? 'Android' : /Windows/.test(e.os) ? 'Windows' : /Mac/.test(e.os) ? 'macOS' : /Linux/.test(e.os) ? 'Linux' : 'Other')
const regionOf = (e) => (e.country === 'DE' ? (e.city === 'Berlin' ? 'Berlin' : 'Rest of Germany') : 'Abroad')

// ---------- 5. 00 key figures ----------
const rows00 = []
const add = (bereich, kennzahl, wert, einheit = '', hinweis = '') => rows00.push([bereich, kennzahl, wert, einheit, hinweis])
const pageviews = events.filter((e) => e.eventType === 1)
const bounces = visitList.filter((v) => v.evs.length === 1).length
add('Period', 'from', meta.range.from, 'date')
add('Period', 'to', meta.range.to, 'date', 'The site has been online since 15.06.2026; the export covers the last 90 days up to the time it was pulled')
add('Usage', 'Visits', visitList.length, 'visits', 'A visit ends after 30 minutes without activity')
add('Usage', 'Devices (anonymous sessions)', sessionsTotal.size, 'devices', 'Approximation of people: the same device can count as a new one after some time')
add('Usage', 'Page views', pageviews.length, 'page views')
add('Usage', 'Page views per visit', Math.round((pageviews.length / visitList.length) * 10) / 10, 'page views')
add('Usage', 'Visits with a single action (bounce rate)', pct(bounces, visitList.length), '%')

// searches since the tracking fix (before that, search events were duplicated and carried no result count)
const searches = events.filter((e) => e.eventName === 'search-started' && Date.parse(e.createdAt) >= FIX_MS && e.hasData)
const searchOk = searches.filter((e) => !dataOf(e).error && typeof dataOf(e).results === 'number')
const searchFailed = searches.filter((e) => dataOf(e).error)
const searchVisits = new Set(searches.map((e) => e.visitId))
const windowVisits = visitList.filter((v) => Date.parse(v.start) >= FIX_MS)
const zero = searchOk.filter((e) => dataOf(e).results === 0)
add('Search (since 09.10.2026)', 'Searches', searches.length, 'searches', 'Text and ISBN searches; includes failed searches')
add('Search (since 09.10.2026)', 'Visits with at least one search', pct(searchVisits.size, windowVisits.length), '%', `of ${windowVisits.length} visits since 09.10.2026`)
add('Search (since 09.10.2026)', 'Searches per visit (visits with a search only)', Math.round((searches.length / searchVisits.size) * 10) / 10, 'searches')
add('Search (since 09.10.2026)', 'Searches without results', pct(zero.length, searchOk.length), '%', 'Searches for which VÖBB found nothing (technical errors excluded)')
add('Search (since 09.10.2026)', 'Searches with a technical error', pct(searchFailed.length, searches.length), '%', 'VÖBB was unreachable or did not answer')
add('Search (since 09.10.2026)', 'ISBN searches', pct(searches.filter((e) => dataOf(e).isbn === 1).length, searches.length), '%')
add('Search (since 09.10.2026)', 'Searches with a language or media-type filter', pct(searches.filter((e) => dataOf(e).language || dataOf(e).media_type).length, searches.length), '%', 'Filters exist since 27.10.2026')

// availability on the detail page
const details = events.filter((e) => e.eventName === 'detail-view' && e.hasData)
const dOk = details.filter((e) => dataOf(e).status === 'ok')
const dFailed = details.filter((e) => ['failed', 'error'].includes(dataOf(e).status))
const avail = (e) => Number(dataOf(e).available_now ?? 0)
const withZip = dOk.filter((e) => Number(dataOf(e).zip_default) === 0)
add('Availability (since 09.10.2026)', 'Detail page views with availability shown', dOk.length, 'page views', 'Shows the availability of the medium in all libraries at the time of the view')
add('Availability (since 09.10.2026)', 'Medium available now in at least one library', pct(dOk.filter((e) => avail(e) >= 1).length, dOk.length), '%')
add('Availability (since 09.10.2026)', 'Medium available now in no library', pct(dOk.filter((e) => avail(e) === 0).length, dOk.length), '%', 'all copies on loan, ordered or not lendable')
add('Availability (since 09.10.2026)', 'Detail page could not be loaded', pct(dFailed.length, details.length), '%', 'technical error when fetching from VÖBB')
const kms = (e) => (dataOf(e).nearest_available_km === undefined ? null : Number(dataOf(e).nearest_available_km))
add('Availability (since 09.10.2026)', 'Views by users with a saved postcode', withZip.length, 'page views', `${num(pct(withZip.length, dOk.length))} % of all views; the rest use the default postcode 10178 and are not counted in the distances`)
add('Availability (since 09.10.2026)', 'with postcode: nearest available copy up to 2 km', pct(withZip.filter((e) => avail(e) > 0 && kms(e) !== null && kms(e) <= 2).length, withZip.length), '%')
add('Availability (since 09.10.2026)', 'with postcode: nearest available copy 2 to 5 km', pct(withZip.filter((e) => avail(e) > 0 && kms(e) > 2 && kms(e) <= 5).length, withZip.length), '%')
add('Availability (since 09.10.2026)', 'with postcode: nearest available copy over 5 km', pct(withZip.filter((e) => avail(e) > 0 && kms(e) > 5).length, withZip.length), '%')
add('Availability (since 09.10.2026)', 'with postcode: not available anywhere', pct(withZip.filter((e) => avail(e) === 0).length, withZip.length), '%')
const branches = dOk.map((e) => Number(dataOf(e).branches ?? 0)).sort((a, b) => a - b)
add('Availability (since 09.10.2026)', 'Libraries holding a medium (median)', branches[Math.floor(branches.length / 2)], 'libraries')
await writeCsv('00_key_figures.csv', ['area', 'metric', 'value', 'unit', 'note'], rows00)

// ---------- 6. 01 weekly ----------
const weeks = new Map()
const wk = (ms) => {
  const key = weekKey(ms)
  if (!weeks.has(key)) weeks.set(key, { visits: new Set(), sessions: new Set(), pv: 0, searches: 0, days: new Set() })
  return weeks.get(key)
}
for (const e of events) {
  const w = wk(Date.parse(e.createdAt))
  w.visits.add(e.visitId)
  w.sessions.add(e.sessionId)
  w.days.add(dayKey(Date.parse(e.createdAt)))
  if (e.eventType === 1) w.pv++
}
for (const e of searches) wk(Date.parse(e.createdAt)).searches++
const rows01 = [...weeks].sort().map(([key, w]) => {
  const end = new Date(`${key}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + 6)
  const partial = key < meta.range.from || end.toISOString().slice(0, 10) > meta.range.to // a quiet day is not a partial week
  // search events before the 09.10. fix are not comparable, so the column starts with the first full week after it
  return [key, partial ? 'no' : 'yes', w.visits.size, w.sessions.size, w.pv, key >= '2026-10-12' ? w.searches : '']
})
await writeCsv('01_weekly_trend.csv', ['week_starting_monday', 'full_week', 'visits', 'devices', 'page_views', 'searches'], rows01)

// ---------- 7. 02 visits by attribute ----------
function breakdown(dimension, valueOf, { fold = true, order } = {}) {
  const cells = new Map()
  for (const v of visitList) {
    const val = valueOf(v)
    if (!cells.has(val)) cells.set(val, { visits: 0, sessions: new Set() })
    const c = cells.get(val)
    c.visits++
    c.sessions.add(v.session)
  }
  let entries = [...cells]
  if (fold) {
    const small = entries.filter(([, c]) => c.sessions.size < K_SESSIONS)
    entries = entries.filter(([, c]) => c.sessions.size >= K_SESSIONS)
    if (small.length) {
      const merged = { visits: 0, sessions: new Set() }
      for (const [, c] of small) {
        merged.visits += c.visits
        c.sessions.forEach((s) => merged.sessions.add(s))
      }
      entries.push(['Other', merged])
    }
  }
  entries.sort(order ? (a, b) => order.indexOf(a[0]) - order.indexOf(b[0]) : (a, b) => b[1].visits - a[1].visits)
  return entries.map(([val, c]) => {
    const hidden = c.sessions.size < K_SESSIONS
    return [dimension, val, hidden ? MASK : c.visits, hidden ? MASK : c.sessions.size, hidden ? '' : pct(c.visits, visitList.length)]
  })
}
const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00–${String(h).padStart(2, '0')}:59`)
const rows02 = [
  ...breakdown('Source', (v) => channel(v)),
  ...breakdown('Device type', (v) => deviceOf(v.first)),
  ...breakdown('Operating system', (v) => osOf(v.first)),
  ...breakdown('Region', (v) => regionOf(v.first), { order: ['Berlin', 'Rest of Germany', 'Abroad'] }),
  ...breakdown('Weekday', (v) => WEEKDAYS[WEEKDAYS_SHORT.indexOf(berlinParts(v.start).weekday)], { fold: false, order: WEEKDAYS }),
  ...breakdown('Time of day (start of the visit, Berlin time)', (v) => hours[Number(berlinParts(v.start).hour)], { fold: false, order: hours })
]
await writeCsv('02_visits_by_attribute.csv', ['attribute', 'value', 'visits', 'devices', 'share_of_all_visits_percent'], rows02)

// ---------- 8. 03 pages, 04 libraries ----------
function tally(items, keyOf, header, nameOf = (k) => k, { limit = Infinity, fold = true } = {}) {
  const cells = new Map()
  for (const e of items) {
    const k = keyOf(e)
    if (!cells.has(k)) cells.set(k, { n: 0, sessions: new Set() })
    const c = cells.get(k)
    c.n++
    c.sessions.add(e.sessionId)
  }
  let entries = [...cells].sort((a, b) => b[1].n - a[1].n)
  const kept = entries.filter(([, c]) => c.sessions.size >= K_SESSIONS)
  const small = entries.filter(([, c]) => c.sessions.size < K_SESSIONS)
  const rows = kept.slice(0, limit).map(([k, c]) => [nameOf(k), c.n, c.sessions.size])
  const rest = [...kept.slice(limit), ...small]
  if (fold && rest.length) {
    const merged = { n: 0, sessions: new Set() }
    for (const [, c] of rest) {
      merged.n += c.n
      c.sessions.forEach((s) => merged.sessions.add(s))
    }
    rows.push(merged.sessions.size >= K_SESSIONS ? ['Other', merged.n, merged.sessions.size] : ['Other', MASK, MASK])
  }
  return rows
}
const pv = events.filter((e) => e.eventType === 1)
const rows03 = tally(pv, (e) => pageType(e.urlPath), null, undefined, { fold: false })
// pages below the threshold keep their row but not their numbers
for (const t of new Set(pv.map((e) => pageType(e.urlPath)))) {
  if (!rows03.some((r) => r[0] === t)) rows03.push([t, MASK, MASK])
}
await writeCsv('03_pages.csv', ['page', 'page_views', 'devices'], rows03)
const rows04 = tally(pv.filter((e) => e.urlPath.startsWith('/library/')), (e) => e.urlPath.split('/')[2], null, (id) => libraries.get(id) ?? id, { limit: 40 })
await writeCsv('04_library_pages.csv', ['library', 'page_views', 'devices'], rows04)

// ---------- 9. 05 features, 06 visits with an action ----------
const DESCRIPTION = {
  'search-started': ['Search submitted (text or ISBN)', ''],
  'search-quick': ['Click on a quick-search suggestion', ''],
  'search-next-page': ['"Load more results"', ''],
  'filter-open': ['Filter page opened', '27.10.2026'],
  'filter-apply': ['Filter applied or reset', '27.10.2026'],
  'filter-language': ['Language filter applied', '27.10.2026'],
  'filter-media-type': ['Media-type filter applied', '27.10.2026'],
  'filter-reset': ['Filters reset in the filter page', '27.10.2026'],
  'zip-save': ['Postcode saved (to sort by distance)', ''],
  'showcase-click': ['Click on one of the example media on the home page', ''],
  'toggle-faq': ['FAQ question opened (before 09.10.2026 closing was counted too, about 20 % too many)', ''],
  'detail-view': ['Detail page of a medium loaded', '09.10.2026'],
  'branches-expand': ['"Show more distant libraries"', '20.10.2026'],
  'voebb-click': ['Click on "↗ VÖBB" (continue to the catalogue, e.g. to reserve)', '09.10.2026'],
  'isbn-click': ['Click on the ISBN', ''],
  'cover-click': ['Click on the cover', '04.11.2026'],
  'author-click': ['Click on the author (search by author)', ''],
  'back-click': ['"Zurück" (back) in the header', '29.10.2026'],
  'logo-click': ['Click on the logo', '29.10.2026'],
  'library-maps-click': ['Library page: "Open in Google Maps"', '17.10.2026'],
  'library-website-click': ['Library page: "Open library website"', '17.10.2026'],
  'watch-open': ['Wecker (e-mail alert when a copy is free) opened', '12.11.2026'],
  'watch-submit': ['Wecker submitted', '12.11.2026'],
  'watch-confirm': ['Wecker confirmed via the confirmation mail', '12.11.2026'],
  'watch-return': ['Return via the link in a Wecker alert mail', '13.11.2026'],
  'watch-stop': ['Wecker switched off', '12.11.2026']
}
const customs = events.filter((e) => e.eventName)
const rows05 = tally(customs, (e) => e.eventName, null, undefined, { fold: false })
for (const name of new Set(customs.map((e) => e.eventName))) {
  if (!rows05.some((r) => r[0] === name)) rows05.push([name, MASK, MASK])
}
const rows05Final = rows05
  .filter((r) => DESCRIPTION[r[0]])
  .map((r) => [r[0], DESCRIPTION[r[0]][0], DESCRIPTION[r[0]][1], r[1], r[2]])
await writeCsv('05_features.csv', ['event', 'meaning', 'measured_since', 'events', 'devices'], rows05Final)

const has = (v, test) => v.evs.some(test)
const actions = [
  ['Visits in total (since 09.10.2026)', () => true],
  ['… with at least one search', (e) => e.eventName === 'search-started'],
  ['… with a detail page of a medium', (e) => e.eventType === 1 && e.urlPath.startsWith('/media/')],
  ['… with a click on "↗ VÖBB"', (e) => e.eventName === 'voebb-click'],
  ['… with a library page view', (e) => e.eventType === 1 && e.urlPath.startsWith('/library/')],
  ['… with a saved postcode', (e) => e.eventName === 'zip-save'],
  ['… with the filter page opened', (e) => e.eventName === 'filter-open'],
  ['… with "Load more results"', (e) => e.eventName === 'search-next-page'],
  ['… with a click on an example medium on the home page', (e) => e.eventName === 'showcase-click'],
  ['… with an opened FAQ question', (e) => e.eventName === 'toggle-faq'],
  ['… with the Wecker opened', (e) => e.eventName === 'watch-open']
]
const rows06 = actions.map(([label, test]) => {
  const hit = windowVisits.filter((v) => has(v, test))
  const hidden = new Set(hit.map((v) => v.session)).size < K_SESSIONS
  return [label, hidden ? MASK : hit.length, hidden ? '' : pct(hit.length, windowVisits.length)]
})
await writeCsv('06_visits_with_action.csv', ['action', 'visits', 'share_of_all_visits_percent'], rows06)

// ---------- 10. 07 search terms ----------
const terms = new Map()
for (const e of searchOk) {
  const d = dataOf(e)
  if (d.isbn === 1 || typeof d.query !== 'string') continue
  const term = d.query.trim().toLowerCase().replace(/\s+/g, ' ')
  // free text can hold personal data: no mail addresses, no long digit strings (ISBN searches are counted separately)
  if (!term || term.length > 80 || /@|\d{7,}/.test(term)) continue
  if (!terms.has(term)) terms.set(term, { n: 0, sessions: new Set(), zero: 0 })
  const t = terms.get(term)
  t.n++
  t.sessions.add(e.sessionId)
  if (d.results === 0) t.zero++
}
const rows07 = [...terms]
  .filter(([, t]) => t.sessions.size >= K_TERMS)
  .sort((a, b) => b[1].sessions.size - a[1].sessions.size || b[1].n - a[1].n)
  .slice(0, TOP_TERMS)
  .map(([term, t]) => [term, t.n, t.sessions.size, pct(t.zero, t.n)])
await writeCsv('07_search_terms.csv', ['search_term', 'searches', 'devices', 'share_without_results_percent'], rows07)

// ---------- 11. 08 ZIP areas ----------
const zips = events.filter((e) => e.eventName === 'zip-save' && e.hasData && /^\d{4}X$/i.test(String(dataOf(e).query ?? '')))
const rows08 = tally(zips, (e) => String(dataOf(e).query).toUpperCase(), null, (k) => k, { limit: 60 }).map(([k, n, s]) => [k, n, s])
await writeCsv('08_postcode_areas.csv', ['postcode_area', 'times_saved', 'devices'], rows08)

// ---------- 12. 09 filters (property totals from the snapshot, counts only) ----------
const props = JSON.parse(await readFile(join(snapshot, 'event-properties.json'), 'utf8'))['filter-apply'] ?? {}
const rows09 = []
for (const [key, label] of [['language', 'Language'], ['media_type', 'Media type']]) {
  const sums = new Map()
  // the chip "Spiel" was renamed "Gesellschaftsspiel" on 28.10.2026
  for (const { value, total } of props[key] ?? []) sums.set(value === 'Spiel' ? 'Gesellschaftsspiel' : value, (sums.get(value === 'Spiel' ? 'Gesellschaftsspiel' : value) ?? 0) + total)
  for (const [value, total] of [...sums].sort((a, b) => b[1] - a[1])) rows09.push([label, value, total < K_SESSIONS ? MASK : total])
}
await writeCsv('09_filters.csv', ['filter', 'value', 'times_applied'], rows09)

console.log(`done: ${visitList.length} visits, ${sessionsTotal.size} devices, snapshot ${snapshot}`)
