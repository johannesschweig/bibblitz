import { describe, it, expect } from 'vitest'
import { isMaintenancePage, parseMaintenanceUntil } from '../../utils/maintenance'

// Excerpt of https://www.voebb.de/wartung/wartung_www.html (17.10.2026)
const maintenanceHtml = `<html lang="de"><head>
  <title>Wartung - Verbund der &Ouml;ffentlichen Bibliotheken Berlins</title>
  <script src="/aDISWeb_kopac85/js/scripts-head.js"></script></head><body>
  <p>Das <strong>Internetangebot des V&Ouml;BB</strong> ist von Freitag, den 16.10.2026 (ab 17:30 Uhr) bis Montag, den 19.10.2026 (08:00 Uhr)
     f&uuml;r Wartungsarbeiten <strong>abgeschaltet</strong>.</p></body></html>`

describe('isMaintenancePage', () => {
  it('recognises the maintenance page by its title, although it mentions aDISWeb', () => {
    expect(isMaintenancePage(maintenanceHtml)).toBe(true)
  })

  it('recognises the redirect target by its URL', () => {
    expect(isMaintenancePage('', 'https://www.voebb.de/wartung/wartung_www.html')).toBe(true)
  })

  it('does not flag catalog pages', () => {
    expect(isMaintenancePage('<title>Katalog - VÖBB</title><form action="/aDISWeb/app"></form>', 'https://www.voebb.de/aDISWeb/app/prod00')).toBe(false)
    expect(isMaintenancePage(undefined)).toBe(false)
  })
})

describe('parseMaintenanceUntil', () => {
  it('returns the end of the window', () => {
    expect(parseMaintenanceUntil(maintenanceHtml)).toBe('19.10.2026, 08:00 Uhr')
  })

  it('returns undefined when the wording changes', () => {
    expect(parseMaintenanceUntil('<p>Wir sind bald wieder da.</p>')).toBeUndefined()
  })
})
