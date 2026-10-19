// utils/catalogText.ts
// Cleans VÖBB catalog text (ISBD notation). Deliberately conservative: it only removes
// text that is known to be clutter and never drops the part after " : " because that is
// sometimes a subtitle, sometimes part of the name ("Mario Kart Live - Home Circuit : Luigi Set").

// Format notes that duplicate the media-type icon, e.g. "Neuromancer : [Hörbuch] ; [CD]"
const FORMAT_NOTE = /^(?:Hörbuch|CD|CD-ROM|MP3-CD|MP3|MC|Maxi-CD|Tonkassette|Schallplatte|LP|(?:DVD|BD)(?:[- ]Video)?(?: mit .*)?|DVD-ROM|Blu-ray(?: Disc)?|Noten(?: \+ CD)?|Konsolenspiel|Computerspiel|Videospiel|Spiel|Medienkombination|Zeitschrift)$/i

// Platforms are kept (as `platform`): "Catan : Console Edition" exists for PS4 and PS5
const PLATFORM_NOTE = /^(?:Wii(?: U)?|Playstation ?[2-5]?|PS[2-5]|Xbox(?: One| 360| Series [XS])?|Nintendo (?:Switch(?: 2)?|DS|3DS|64|GameCube)|PC)$/i

const MARK = '\u0000'

export interface CleanTitle {
  title: string
  platform?: string
}

/**
 * Removes the statement of responsibility ("... / Autor") from a detail-page title
 * and returns it separately. Slashes inside brackets ("[Der Spiegel / Register]") are ignored.
 */
function splitResponsibility(raw: string): { main: string, responsibility?: string } {
  let depth = 0
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (c === '[') depth++
    else if (c === ']') depth = Math.max(0, depth - 1)
    else if (depth === 0 && raw.startsWith(' / ', i)) {
      return { main: raw.slice(0, i), responsibility: raw.slice(i + 3) }
    }
  }
  return { main: raw }
}

/**
 * Strips format notes from a title and pulls out the platform.
 * `withResponsibility` is for detail titles that end in " / Autor ; Übersetzer".
 */
export function cleanTitle(raw: string, opts: { withResponsibility?: boolean } = {}): CleanTitle & { responsibility?: string } {
  const { main, responsibility } = opts.withResponsibility ? splitResponsibility(raw) : { main: raw }
  let platform: string | undefined

  let text = main.replace(/\[([^\[\]]*)\]/g, (match, inner: string) => {
    const note = inner.trim()
    if (PLATFORM_NOTE.test(note)) {
      platform ??= note.replace(/^playstation/i, 'PlayStation')
      return MARK
    }
    return FORMAT_NOTE.test(note) ? MARK : match
  })

  // Collapse the separators around each removed note: "A : \0 ; \0" -> "A", "A : \0. : B" -> "A : B"
  text = text.replace(/[\s:;.\u0000]*\u0000[\s:;.\u0000]*/g, (run, offset: number) => {
    if (offset + run.length >= text.length) return ''
    if (run.includes(':')) return ' : '
    if (run.includes(';')) return ' ; '
    return ' '
  })
  // "Schule : - Englisch" / "149 ; = Melodious" remain when a note sat in front of a dash or "="
  text = text.replace(/ [:;] (?=[-=] )/g, ' ').replace(/\s+/g, ' ').trim()

  // What is left in brackets is a descriptive note ("[three books in one]"), keep the words, drop the brackets
  text = text.replace(/ ([:;]) \[([^\[\]]+)\](?=$| [:;] |\. )/g, ' $1 $2')

  // A bracketed prefix ("[Duden] Alle meine Sinne") is a cataloguer's addition: show it like a title
  // part instead of with literal brackets, MediaTitle then renders the rest lighter
  text = text.replace(/^\[([^\[\]]+)\]\s+(?=\S)/, '$1 : ')

  return { title: text || main.trim(), platform, responsibility }
}

/**
 * Display helper: the text before the first " : " and the text after it.
 * The UI renders both, only with different weight, so a wrong guess loses nothing.
 */
export function splitSubtitle(title: string): { main: string, rest?: string } {
  const i = title.indexOf(' : ')
  if (i === -1) return { main: title }
  return { main: title.slice(0, i), rest: title.slice(i + 3) }
}

