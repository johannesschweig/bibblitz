import { describe, it, expect } from 'vitest'
// @ts-expect-error plain .mjs script without types
import { compareWeek, expandSpec, extractWeek, htmlToText, parseWeek } from '../../scripts/libraries/parseHours.mjs'

// The page texts below are copied from the libraries' own websites (02.11.2026), one per layout seen in the district sites
describe('parseWeek', () => {
  it('reads "Mo., Fr.:" lists and keeps a trailing service note out of the time', () => {
    const { hours } = parseWeek('Mo., Fr.: 13:00-19:30 Uhr\nDi., Mi., Do.: 12:00-18:00 Uhr\nSa.: 10:00-14:00 Uhr\nSo.: 10:00-16:00 Uhr mit eingeschränktem Service')
    expect(hours).toEqual({
      monday: '13:00-19:30', friday: '13:00-19:30', tuesday: '12:00-18:00', wednesday: '12:00-18:00', thursday: '12:00-18:00',
      saturday: '10:00-14:00', sunday: '10:00-16:00'
    })
  })

  it('reads full day names with "und", "+" and plain hours without minutes', () => {
    expect(parseWeek('Montag und Donnerstag\n13 bis 19 Uhr\nDienstag, Mittwoch, Freitag\n13 bis 17 Uhr').hours).toEqual({
      monday: '13:00-19:00', thursday: '13:00-19:00', tuesday: '13:00-17:00', wednesday: '13:00-17:00', friday: '13:00-17:00'
    })
    expect(parseWeek('Montag + Donnerstag\n13 bis 19 Uhr').hours).toEqual({ monday: '13:00-19:00', thursday: '13:00-19:00' })
  })

  it('reads one day per line, "geschlossen" and the Pankow spelling "Sonnabend"', () => {
    const { hours } = parseWeek('Montag, 11 bis 17 Uhr\nDienstag, 11 bis 17 Uhr\nmittwochs geschlossen\nDonnerstag, 13 bis 19 Uhr\nSonnabend, 10 bis 15 Uhr')
    expect(hours).toEqual({ monday: '11:00-17:00', tuesday: '11:00-17:00', wednesday: null, thursday: '13:00-19:00', saturday: '10:00-15:00' })
  })

  it('reads ranges of days and dotted times', () => {
    expect(parseWeek('Mo – Fr 10:00 – 19:00 Uhr\nSa 10.00 – 16.00 Uhr').hours).toEqual({
      monday: '10:00-19:00', tuesday: '10:00-19:00', wednesday: '10:00-19:00', thursday: '10:00-19:00', friday: '10:00-19:00', saturday: '10:00-16:00'
    })
  })

  it('does not take the words "Die", "Dortmund" or "Sonntag" inside a name for days', () => {
    expect(parseWeek('Die Bibliothek in Dortmund 10 – 12 Heidi Sonntag kam').hours).toEqual({})
  })

  it('counts a bracketed service note that touches the range as open time', () => {
    // The building is open from 10:00, only the service starts at 12:00
    expect(parseWeek('Mo – Fr 12 – 19 Uhr (10 – 12 Uhr eingeschränkter Service)\nSo 12 – 16 Uhr (eingeschränkter Service)').hours).toEqual({
      monday: '10:00-19:00', tuesday: '10:00-19:00', wednesday: '10:00-19:00', thursday: '10:00-19:00', friday: '10:00-19:00', sunday: '12:00-16:00'
    })
    // A note inside the range changes nothing
    expect(parseWeek('Montag, 9 bis 19 Uhr\n(9 bis 10 Uhr ohne Service)').hours).toEqual({ monday: '09:00-19:00' })
  })

  it('reports a day with two different ranges as a conflict', () => {
    expect(parseWeek('Mo 10:00-12:00\nMo 14:00-18:00').conflicts).toEqual(['monday'])
  })
})

describe('expandSpec', () => {
  it('expands ranges and lists', () => {
    expect(expandSpec('Mo – Mi')).toEqual(['monday', 'tuesday', 'wednesday'])
    expect(expandSpec('Di., Do.')).toEqual(['tuesday', 'thursday'])
  })
})

