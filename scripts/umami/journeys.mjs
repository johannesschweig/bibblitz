// Exports the not-yet-reviewed visitor journeys (visits) as readable journeys, for the umami-session-review skill.
//
//   npm run umami:journeys -- --out <dir outside data/umami>
//   npm run umami:journeys -- --out <dir> --from 2026-10-29T08:24:28Z --until 2026-10-30T09:00:00Z
//   npm run umami:journeys -- --out <dir> --skip-event-data      (fast, journeys without event properties)
//
// Defaults: --from is `reviewedUntil` in scripts/umami/review-state.json, --until is now minus 30 minutes
// (sessions that may still be running are left for the next review).
// Auth is the same share link as fetch.mjs (UMAMI_SHARE_URL in .env), nothing is hardcoded here.
//
// Writes into --out:
//   journeys.md       one block per visit (journey): device, referrer, flags, then every event with its offset and properties
//   journeys.json     the same as data (sessions with events, flags), for ad-hoc jq/node queries
//   event-data.json   cache of /event-data/<id> per custom event, a re-run only fetches the missing ones
//   summary.json      window, counts, flag counts (what the skill reports first)
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const SHARE_URL = process.env.UMAMI_SHARE_URL
const BASE = process.env.UMAMI_API_URL ?? 'https://cloud.umami.is/analytics/eu/api'
const HOLD_BACK = 30 * 60_000

const { values: args } = parseArgs({
  options: {
    out: { type: 'string' }, from: { type: 'string' }, until: { type: 'string' },
    'skip-event-data': { type: 'boolean', default: false }, hostname: { type: 'string', default: 'neq.localhost' }
  }
})
if (!args.out) {
  console.error('--out <dir> is required (use the session scratchpad, not data/umami: raw sessions are not for the repo).')
  process.exit(1)
}
if (!SHARE_URL) {
  console.error('Set UMAMI_SHARE_URL in .env (Umami Cloud -> website settings -> Share URL).')
  process.exit(1)
}

const state = JSON.parse(await readFile(new URL('./review-state.json', import.meta.url), 'utf8'))
const FROM = args.from ?? state.reviewedUntil
const UNTIL = args.until ?? new Date(Date.now() - HOLD_BACK).toISOString().replace(/\.\d+Z$/, 'Z')
const out = resolve(args.out)
await mkdir(out, { recursive: true })

