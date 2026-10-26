// Pulls a snapshot of the BibBlitz Umami Cloud data into data/umami/<end-date>/ and builds the digest.
//
//   npm run umami                         last 90 days
//   npm run umami -- --days 30
//   npm run umami -- --from 2026-10-09 --to 2026-10-26
//
// Auth, in this order:
//   UMAMI_SHARE_URL in .env  the public share link of the dashboard (Settings -> Share URL). Works on the free
//                            Umami Cloud plan; the script trades it for a read-only token like the dashboard does.
//   UMAMI_API_KEY in .env    paid plans only (api.umami.is).
// Each endpoint is fetched on its own:
// a failing one is recorded in meta.json (and shows up as a warning in the digest) instead of aborting the run.
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { dayKey, writeDigest } from './digest.mjs'

const SHARE_URL = process.env.UMAMI_SHARE_URL
const KEY = process.env.UMAMI_API_KEY
// same id as the tracking script in nuxt.config.ts (it is public anyway)
let WEBSITE = process.env.UMAMI_WEBSITE_ID ?? '67a667ea-94a2-4aa6-a4d6-edcee1bbb7ca'
let BASE = process.env.UMAMI_API_URL ?? (KEY ? 'https://api.umami.is/v1' : 'https://cloud.umami.is/analytics/eu/api')
let HEADERS = { accept: 'application/json' }
const TZ = 'Europe/Berlin'
const DAY = 86_400_000
const PAGE_SIZE = 100
const MAX_EVENT_PAGES = 300

async function authenticate() {
  if (KEY) {
    HEADERS['x-umami-api-key'] = KEY
    return
  }
  if (!SHARE_URL) {
    console.error('Set UMAMI_SHARE_URL (Umami Cloud -> website settings -> Share URL) or UMAMI_API_KEY (paid plans) in .env.')
    process.exit(1)
  }
  const shareId = new URL(SHARE_URL).pathname.split('/').filter(Boolean).at(-1)
  const res = await fetch(`${BASE}/share/${shareId}`)
  if (!res.ok) throw new Error(`share link rejected (${res.status}): check UMAMI_SHARE_URL, or UMAMI_API_URL if your Umami region is not eu`)
  const share = await res.json()
  WEBSITE = share.websiteId
  // the dashboard sends both headers; without the context header the token is refused
  HEADERS['x-umami-share-token'] = share.token
  HEADERS['x-umami-share-context'] = '1'
}
await authenticate()

const { values: args } = parseArgs({
  options: {
    days: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' }, out: { type: 'string', default: 'data/umami' },
    // Umami filter syntax; localhost and other dev hosts are excluded by default. --hostname eq.www.bibblitz.de or --all-hosts to change
    hostname: { type: 'string', default: 'neq.localhost' }, 'all-hosts': { type: 'boolean', default: false }
  }
})

// dates are Berlin calendar days; --to is inclusive
const berlinMidnight = (iso) => Date.parse(`${iso}T00:00:00${offsetAt(iso)}`)
function offsetAt(iso) {
  const part = new Intl.DateTimeFormat('en', { timeZone: TZ, timeZoneName: 'longOffset' }).formatToParts(new Date(`${iso}T12:00:00Z`)).find((p) => p.type === 'timeZoneName').value
  return part === 'GMT' ? 'Z' : part.replace('GMT', '')
}

const endAt = args.to ? berlinMidnight(args.to) + DAY : Date.now()
const startAt = args.from ? berlinMidnight(args.from) : endAt - Number(args.days ?? 90) * DAY
const prevStartAt = startAt - (endAt - startAt)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let lastCall = 0

