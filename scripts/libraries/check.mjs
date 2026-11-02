// Checks app/assets/libraries.json against the libraries' own websites: is the link alive, do the opening hours match?
// It only reports, it never edits the data (a person decides, see docs/library-data.md).
//
//   npm run libraries:check                         (all libraries, about 3 minutes)
//   npm run libraries:check -- --only hansabibliothek,egon-erwin-kisch-bibliothek
//   npm run libraries:check -- --cache <dir>        (keeps the fetched pages, a re-run reads them instead of berlin.de)
//   npm run libraries:check -- --json <file>        (writes the full report as JSON, for the Pi job)
//   node check.mjs --data <libraries.json>          (other data file; the default is app/assets/libraries.json of this repo)
//
// berlin.de answers 429 on parallel requests, so the pages are fetched one by one with a pause.
// Exit code 1 when a link is dead or the hours differ, so a cron job can alert on it.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { parseArgs, promisify } from 'node:util'
import { compareWeek, extractWeek, htmlToText } from './parseHours.mjs'

const { values: args } = parseArgs({
  options: { only: { type: 'string' }, data: { type: 'string' }, cache: { type: 'string' }, json: { type: 'string' }, pause: { type: 'string', default: '900' } }
})
const libraries = JSON.parse(await readFile(args.data ?? new URL('../../app/assets/libraries.json', import.meta.url), 'utf8'))
const only = args.only?.split(',')
const pause = Number(args.pause)
const run = promisify(execFile)
const sleep = ms => new Promise(r => setTimeout(r, ms))

// Pages that list several libraries (or load the hours with JavaScript on the library's own page).
// `anchor` starts the block, `stop` ends it, both are matched against the page text.
const FHK = 'https://www.berlin.de/stadtbibliothek-friedrichshain-kreuzberg/aktuelles/aktuelle-oeffnungszeiten/'
const ZLB = 'https://www.zlb.de/standorte/'
const SOURCES = {
  'stadtteilbibliothek-adlershof-stefan-heym': { merge: true },
  'bezirkszentralbibliothek-pablo-neruda': { url: FHK, anchor: /Bezirkszentralbibliothek Pablo Neruda\s*\n?\s*Mo\b/, stop: /Mittelpunktbibliothek|Unser Angebot/ },
  'mittelpunktbibliothek-wilhelm-liebknecht-namik-kemal': { url: FHK, anchor: /Wilhelm Liebknecht[^\n]*\n\s*Mo\b/, stop: /Stadtteilbibliothek Friedrich|Unser Angebot/ },
  'stadtteilbibliothek-friedrich-von-raumer': { url: FHK, anchor: /Stadtteilbibliothek Friedrich von Raumer\s*\n?\s*Mo\b/, stop: /Familienbibliothek|Unser Angebot/ },
  'familienbibliothek-else-ury': { url: FHK, anchor: /Familienbibliothek Else Ury[^\n]*\n\s*Mo\b/, stop: /Unser Angebot/ },
  'amerika-gedenkbibliothek-agb': { url: ZLB, anchor: /Eva-Mamlok-Platz 1, 10961 Berlin/, stop: /Kinder & Jugend/ },
  'kinder-und-jugendbibliothek-mit-lernzentrum': { url: ZLB, anchor: /Kinder & Jugendbibliothek\s*\n?\s*Mo\b/, stop: /Berliner Stadtbibliothek/ },
  'berliner-stadtbibliothek-bstb': { url: ZLB, anchor: /Breite Straße 30-36, 10178 Berlin/, stop: /Berlin-Sammlungen/ },
  'berlin-sammlungen': { url: ZLB, anchor: /Berlin-Sammlungen\s*\n?\s*Mo\b/, stop: /Bitte beachten/ }
}

// berlin.de answers Node's fetch with 403 (client fingerprint) but serves curl, so the pages are fetched with curl
async function curl(url) {
  try {
    const { stdout } = await run('curl', ['-sL', '-m', '20', '-A', 'Mozilla/5.0', '-w', '\n%{http_code}|%{url_effective}', url], { maxBuffer: 30 * 1024 * 1024 })
    const cut = stdout.lastIndexOf('\n')
    const [status, finalUrl] = stdout.slice(cut + 1).split('|')
    return { status: Number(status), finalUrl, html: status === '200' ? stdout.slice(0, cut) : '' }
  } catch (err) {
    return { status: 0, finalUrl: url, html: '', error: String(err.code ?? err.message) }
  }
}

