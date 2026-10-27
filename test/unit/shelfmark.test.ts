import { describe, it, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { parseShelfmark, parseAccess, parseAvailabilityTable } from '../../utils/shelfmark'

// Cells of real VÖBB records (SAK34845003, scraped 19.10.2026)

describe('parseShelfmark', () => {
  it('takes the last segment of the Standort cell', () => {
    expect(parseShelfmark('Freihand Erwachsene / Historisches - Roman Garm')).toBe('Roman Garm')
    expect(parseShelfmark('Erwachsenenbereich - Roman Garmus')).toBe('Roman Garmus')
    expect(parseShelfmark('Raum 2 - Roman Garm')).toBe('Roman Garm')
  })

  it('keeps extra location notes out of the signature', () => {
    expect(parseShelfmark('Magazin 1 - Bereitstellung 1-3 Tage - Roman Garm')).toBe('Roman Garm')
  })

  it('returns undefined without a separator or for empty input', () => {
    expect(parseShelfmark('Freihand')).toBeUndefined()
    expect(parseShelfmark('')).toBeUndefined()
    expect(parseShelfmark(undefined)).toBeUndefined()
  })
})

describe('parseAccess', () => {
  it('detects reading-room and order-only cells', () => {
    expect(parseAccess('Nur Lesesaal - Magazin, nur Lesesaal')).toBe('reading-room')
    expect(parseAccess('2 Wochen - Magazin, bestellbar')).toBe('order-only')
  })

  it('leaves ordinary lending cells alone', () => {
    expect(parseAccess('4 Wochen - Bestellwunsch möglich')).toBeUndefined()
    expect(parseAccess('4 Wochen - Vormerkung möglich - 1x')).toBeUndefined()
    expect(parseAccess('4 Wochen - Keine Bestellung möglich')).toBeUndefined()
    expect(parseAccess('2 Wochen - Bestellwunsch möglich')).toBeUndefined()
    expect(parseAccess(undefined)).toBeUndefined()
  })

  it('lets the reading room win over order-only', () => {
    expect(parseAccess('Nur Lesesaal - Magazin, bestellbar, nur Lesesaal')).toBe('reading-room')
  })
})

describe('parseAvailabilityTable', () => {
  const td = (t: string) => `<td class=" rTable_td_text">${t}</td>`
  const html = `<table id="resptable-1"><thead><tr>
    <th>Bibliothek</th><th>Standort</th><th>Bestellmöglichkeit</th><th>Verfügbarkeit</th></tr></thead><tbody>
    <tr>${td('<a href="#">Charlottenburg-Wilmersdorf: Dietrich-Bonhoeffer-Bibliothek</a>')}${td('Freihand Erwachsene / Historisches - Roman Garm')}${td('4 Wochen - Vormerkung möglich -        1x')}${td('<span class="notavailable">Nicht im Regal</span>')}</tr>
    <tr>${td('Mitte: Hansabibliothek')}${td('Magazin 1 - Bereitstellung 1-3 Tage - Roman Garm')}${td('4 Wochen - Bestellwunsch möglich - 2x')}${td('<span>Verfügbar</span>')}</tr>
  </tbody></table>`

  it('uses the Standort signature, not the Bestellmöglichkeit column', () => {
    const $ = cheerio.load(html)
    expect(parseAvailabilityTable($, $('#resptable-1'))).toEqual([
      { libraryName: 'Charlottenburg-Wilmersdorf: Dietrich-Bonhoeffer-Bibliothek', status: 'Nicht im Regal', shelfmark: 'Roman Garm' },
      { libraryName: 'Mitte: Hansabibliothek', status: 'Verfügbar', shelfmark: 'Roman Garm' },
    ])
  })

  it('marks copies that are reading-room-only or order-only, real cells of SAK15180452 and SAK00224031', () => {
    const $ = cheerio.load(`<table><thead><tr><th>Bibliothek</th><th>Standort</th><th>Signatur</th><th>Bestellmöglichkeit</th><th>Verfügbarkeit</th></tr></thead><tbody>
      <tr>${td('ZLB: Berlin-Sammlungen')}${td('Magazin Historische Sammlungen / Sammlung Kuczynski')}${td('KucLa 3309')}${td('Nur Lesesaal - Magazin, nur Lesesaal')}${td('<span class="available">Verfügbar</span>')}</tr>
      <tr>${td('ZLB: Amerika-Gedenkbibliothek (AGB)')}${td('Magazin AGB / Nonbook Normalformat')}${td('112/000 041 487')}${td('2 Wochen - Magazin, bestellbar')}${td('<span>Verfügbar</span>')}</tr>
      <tr>${td('Mitte: Hansabibliothek')}${td('Erwachsene / Science-fiction')}${td('Hörbuch  Gibs')}${td('2 Wochen - Bestellwunsch möglich')}${td('<span>Verfügbar</span>')}</tr></tbody></table>`)
    expect(parseAvailabilityTable($, $('table')).map(b => b.access)).toEqual(['reading-room', 'order-only', undefined])
  })

  it('finds the order column without a Bestellmöglichkeit header', () => {
    const $ = cheerio.load(`<table><tbody>
      <tr>${td('ZLB: Berlin-Sammlungen')}${td('Magazin - KucLa 3309')}${td('Nur Lesesaal - Magazin, nur Lesesaal')}${td('Verfügbar')}</tr></tbody></table>`)
    expect(parseAvailabilityTable($, $('table'))[0].access).toBe('reading-room')
  })

  it('prefers a dedicated Signatur column when VÖBB adds one', () => {
    const $ = cheerio.load(`<table><thead><tr><th>Bibliothek</th><th>Standort</th><th>Signatur</th><th>Verfügbarkeit</th></tr></thead><tbody>
      <tr>${td('ZLB: AGB')}${td('Freihand')}${td('L 782 Lee M 50 f')}${td('Verfügbar')}</tr></tbody></table>`)
    expect(parseAvailabilityTable($, $('table'))[0].shelfmark).toBe('L 782 Lee M 50 f')
  })
})
