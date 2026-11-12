// The two mails of the shelf watch (Wecker): the confirmation and the alert. Pure functions that return the
// subject, a plain text and an HTML version, shared by the server (sends them) and the dev preview page (shows
// them), so what is previewed is what is sent. All links are absolute, the caller builds them.
// Copy and decisions: docs/shelf-watch.md.

export interface MailContent {
  subject: string
  text: string
  html: string
}

export interface AlertLibrary {
  name: string
  shelfmark?: string
  // E.g. "Nur vor Ort nutzbar" for a copy that cannot be borrowed
  note?: string
}

/** "in deiner Bibliothek" / "in einer deiner 5 Bibliotheken" */
export function librariesPhrase(count: number): string {
  return count === 1 ? 'in deiner Bibliothek' : count > 1 ? `in einer deiner ${count} Bibliotheken` : 'in einer deiner Bibliotheken'
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
const INK = '#111827'
const MUTED = '#4b5563'
const LINE = '#e5e7eb'
const ACCENT = '#2563eb'

// One layout for both mails: a card with a heading, the body, and a footer with the switch-off link
function layout(parts: { heading: string, body: string, stopUrl: string }): string {
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(parts.heading)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f9fafb;font-family:${FONT};color:${INK};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid ${LINE};border-radius:12px;">
<tr><td style="padding:28px 24px 8px 24px;">
<p style="margin:0 0 4px 0;font-size:13px;font-weight:600;letter-spacing:.04em;color:${MUTED};">BibBlitz</p>
<h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:${INK};">${escapeHtml(parts.heading)}</h1>
${parts.body}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid ${LINE};background:#f9fafb;border-radius:0 0 12px 12px;font-size:14px;color:${MUTED};">
Nicht mehr nötig? <a href="${escapeHtml(parts.stopUrl)}" style="color:${ACCENT};text-decoration:underline;">Wecker ausschalten</a>
</td></tr>
</table>
</body></html>`
}

function button(label: string, url: string): string {
  return `<p style="margin:20px 0;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;border-radius:12px;">${escapeHtml(label)}</a></p>`
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 12px 0;font-size:16px;line-height:1.55;">${html}</p>`
}

function fineprint(text: string): string {
  return `<p style="margin:0 0 20px 0;font-size:14px;line-height:1.5;color:${MUTED};">${escapeHtml(text)}</p>`
}

/** Mail 1: the visitor confirms with the button, the visit itself switches the Wecker on. */
export function confirmMail(params: { title: string, count: number, confirmUrl: string, stopUrl: string }): MailContent {
  const { title, count, confirmUrl, stopUrl } = params
  const where = librariesPhrase(count)
  const subject = `Bitte bestätigen: Wecker für „${title}“`

  const text = [
    'Bitte bestätigen',
    '',
    `Du hast einen Wecker für „${title}“ gestellt. Wir mailen dir einmal, sobald ein Exemplar ${where} verfügbar ist.`,
    '',
    `Wecker bestätigen: ${confirmUrl}`,
    '',
    'Nicht von dir? Dann ignoriere diese Mail.',
    '',
    `Nicht mehr nötig? Wecker ausschalten: ${stopUrl}`
  ].join('\n')

  const html = layout({
    heading: 'Bitte bestätigen',
    stopUrl,
    body: [
      paragraph(`Du hast einen Wecker für <strong>${escapeHtml(title)}</strong> gestellt. Wir mailen dir einmal, sobald ein Exemplar ${escapeHtml(where)} verfügbar ist.`),
      button('Wecker bestätigen', confirmUrl),
      fineprint('Nicht von dir? Dann ignoriere diese Mail.')
    ].join('\n')
  })

  return { subject, text, html }
}

/** Mail 2: the Wecker klingelt. Sent once, the address is deleted right after. */
export function alertMail(params: { title: string, libraries: AlertLibrary[], titleUrl: string, stopUrl: string }): MailContent {
  const { title, libraries, titleUrl, stopUrl } = params
  const subject = `Wecker: „${title}“ ist verfügbar`

  const lines = libraries.map((library) => {
    const detail = [library.shelfmark ? `Signatur: ${library.shelfmark}` : '', library.note ?? ''].filter(Boolean).join(' · ')
    return { name: library.name, detail }
  })

  const text = [
    'Dein Wecker klingelt',
    '',
    `„${title}“ ist jetzt verfügbar:`,
    ...lines.map(line => `- ${line.name}${line.detail ? ` (${line.detail})` : ''}`),
    '',
    `Zum Titel: ${titleUrl}`,
    '',
    'Das kann schnell weg sein. Das war\'s: Wir haben deine Adresse gelöscht.',
    '',
    `Nicht mehr nötig? Wecker ausschalten: ${stopUrl}`
  ].join('\n')

  const list = lines.map(line =>
    `<tr><td style="padding:10px 14px;border-top:1px solid ${LINE};font-size:15px;"><span style="display:block;font-weight:600;">${escapeHtml(line.name)}</span>${line.detail ? `<span style="display:block;color:${MUTED};font-size:14px;">${escapeHtml(line.detail)}</span>` : ''}</td></tr>`
  ).join('\n')

  const html = layout({
    heading: 'Dein Wecker klingelt',
    stopUrl,
    body: [
      paragraph(`<strong>${escapeHtml(title)}</strong> ist jetzt verfügbar:`),
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px 0;border:1px solid ${LINE};border-radius:12px;border-collapse:separate;overflow:hidden;">\n${list}\n</table>`,
      button('Zum Titel', titleUrl),
      fineprint('Das kann schnell weg sein. Das war\'s: Wir haben deine Adresse gelöscht.')
    ].join('\n')
  })

  return { subject, text, html }
}
