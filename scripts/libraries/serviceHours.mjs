// Service hours (the times staff are at the desk) from the text of a library page, read by Gemini
// (service_extract.py) and checked here. Pure functions (no network, no model), tested in
// test/unit/serviceHours.test.mjs. Used by check.mjs (text window) and service.mjs (validate, apply).
//
// Nothing the model says is trusted blindly. A library is accepted only when every guard holds:
//   - each service-free claim has a quoted sentence that appears word for word in the page text (in at least one run),
//   - the opening hours the model read equal the stored `opening_hours`,
//   - service-free times lie inside the opening time,
//   - the staffed time of a day is one range (or none),
//   - a second run on another model gives the same staffed times.
// Anything else is "suspicious" and goes to a person.

import { parseWeek } from './parseHours.mjs'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const TIME_RANGE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/
const SERVICE_WORDS = /servicefrei|ohne Service|ohne Personal|eingeschränkt|servicezeit/i

// ---- the text window sent to the model ----

const WINDOW = 1800
// The service note is part of the block, so unlike the hours check this does not stop at "Servicefrei"
const END = /(Bibliotheksleitung|Leitung:|Tel\.|Telefon|E-Mail|Verkehrsanbindung|\d{5}\s+Berlin|Weitere Informationen zu diesem Auftritt)/

/** The part of the page text that holds the opening hours and the notes about them. */
export function hoursWindow(text, { anchor, stop } = {}) {
  const starts = anchor
    ? [text.search(anchor)].filter(at => at >= 0)
    : [...text.matchAll(/Öffnungszeit/gi)].map(m => m.index)
  for (const start of starts) {
    let block = text.slice(start, start + WINDOW)
    const cut = block.slice(20).search(stop ?? END)
    if (cut >= 0) block = block.slice(0, cut + 20)
    // The menu also has the word "Öffnungszeiten": take the first block in which the hours check finds weekdays with times
    if (Object.keys(parseWeek(block).hours).length) return block.trim()
  }
  return ''
}

/** True when the window talks about service-free or restricted times at all. */
export const mentionsService = text => SERVICE_WORDS.test(text)

// ---- time arithmetic ----

const minutes = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const clock = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const parseRange = r => r.split('-').map(minutes)
const norm = s => s.toLowerCase().replace(/[\s ]+/g, ' ').replace(/[–—]/g, '-').trim()

/**
 * Open range minus service-free ranges. Returns { staffed: 'HH:MM-HH:MM' | null } or { error }.
 * More than one staffed range is an error: the data model has one range per day.
 */
export function staffedTime(open, free) {
  if (!open) return { staffed: null }
  const [o0, o1] = parseRange(open)
  const cuts = free.map(parseRange).sort((a, b) => a[0] - b[0])
  let at = o0
  const staffed = []
  for (const [f0, f1] of cuts) {
    if (f0 < o0 || f1 > o1 || f0 >= f1) return { error: `service-free ${clock(f0)}-${clock(f1)} outside the opening time ${open}` }
    if (f0 < at) return { error: 'service-free ranges overlap' }
    if (f0 > at) staffed.push([at, f0])
    at = f1
  }
  if (at < o1) staffed.push([at, o1])
  if (staffed.length > 1) return { error: `staffed time is split in ${staffed.length} ranges` }
  return { staffed: staffed.length ? `${clock(staffed[0][0])}-${clock(staffed[0][1])}` : null }
}

// ---- one extraction ----

/**
 * Derives the staffed times of one model run and applies the per-run guards.
 * `days` is the model's answer: [{ day, open, service_free: [], restricted: [], quote }].
 * Returns { serviceHours: { monday: '11:00-19:00' | null, ... } (open days only), reasons: [],
 * unquoted: days with service-free times whose quote is missing or not in the page text }.
 */
