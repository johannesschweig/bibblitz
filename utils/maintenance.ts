// VÖBB redirects every aDISWeb URL to a static page (www.voebb.de/wartung/wartung_www.html) while
// it is switched off for maintenance. That page still contains "aDISWeb" (script paths), so the
// scrapers must recognise it explicitly, or they parse it as a record titled "Wartung".

export function isMaintenancePage(html: unknown, url?: string): boolean {
  if (url && /\/wartung\//i.test(url)) return true
  return typeof html === 'string' && /<title>\s*Wartung\b/i.test(html)
}

// Reads the end of the maintenance window from the page text, e.g.
// "... bis Montag, den 19.10.2026 (08:00 Uhr) für Wartungsarbeiten abgeschaltet" -> "19.10.2026, 08:00 Uhr".
// Returns undefined when the wording changes; callers must work without it.
export function parseMaintenanceUntil(html: unknown): string | undefined {
  if (typeof html !== 'string') return undefined
  const match = html.match(/bis\s+[^,<]+,\s+den\s+(\d{1,2}\.\d{1,2}\.\d{4})\s*\(\s*(?:ab\s+)?(\d{1,2}:\d{2})\s*Uhr\s*\)/i)
  return match ? `${match[1]}, ${match[2]} Uhr` : undefined
}
