// Judges the model's reading of the library pages (service_extract.py) and optionally writes the service hours.
//
//   node service.mjs --texts texts.json --extractions extractions.json            (report only)
//   node service.mjs --texts texts.json --extractions extractions.json --apply    (writes service_hours of the 'new' ones)
//   node service.mjs --data <libraries.json>                                       (other data file)
//
// The guards are in serviceHours.mjs. --apply only fills libraries that have no service_hours yet and passed every
// guard; a changed or suspicious result is only reported (a person decides). Exit code 1 when something is
// 'suspicious' or 'changed', 3 when only model calls failed, so the Pi job can send the right message.
import { readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { judgeLibrary } from './serviceHours.mjs'

const { values: args } = parseArgs({
  options: { texts: { type: 'string' }, extractions: { type: 'string' }, data: { type: 'string' }, apply: { type: 'boolean' } }
})
if (!args.texts || !args.extractions) {
  console.error('usage: node service.mjs --texts texts.json --extractions extractions.json [--data libraries.json] [--apply]')
  process.exit(2)
}
const dataFile = args.data ?? new URL('../../app/assets/libraries.json', import.meta.url)
const libraries = JSON.parse(await readFile(dataFile, 'utf8'))
const texts = JSON.parse(await readFile(args.texts, 'utf8'))
const extractions = JSON.parse(await readFile(args.extractions, 'utf8'))

const results = []
for (const [id, window] of Object.entries(texts)) {
  const lib = libraries.find(l => l.id === id)
  if (!lib) continue
  const extraction = extractions[id]
  const judged = judgeLibrary({ runs: extraction?.runs ?? [], window, opening: lib.opening_hours, stored: lib.service_hours, error: extraction?.error })
  results.push({ id, name: lib.name, ...judged })
}

const order = { suspicious: 0, changed: 1, error: 2, new: 3, same: 4, unchecked: 5, none: 6 }
results.sort((a, b) => order[a.status] - order[b.status])
const show = r => {
  const flag = ['suspicious', 'changed', 'error'].includes(r.status) ? '!!' : '  '
  const lines = [`${flag} ${r.id.padEnd(58)} ${r.status}`]
  for (const reason of r.reasons ?? []) lines.push(`       ${reason}`)
  if (r.status === 'new' || r.status === 'changed') {
    lines.push(`       service_hours: ${JSON.stringify(r.serviceHours)}`)
    if (r.stored) lines.push(`       stored:        ${JSON.stringify(r.stored)}`)
  }
  return lines.join('\n')
}
for (const r of results) console.log(show(r))

let applied = 0
if (args.apply) {
  for (const r of results.filter(r => r.status === 'new')) {
    const lib = libraries.find(l => l.id === r.id)
    lib.service_hours = r.serviceHours
    applied++
  }
  if (applied) await writeFile(dataFile, JSON.stringify(libraries, null, 2) + '\n')
}

const count = status => results.filter(r => r.status === status).length
console.log(`\n${results.length} libraries with service-free times: ${count('new')} new${args.apply ? ` (${applied} written)` : ''}, ${count('same')} same, ${count('changed')} changed, ${count('suspicious')} suspicious, ${count('error')} failed calls, ${count('unchecked')} unchecked, ${count('none')} none`)
// 1: the data needs a person (suspicious, changed); 3: only Gemini calls failed, run again later
process.exitCode = count('suspicious') || count('changed') ? 1 : count('error') ? 3 : 0