describe('extractWeek', () => {
  it('skips the menu entry "Öffnungszeiten" and stops at the contact block', () => {
    const text = 'Menü\nÖffnungszeiten\nKontakt\nÖffnungszeiten:\nMontag, 13 bis 19 Uhr\nDienstag, 13 bis 19 Uhr\nSchließtage\nAlle Bibliotheken bleiben 03.10.2026 geschlossen\nMittwoch 10 bis 12 Uhr'
    expect(extractWeek(text).hours).toEqual({ monday: '13:00-19:00', tuesday: '13:00-19:00' })
  })

  it('cuts at the capitalised service-free heading but not at a bracketed "servicefrei"', () => {
    const text = 'Öffnungszeiten\nMontag bis Freitag\n10 bis 19 Uhr (10 bis 11 Uhr servicefrei)\nSamstag, Sonntag\n10 bis 18 Uhr (samstags ab 15 Uhr servicefrei)\nIn der servicefreien Zeit keine Neuanmeldungen'
    expect(extractWeek(text).hours).toMatchObject({ monday: '10:00-19:00', friday: '10:00-19:00', saturday: '10:00-18:00', sunday: '10:00-18:00' })
    const kisch = 'Öffnungszeiten\nMontag\n10:00 bis 18:00 Uhr\nSamstag\n09:00 bis 19:00 Uhr\nServicefreie Zeiten\nMontag\n10:00 bis 11:00 Uhr'
    expect(extractWeek(kisch).hours).toEqual({ monday: '10:00-18:00', saturday: '09:00-19:00' })
  })

  it('reads one library out of a page that lists several, between an anchor and a stop', () => {
    const text = 'Stadtteilbibliothek A\nMo\n13.00 – 19.00 Uhr\nFr\n11.00 – 19.00 Uhr\n17.00 – 19.00 Uhr servicefrei\nSa\n11.00 – 16.00 Uhr\nFamilienbibliothek B\nMo\n13.00 – 18.00 Uhr'
    expect(extractWeek(text, { anchor: /Stadtteilbibliothek A\s*\n?\s*Mo\b/, stop: /Familienbibliothek/ }).hours).toEqual({
      monday: '13:00-19:00', friday: '11:00-19:00', saturday: '11:00-16:00'
    })
  })

  it('merges the blocks of a library that has one per part', () => {
    const text = 'Öffnungszeiten Kinderbibliothek\nDienstag: 11 – 18 Uhr\nDörpfeldstr.52 52\nÖffnungszeiten Erwachsenenbibliothek\nDonnerstag: 11 – 18 Uhr\nTel.: 90297-5731'
    expect(extractWeek(text, { merge: true }).hours).toEqual({ tuesday: '11:00-18:00', thursday: '11:00-18:00' })
  })

  it('says "not found" for a page without times', () => {
    expect(extractWeek('Öffnungszeiten\nBitte rufen Sie an.').found).toBe(false)
  })
})

describe('compareWeek', () => {
  it('treats null and a missing day as closed on both sides', () => {
    expect(compareWeek({ monday: '10:00-18:00', tuesday: null }, { monday: '10:00-18:00', tuesday: null, wednesday: null })).toEqual([])
  })

  it('reports changed, new and removed days', () => {
    const stored = { monday: '10:00-18:00', tuesday: '10:00-18:00', saturday: '10:00-15:00' }
    const site = { monday: '10:00-19:00', tuesday: '10:00-18:00', sunday: '09:00-19:00' }
    expect(compareWeek(stored, site)).toEqual([
      { day: 'monday', stored: '10:00-18:00', site: '10:00-19:00' },
      { day: 'saturday', stored: '10:00-15:00', site: 'not on page' },
      { day: 'sunday', stored: null, site: '09:00-19:00' }
    ])
  })
})

describe('htmlToText', () => {
  it('puts block elements on their own line and drops scripts and soft hyphens', () => {
    const text = htmlToText('<div>Öffnungszeiten</div><ul><li>Mo</li><li>10:00 – 12:00 Uhr</li></ul><script>var a = 1</script><p>Bezirkszentral­bibliothek</p>')
    expect(text.split('\n').filter(Boolean)).toEqual(['Öffnungszeiten', 'Mo', '10:00 – 12:00 Uhr', 'Bezirkszentralbibliothek'])
  })
})