const ROLE_WORDS = 'autor(?:in)?|author|verf\\.?|red\\.?(?: leitung)?|text(?:e)?|bilder|regie|kamera|produktion|drehb(?:\\.|uch)?|filmregisseur|buch|hrsg\\.?(?: und bearb\\.)?|herausgeber(?:in)?|protagonist|musik|komponist(?:in)?'
// "Autor: ", "Regie, Kamera: ", "Text von ", "hrsg. von der ", "von ", "by ", "performed by " ...
const ROLE_PREFIX = new RegExp(`^(?:(?:${ROLE_WORDS})(?:\\s*(?:,|/|und|&)\\s*(?:${ROLE_WORDS}))*\\s*(?::\\s*|\\s+von(?:\\s+der)?\\s+)|(?:herausgegeben (?:von|vom)|nach dem Buch von|performed by|nacherzählt von|neu erzählt von|neu erz\\. von|von|by)\\s+)`, 'i')
// ". Mit ...", ". Ill. by ...", ". Übers.: ...", ". Read by ..." start a secondary credit
const SECONDARY_CREDIT = /\.\s+(?=(?:(?:Mit|With|Texte?|Bilder|Illustriert|Illustrated|Illustrationen|Aus dem|Übersetzt|Translated|Edited|Gelesen|Read|Narrated|Sprecher|Regie|Hrsg|Hörspiel|Fingersätze|Drehb|Kamera|Musik|Darst|From)\b|Ill\.|Aus d\.|Übers))/
// Credits that never name the author: a record with only these has no author in the result row
const SECONDARY_ONLY = /^(?:(?:Illustrationen?|Übersetzung|Übersetzt|Translated|Transl)\b|(?:Ill|Übers)\.)/i
// A trailing dot belongs to these abbreviations ("Nintendo Co., Ltd.")
const ABBREVIATION_END = /\b(?:Ltd|Inc|Corp|Co|Verl|Dr|Prof|Jr|Sr)\.$/
const ROLE_SUFFIX = /\s+(?:Regie|Literarische Vorlage|Erzähler\/in|Schauspieler\/in)$/i

/**
 * Primary author from a statement of responsibility, e.g.
 * "Rebecca F. Kuang; Übersetzung aus dem Englischen von Jasmin Humburg. - 1. Auflage. - Eichborn"
 * becomes "Rebecca F. Kuang". For games and devices this is usually the publisher ("Nintendo").
 */
export function cleanAuthor(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const head = raw.split(/\.\s-\s/)[0]! // edition and publisher
  let text = head
  while (/\[[^\[\]]*\]/.test(text)) text = text.replace(/\[[^\[\]]*\]/g, '') // [Regie], [Hrsg. ...]
  text = text.replace(/[\[\]]/g, '').replace(/\s+/g, ' ').trim()
  // Everything in brackets: the cataloguer added the credit ("[Verf.: Frauke Burian. Ill.: ...]"), keep its content
  if (!text) text = head.match(/\[([^\[\]]+)\]/)?.[1]?.replace(/\s+/g, ' ').trim() ?? ''

  text = text.split(';').map(s => s.trim()).find(s => s && !SECONDARY_ONLY.test(s)) ?? ''
  text = text.replace(/^mit Bildern von .+?\.\s+(?=nacherz|neu erz)/i, '') // illustrator of a retelling
  text = text.replace(ROLE_PREFIX, '')
  text = text.split(SECONDARY_CREDIT)[0]!
  text = text.replace(/\s*\.{3}$/, '').replace(ROLE_SUFFIX, '').replace(/[\s;,]+$/, '')
  if (!ABBREVIATION_END.test(text)) text = text.replace(/[\s.;,]+$/, '')
  // The surname is missing in some records: "Johann Wolfgang von"
  text = text.replace(/\s+(?:von|van|zu)$/i, '').trim()
  if (new RegExp(`^(?:${ROLE_WORDS})$`, 'i').test(text)) return undefined
  return text || undefined
}

const SECONDARY_ROLES = /Übersetzer|Illustrator|Herausgeber|Sprecher|Erzähler|Regie|Mitwirkende|Kamera|Fotograf|Mitarb/i
const PRIMARY_ROLES = /Verfasser|Textdichter|Textverf|Autor|Komponist|Interpret|Künstler/i

/**
 * Fallback for records without a statement of responsibility: the detail page lists
 * "Lastname, First [Role] Lastname, First [Role]". Picks the primary creator, never a translator.
 */
export function cleanContributors(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const people = [...raw.matchAll(/([^\[\]]+?)\s*\[([^\]]*)\]/g)].map(m => ({ name: m[1]!.trim(), role: m[2]!.trim() }))
  const pick = people.find(p => PRIMARY_ROLES.test(p.role)) ?? people.find(p => !SECONDARY_ROLES.test(p.role))
  if (!pick) return undefined
  const [last, first] = pick.name.split(',').map(s => s.trim())
  return first ? `${first} ${last}` : last
}

/**
 * Year from a result row's year column ("2025", "2019-2021", "[2020]"), or with `last` from the
 * detail page's publication line ("München : Piper, Februar 2017")
 */
export function parseYear(raw: string | undefined, opts: { last?: boolean } = {}): string | undefined {
  const years = raw?.match(/\d{4}/g)
  return years?.[opts.last ? years.length - 1 : 0]
}