async function api(path, params = {}, attempt = 0) {
  // Umami Cloud allows 50 calls per 10 s
  const wait = 250 - (Date.now() - lastCall)
  if (wait > 0) await sleep(wait)
  lastCall = Date.now()

  const url = new URL(`${BASE}/websites/${WEBSITE}${path}`)
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v))
  const res = await fetch(url, { headers: HEADERS })
  if (res.status === 429 && attempt < 4) {
    await sleep(2000 * (attempt + 1))
    return api(path, params, attempt + 1)
  }
  if (!res.ok) throw new Error(`${res.status} ${path}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

const errors = {}
async function safe(name, fn, fallback) {
  try {
    return await fn()
  } catch (e) {
    errors[name] = e.message
    console.warn(`! ${name}: ${e.message}`)
    return fallback
  }
}

const filter = args['all-hosts'] ? {} : { hostname: args.hostname }
const range = { startAt, endAt, ...filter }
console.log(`filter ${args['all-hosts'] ? 'none' : `hostname=${args.hostname}`}`)
console.log(`range ${dayKey(startAt)} .. ${dayKey(endAt - 1)} (previous period starts ${dayKey(prevStartAt)})`)

const stats = await safe('stats', () => api('/stats', range), null)
const prevStats = await safe('stats-prev', () => api('/stats', { startAt: prevStartAt, endAt: startAt, ...filter }), null)

const metrics = {}
for (const [key, type, limit] of [
  ['path', 'path', 500],
  ['referrer', 'referrer', 50],
  ['country', 'country', 20],
  ['device', 'device', 10],
  ['browser', 'browser', 10],
  ['os', 'os', 10],
  ['event', 'event', 200]
]) {
  metrics[key] = await safe(`metrics-${key}`, async () => {
    try {
      return await api('/metrics', { ...range, type, limit })
    } catch (e) {
      // older Umami versions call the page metric "url"
      if (type === 'path' && String(e.message).startsWith('400')) return api('/metrics', { ...range, type: 'url', limit })
      throw e
    }
  }, [])
}

const series = {
  pageviews: await safe('series-pageviews', () => api('/pageviews', { ...range, unit: 'day', timezone: TZ }), null),
  events: await safe('series-events', () => api('/events/series', { ...range, unit: 'day', timezone: TZ }), null)
}

// event properties (e.g. detail-view status, search-started results)
const eventProps = {}
const propList = await safe('event-data-events', () => api('/event-data/events', range), [])
for (const { eventName, propertyName } of propList) {
  const values = await safe(`event-data-values ${eventName}.${propertyName}`, () => api('/event-data/values', { ...range, eventName, propertyName }), [])
  ;(eventProps[eventName] ??= {})[propertyName] = values
}

// raw events (pageviews and custom events) for session funnels
const events = []
await safe('events', async () => {
  for (let page = 1; page <= MAX_EVENT_PAGES; page++) {
    const res = await api('/events', { ...range, page, pageSize: PAGE_SIZE })
    const rows = res.data ?? []
    events.push(...rows)
    if (rows.length < PAGE_SIZE || (res.count && events.length >= res.count)) return
  }
  throw new Error(`stopped after ${MAX_EVENT_PAGES} pages, event list is incomplete`)
})

const dir = resolve(args.out, dayKey(endAt - 1))
await mkdir(dir, { recursive: true })
const write = (name, data) => writeFile(join(dir, name), JSON.stringify(data, null, 2))
await Promise.all([
  write('meta.json', {
    website: WEBSITE,
    fetchedAt: new Date().toISOString(),
    range: { from: dayKey(startAt), to: dayKey(endAt - 1), previousFrom: dayKey(prevStartAt) },
    filter: args['all-hosts'] ? undefined : filter,
    eventRows: events.length,
    errors: Object.keys(errors).length ? errors : undefined
  }),
  write('stats.json', stats),
  write('stats-prev.json', prevStats),
  write('metrics.json', metrics),
  write('series.json', series),
  write('event-properties.json', eventProps),
  write('events.json', events)
])

const digest = await writeDigest(dir)
console.log(`${events.length} event rows, ${digest.events.length} distinct events, ${digest.warnings.length} warnings`)
console.log(`snapshot: ${dir}`)
console.log(`digest:   ${join(dir, '..', 'latest', 'digest.json')}`)