async function fetchPage(url) {
  const file = args.cache && join(args.cache, createHash('sha1').update(url).digest('hex') + '.json')
  if (file) {
    try { return JSON.parse(await readFile(file, 'utf8')) } catch { /* not cached yet */ }
  }
  let result
  for (let attempt = 0; attempt < 3; attempt++) {
    result = await curl(url)
    // berlin.de answers a run of requests with 429, 403 or dropped connections: wait and try again
    if (![0, 403, 429].includes(result.status)) break
    await sleep(8000)
  }
  await sleep(pause)
  if (file && result.status === 200) {
    await mkdir(args.cache, { recursive: true })
    await writeFile(file, JSON.stringify(result))
  }
  return result
}

const strip = u => u.replace(/^http:/, 'https:').replace(/\/$/, '')
const report = []
for (const lib of libraries) {
  if (only && !only.includes(lib.id)) continue
  const row = { id: lib.id, district: lib.district, website: lib.website, link: 'none', hours: lib.opening_hours ? 'unread' : 'no stored hours', diffs: [], notes: [] }
  if (lib.website) {
    const page = await fetchPage(lib.website)
    row.link = page.status === 200 ? 'ok' : `dead (${page.status || page.error})`
    if (page.status === 200 && strip(page.finalUrl) !== strip(lib.website)) { row.link = 'moved'; row.finalUrl = page.finalUrl }
    if (page.status === 200) {
      const source = SOURCES[lib.id]
      const text = htmlToText(source?.url ? (await fetchPage(source.url)).html : page.html)
      const week = extractWeek(text, source)
      if (week.found && !lib.opening_hours) {
        // Nothing stored but the page has hours: show them so they can be added
        row.hours = 'MISSING'
        row.page = week.hours
      } else if (week.found) {
        row.diffs = compareWeek(lib.opening_hours, week.hours)
        row.hours = row.diffs.length ? 'DIFFERS' : 'ok'
        if (week.conflicts.length) row.notes.push(`two ranges on ${week.conflicts.join(', ')}`)
        if (week.serviceFree && !lib.service_hours) row.notes.push('page mentions service-free or restricted times, no service_hours stored')
      } else if (lib.opening_hours) {
        row.hours = 'unreadable'
      }
    }
  }
  report.push(row)
  const flag = row.hours === 'DIFFERS' || row.hours === 'MISSING' || row.link.startsWith('dead') ? '!!' : row.hours === 'unreadable' || row.link === 'moved' ? ' ~' : '  '
  console.log(`${flag} ${lib.id.padEnd(58)} link: ${row.link.padEnd(12)} hours: ${row.hours}${row.page ? `\n       page: ${JSON.stringify(row.page)}` : ''}${row.diffs.map(d => `\n       ${d.day}: stored ${d.stored ?? '-'} | page ${d.site ?? 'closed'}`).join('')}${row.notes.map(n => `\n       note: ${n}`).join('')}`)
}

const count = pred => report.filter(pred).length
console.log(`\n${report.length} libraries: ${count(r => r.hours === 'ok')} hours ok, ${count(r => r.hours === 'DIFFERS')} differ, ${count(r => r.hours === 'unreadable')} unreadable, ${count(r => r.hours === 'MISSING')} with hours on the page but none stored, ${count(r => r.hours === 'no stored hours')} without stored hours; links: ${count(r => r.link === 'ok')} ok, ${count(r => r.link === 'moved')} moved (redirect), ${count(r => r.link.startsWith('dead'))} dead`)
if (args.json) await writeFile(args.json, JSON.stringify({ checkedAt: new Date().toISOString(), report }, null, 2))
process.exitCode = count(r => r.hours === 'DIFFERS' || r.hours === 'MISSING' || r.link.startsWith('dead')) ? 1 : 0
