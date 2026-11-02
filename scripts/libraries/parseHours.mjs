// Reads opening hours out of the text of a library page and compares them with app/assets/libraries.json.
// Pure functions (no network), tested in test/unit/libraryHours.test.ts. Used by check.mjs.

export const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DAY_BY_NAME = {
  montag: 'monday', mo: 'monday', dienstag: 'tuesday', di: 'tuesday', mittwoch: 'wednesday', mi: 'wednesday',
  donnerstag: 'thursday', do: 'thursday', freitag: 'friday', fr: 'friday', samstag: 'saturday', sonnabend: 'saturday',
  sa: 'saturday', sonntag: 'sunday', so: 'sunday'
}

// The short forms need a word boundary, otherwise "Die", "Dortmund" or "Frau" would count as days
// Pankow writes "Sonnabend", some pages "Samstags" / "mittwochs"
const DAY = '(?:(?:Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonnabend|Sonntag)s?|(?:Mo|Di|Mi|Do|Fr|Sa|So)\\b\\.?)'
const SPEC = `${DAY}(?:\\s*(?:–|-|bis)\\s*${DAY}|(?:\\s*(?:,|\\+|und|u\\.)\\s*${DAY})+)?`
const TIME = '\\d{1,2}(?:[:.]\\d{2})?'
const RANGE = `(${TIME})\\s*(?:Uhr)?\\s*(?:–|-|bis)\\s*(${TIME})(?:\\s*Uhr)?`
// "12 – 19 Uhr (10 – 12 Uhr eingeschränkter Service)": a bracketed range with a service note that touches the opening range
// is part of the time the building is open (stored as one span, the service note is not modelled here)
const NOTE = `(?:\\s*\\(\\s*(${TIME})\\s*(?:Uhr)?\\s*(?:–|-|bis)\\s*(${TIME})\\s*(?:Uhr)?\\s*(?:eingeschränkt|servicefrei|ohne Service)[^)]*\\))?`
const ENTRY = new RegExp(`(${SPEC})\\s*[:,]?\\s*(?:${RANGE}|(geschlossen|Ruhetag))${NOTE}`, 'gi')

const dayKey = name => {
  const key = name.replace('.', '').trim().toLowerCase()
  return DAY_BY_NAME[key] ?? DAY_BY_NAME[key.replace(/s$/, '')]
}

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '', ndash: '–', mdash: '—', hellip: '…',
  auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', eacute: 'é', egrave: 'è', bdquo: '„', ldquo: '“', rdquo: '”'
}
const decodeEntities = text => text.replace(/&(?:#(\d+)|#x([\da-f]+)|(\w+));/gi, (all, dec, hex, name) =>
  dec ? String.fromCodePoint(Number(dec)) : hex ? String.fromCodePoint(parseInt(hex, 16)) : (ENTITIES[name] ?? all))

// No HTML parser on purpose: the check runs on a Pi with Node 18 and without an npm install, and only the text is needed.
// Block elements end in a line break so "Montag" and the following time do not run into the next row.
export function htmlToText(html) {
  return decodeEntities(html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/(?:p|div|li|tr|h[1-4]|dt|dd|td|th)\s*>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ''))
    .replace(/\u00ad/g, '').replace(/[ \t\u00a0]+/g, ' ').replace(/\s*\n\s*/g, '\n')
}

const normalizeTime = t => {
  const [h, m = '00'] = t.replace('.', ':').split(':')
  return `${h.padStart(2, '0')}:${m}`
}

// "Mo – Fr", "Di., Mi., Do.", "Montag und Donnerstag" → day keys
export function expandSpec(spec) {
  const tokens = spec.match(new RegExp(DAY, 'gi')) ?? []
  const days = tokens.map(dayKey)
  if (/(–|-|bis)/i.test(spec.replace(/\./g, '')) && tokens.length === 2) {
    const [from, to] = days.map(d => DAY_KEYS.indexOf(d))
    return from <= to ? DAY_KEYS.slice(from, to + 1) : []
  }
  return days
}

// Returns { hours, conflicts }: hours is { monday: '10:00-19:00' | null } for every day the text mentions.
// A day with two different ranges (e.g. a service-free range after the opening hours) goes to conflicts.
export function parseWeek(text) {
  const hours = {}
  const conflicts = []
  for (const m of text.matchAll(ENTRY)) {
    let [start, end] = m[2] ? [normalizeTime(m[2]), normalizeTime(m[3])] : []
    if (m[5]) {
      const [from, to] = [normalizeTime(m[5]), normalizeTime(m[6])]
      if (to === start) start = from
      else if (from === end) end = to
    }
    const value = m[2] ? `${start}-${end}` : null
    for (const day of expandSpec(m[1])) {
      if (day in hours && hours[day] !== value) conflicts.push(day)
      else hours[day] = value
    }
  }
  return { hours, conflicts: [...new Set(conflicts)] }
}

// The hours sit behind the heading "Öffnungszeiten"; the menu also has that word, so take the first block that has times
const STOP = /(Servicefrei|Servicezeit|Schließ|Bibliotheksleitung|Leitung:|Tel\.|Telefon|E-Mail|Verkehrsanbindung|Medienrückgabe|\d{5}\s+Berlin)/
// `merge`: pages with one hours block per part of the library (Adlershof: children's and adults' library)
export function extractWeek(text, { anchor, stop, merge } = {}) {
  let from = 0
  if (anchor) {
    const at = text.search(anchor)
    if (at < 0) return { hours: {}, conflicts: [], serviceFree: false, found: false }
    from = at
  }
  const starts = anchor ? [from] : [...text.matchAll(/Öffnungszeit/gi)].map(m => m.index)
  const merged = { hours: {}, conflicts: [], serviceFree: false, found: false }
  for (const start of starts) {
    let block = text.slice(start, start + 1200)
    const cut = block.slice(20).search(stop ?? STOP)
    const serviceFree = /servicefrei|eingeschränkt|ohne Service/i.test(block)
    if (cut >= 0) block = block.slice(0, cut + 20)
    const week = parseWeek(block)
    if (!Object.keys(week.hours).length) continue
    if (!merge) return { ...week, serviceFree, found: true }
    Object.assign(merged.hours, week.hours)
    merged.serviceFree ||= serviceFree
    merged.found = true
  }
  return merged
}

// Stored hours (null or a missing day = closed) against the page; only days the page mentions are compared,
// days it does not mention but we store are reported as 'not on page' (usually a closed day the page leaves out)
export function compareWeek(stored, site) {
  const diffs = []
  for (const day of DAY_KEYS) {
    const mine = stored?.[day] ?? null
    if (day in site) {
      if (site[day] !== mine) diffs.push({ day, stored: mine, site: site[day] })
    } else if (mine) {
      diffs.push({ day, stored: mine, site: 'not on page' })
    }
  }
  return diffs
}