const shareId = new URL(SHARE_URL).pathname.split('/').filter(Boolean).at(-1)
const share = await (await fetch(`${BASE}/share/${shareId}`)).json()
if (!share.token) throw new Error('share link rejected, check UMAMI_SHARE_URL')
const W = share.websiteId
const HEADERS = { accept: 'application/json', 'x-umami-share-token': share.token, 'x-umami-share-context': '1' }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let last = 0
async function api(path, params = {}, attempt = 0) {
  // Umami Cloud allows 50 calls per 10 s
  const wait = 250 - (Date.now() - last)
  if (wait > 0) await sleep(wait)
  last = Date.now()
  const url = new URL(`${BASE}/websites/${W}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const res = await fetch(url, { headers: HEADERS })
  if (res.status === 429 && attempt < 4) {
    await sleep(2000 * (attempt + 1))
    return api(path, params, attempt + 1)
  }
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json()
}

async function paged(path, params) {
  const rows = []
  for (let page = 1; page <= 300; page++) {
    const res = await api(path, { ...params, page, pageSize: 100 })
    rows.push(...(res.data ?? []))
    if ((res.data ?? []).length < 100) return rows
  }
  throw new Error(`${path}: stopped after 300 pages`)
}

// Umami timestamps have no milliseconds ("2026-10-28T10:15:11Z"), so string comparison is safe
// A journey is one visit (Umami closes a visit after 30 min of inactivity); an Umami "session" is a browser
// fingerprint and can span days. The hour before the window shows which visits were already cut by the cutoff.
const startAt = Date.parse(FROM) - 3600_000
const endAt = Date.parse(UNTIL)
console.log(`window ${FROM} .. ${UNTIL}`)

const range = { startAt, endAt, hostname: args.hostname }
const allEvents = await paged('/events', range)
const events = allEvents.filter((e) => e.createdAt > FROM && e.createdAt <= UNTIL)
const continuedVisits = new Set(allEvents.filter((e) => e.createdAt <= FROM).map((e) => e.visitId))
const sessionInfo = new Map((await paged('/sessions', range)).map((s) => [s.id, s]))
console.log(`${events.length} events, ${new Set(events.map((e) => e.visitId)).size} visits`)

// per-event properties: one call per custom event, cached
const cachePath = join(out, 'event-data.json')
const cache = await readFile(cachePath, 'utf8').then(JSON.parse).catch(() => ({}))
const custom = events.filter((e) => e.eventName && e.hasData)
if (!args['skip-event-data']) {
  const todo = custom.filter((e) => !(e.id in cache))
  console.log(`event data: ${todo.length} calls (${custom.length - todo.length} cached), about ${Math.ceil(todo.length * 0.3 / 60)} min`)
  let n = 0
  for (const e of todo) {
    try {
      const rows = await api(`/event-data/${e.id}`)
      // [{dataKey, stringValue, numberValue, dateValue, dataType}] -> {key: value}
      cache[e.id] = Object.fromEntries(rows.map((r) => [r.dataKey, r.dataType === 2 ? r.numberValue : r.dataType === 4 ? r.dateValue : r.stringValue]))
    } catch (err) {
      cache[e.id] = { _error: err.message }
    }
    if (++n % 100 === 0) {
      console.log(`  ${n}/${todo.length}`)
      await writeFile(cachePath, JSON.stringify(cache))
    }
  }
  await writeFile(cachePath, JSON.stringify(cache))
}

// ---- build journeys ----
const byVisit = new Map()
for (const e of events.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
  if (!byVisit.has(e.visitId)) byVisit.set(e.visitId, [])
  byVisit.get(e.visitId).push(e)
}

const fmtProps = (p) => (p && Object.keys(p).length ? ' ' + JSON.stringify(p) : '')
const q = (s) => (s ? '?' + s : '')

function describe(e, t0) {
  const dt = Math.round((Date.parse(e.createdAt) - t0) / 1000)
  const at = `+${String(dt).padStart(4)}s`
  if (e.eventType === 2) return { at, kind: 'event', name: e.eventName, props: cache[e.id] ?? {}, line: `${at} EVENT ${e.eventName}${fmtProps(cache[e.id])}  (page ${e.urlPath}${q(e.urlQuery)})`, e }
  return { at, kind: 'page', name: 'pageview', props: {}, line: `${at} PAGE  ${e.urlPath}${q(e.urlQuery)}${e.referrerDomain ? `  <- ${e.referrerDomain}${e.referrerPath ?? ''}` : ''}`, e }
}

function flags(items) {
  const f = []
  const ev = (name) => items.filter((i) => i.name === name)
  const searches = ev('search-started')
  const queries = searches.map((s) => String(s.props.query ?? s.props.q ?? ''))
  if (searches.some((s) => s.props.results === 0 && !s.props.error)) f.push('zero-hit-search')
  if (searches.some((s) => s.props.error)) f.push('search-error')
  if (queries.length && new Set(queries.map((s) => s.toLowerCase())).size < queries.length) f.push('repeated-query')
  if (searches.length >= 4) f.push(`many-searches(${searches.length})`)
  if (ev('detail-view').some((d) => ['failed', 'error', 'empty'].includes(d.props.status))) f.push('detail-failed-or-empty')
  if (ev('back-click').some((b) => b.props.had_history === 0)) f.push('back-without-history')
  if (ev('logo-click').some((b) => b.props.had_results)) f.push('logo-cleared-results')
  if (ev('filter-apply').some((a) => a.props.results === 0 || a.props.error)) f.push('filter-dead-end')
  if (ev('filter-open').length && !ev('filter-apply').length) f.push('filter-opened-not-applied')
  if (searches.length && !ev('voebb-click').length && !items.some((i) => i.kind === 'page' && i.e.urlPath.startsWith('/media/'))) f.push('searched-but-never-opened-a-result')
  // the same event 3+ times within 5 s: rage clicks or a retry loop
  for (const name of new Set(items.filter((i) => i.kind === 'event').map((i) => i.name))) {
    const ts = ev(name).map((i) => Date.parse(i.e.createdAt))
    if (ts.some((t, i) => ts[i + 2] !== undefined && ts[i + 2] - t <= 5000)) { f.push(`burst:${name}`); break }
  }
  return f
}

const sessions = []
for (const [id, evs] of byVisit) {
  const first = evs[0]
  const info = sessionInfo.get(first.sessionId)
  const t0 = Date.parse(first.createdAt)
  // Umami logs every pageview twice (history.replaceState hook): drop a repeat of the same page in the same second
  const items = evs.map((e) => describe(e, t0)).filter((it, i, all) => !(it.kind === 'page' && all[i - 1]?.line === it.line))
  sessions.push({
    id,
    sessionId: first.sessionId,
    shortId: id.slice(0, 8),
    start: first.createdAt,
    durationS: Math.round((Date.parse(evs.at(-1).createdAt) - t0) / 1000),
    device: info?.device ?? first.device,
    os: info?.os ?? first.os,
    browser: info?.browser ?? first.browser,
    country: info?.country ?? first.country,
    entry: `${first.urlPath}${q(first.urlQuery)}`,
    referrer: first.referrerDomain || '(direct)',
    // the visit began before the window: its first part was seen in an earlier review
    continued: continuedVisits.has(id),
    flags: flags(items),
    items: items.map(({ at, line, name, props, kind }) => ({ at, line, name, kind, props }))
  })
}
sessions.sort((a, b) => a.start.localeCompare(b.start))

const md = [`# Unreviewed visits ${FROM} .. ${UNTIL}`, `${sessions.length} visits, ${events.length} events. Flags are hints for where to look first, not findings.`, '']
for (const s of sessions) {
  md.push(`## ${s.shortId} · ${s.start} · ${s.device}/${s.os}/${s.browser} · ${s.country} · ${s.referrer} · ${s.durationS}s${s.continued ? ' · continued from an earlier review' : ''}`)
  if (s.flags.length) md.push(`flags: ${s.flags.join(', ')}`)
  md.push('```', ...s.items.map((i) => i.line), '```', '')
}
await writeFile(join(out, 'journeys.md'), md.join('\n'))
await writeFile(join(out, 'journeys.json'), JSON.stringify(sessions, null, 1))

const count = (xs) => xs.reduce((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {})
const summary = {
  from: FROM,
  until: UNTIL,
  // the newest event in the window: this becomes `reviewedUntil` when the review is finished
  latestEvent: events.map((e) => e.createdAt).sort().at(-1) ?? null,
  visits: sessions.length,
  events: events.length,
  customEvents: custom.length,
  eventDataMissing: args['skip-event-data'] ? custom.length : custom.filter((e) => !cache[e.id] || cache[e.id]._error).length,
  devices: count(sessions.map((s) => s.device)),
  referrers: count(sessions.map((s) => s.referrer)),
  flags: count(sessions.flatMap((s) => s.flags.map((f) => f.replace(/\(.*\)/, '')))),
  searches: events.filter((e) => e.eventName === 'search-started').length,
  zeroHitSearches: sessions.flatMap((s) => s.items).filter((i) => i.name === 'search-started' && i.props.results === 0).length
}
await writeFile(join(out, 'summary.json'), JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary, null, 2))
console.log(`journeys: ${join(out, 'journeys.md')}`)