export function deriveRun(days, { window, opening }) {
  const reasons = []
  const unquoted = []
  const haystack = norm(window)
  const byDay = Object.fromEntries(days.map(d => [d.day, d]))
  const serviceHours = {}
  for (const day of DAYS) {
    const stored = opening?.[day] ?? null
    const entry = byDay[day]
    const open = entry?.open ?? null
    if (open !== null && !TIME_RANGE.test(open)) { reasons.push(`${day}: bad time "${open}"`); continue }
    if (open !== stored) reasons.push(`${day}: the model read ${open ?? 'closed'}, stored is ${stored ?? 'closed'}`)
    if (!stored) continue
    const free = entry?.service_free ?? []
    const limited = entry?.restricted ?? []
    if ([...free, ...limited].some(r => !TIME_RANGE.test(r))) { reasons.push(`${day}: bad range in ${JSON.stringify([...free, ...limited])}`); continue }
    // Checked across the runs in judgeLibrary: one valid quote per day is enough, models sometimes leave one out
    if ((free.length || limited.length) && !(entry.quote && haystack.includes(norm(entry.quote)))) unquoted.push(day)
    // "Eingeschränkter Service" means no staff at the desk, only the machines (the library pages say so,
    // e.g. "Im eingeschränkten Service ist kein Fachpersonal vor Ort"), so it counts as service-free
    const result = staffedTime(open ?? stored, [...free, ...limited])
    if (result.error) { reasons.push(`${day}: ${result.error}`); continue }
    serviceHours[day] = result.staffed
  }
  return { serviceHours, reasons, unquoted }
}

// ---- a library, all runs ----

/**
 * Decides what to do with a library. `runs` are the model answers (arrays of days), at least two.
 * status:
 *   'error'      the model call itself failed (Gemini unavailable, quota): retry later, says nothing about the data
 *   'unchecked'  stored service hours, but the page text says nothing about service times
 *   'none'       no service-free times anywhere (nothing to store; suspicious when the text mentions them)
 *   'same'       equals the stored service_hours
 *   'new'        no service_hours stored yet, all guards hold: safe to write
 *   'changed'    differs from the stored service_hours, all guards hold: a person updates the data
 *   'suspicious' a guard failed, see reasons
 */
export function judgeLibrary({ runs, window, opening, stored, error }) {
  if (error) return { status: 'error', reasons: [`model call failed: ${error}`] }
  if (!window) return { status: 'suspicious', reasons: ['no hours text found on the page'] }
  // Stored service hours but nothing about service in the text (the ZLB lists them in a separate paragraph): not checkable
  if (stored && !mentionsService(window)) return { status: 'unchecked', reasons: ['the page text has no service times to compare'] }
  if (runs.length < 2) return { status: 'suspicious', reasons: ['fewer than two model runs'] }
  const derived = runs.map(days => deriveRun(days, { window, opening }))
  const reasons = [...new Set(derived.flatMap(d => d.reasons))]
  // A day counts as quoted when at least one run quoted it correctly
  for (const day of DAYS) {
    if (derived.every(d => d.unquoted.includes(day))) reasons.push(`${day}: the quoted sentence is not in the page text`)
  }
  if (reasons.length) return { status: 'suspicious', reasons }

  const [first, ...others] = derived
  if (others.some(o => JSON.stringify(o.serviceHours) !== JSON.stringify(first.serviceHours))) {
    return { status: 'suspicious', reasons: ['the model runs disagree', ...derived.map(d => JSON.stringify(d.serviceHours))] }
  }

  // A day whose staffed time is not its whole open range has a service-free time
  const hasServiceFree = Object.entries(first.serviceHours).some(([day, staffed]) => staffed !== (opening?.[day] ?? null))
  if (!hasServiceFree) {
    if (stored) return { status: 'suspicious', reasons: ['service hours are stored, the model found no service-free time'] }
    return mentionsService(window)
      ? { status: 'suspicious', reasons: ['the text mentions service-free times, the model found none'] }
      : { status: 'none', reasons: [] }
  }
  if (!stored) return { status: 'new', serviceHours: first.serviceHours, reasons: [] }
  const same = Object.keys({ ...stored, ...first.serviceHours }).every(day => (stored[day] ?? null) === (first.serviceHours[day] ?? null))
  return same
    ? { status: 'same', serviceHours: first.serviceHours, reasons: [] }
    : { status: 'changed', serviceHours: first.serviceHours, stored, reasons: [] }
}
