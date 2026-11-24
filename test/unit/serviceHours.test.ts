import { describe, it, expect } from 'vitest'
// @ts-expect-error plain .mjs without types
import { hoursWindow, staffedTime, deriveRun, judgeLibrary, mentionsService } from '../../scripts/libraries/serviceHours.mjs'

// Page texts of real libraries (voebb.de links, read 23.11.2026). The model answers below are what the model gave
// for these texts; the tests cover what the code does with an answer, not what the model says.
const BOELL = `Öffnungszeiten
Montag, 9 bis 19 Uhr
(9 bis 10 Uhr ohne Service)
Dienstag, 9 bis 19 Uhr
(9 bis 10 Uhr ohne Service)
Mittwoch, 13 bis 19 Uhr
Donnerstag, 9 bis 19 Uhr
(9 bis 10 Uhr ohne Service)
Freitag, 9 bis 19 Uhr
(9 bis 10 Uhr ohne Service)
Sonnabend, 10 bis 19 Uhr
(ab 15 Uhr ohne Service)
Sonntag, 10 bis 19 Uhr
(ohne Service)`

const BOELL_OPENING = { monday: '09:00-19:00', tuesday: '09:00-19:00', wednesday: '13:00-19:00', thursday: '09:00-19:00', friday: '09:00-19:00', saturday: '10:00-19:00', sunday: '10:00-19:00' }

type Day = { day: string, open: string | null, service_free: string[], restricted: string[], quote: string }
const day = (d: string, open: string | null, free: string[] = [], quote = '', restricted: string[] = []): Day => ({ day: d, open, service_free: free, restricted, quote })

const boellAnswer = (): Day[] => [
  day('monday', '09:00-19:00', ['09:00-10:00'], '(9 bis 10 Uhr ohne Service)'),
  day('tuesday', '09:00-19:00', ['09:00-10:00'], '(9 bis 10 Uhr ohne Service)'),
  day('wednesday', '13:00-19:00'),
  day('thursday', '09:00-19:00', ['09:00-10:00'], '(9 bis 10 Uhr ohne Service)'),
  day('friday', '09:00-19:00', ['09:00-10:00'], '(9 bis 10 Uhr ohne Service)'),
  day('saturday', '10:00-19:00', ['15:00-19:00'], '(ab 15 Uhr ohne Service)'),
  day('sunday', '10:00-19:00', ['10:00-19:00'], '(ohne Service)')
]

describe('staffedTime', () => {
  it('cuts service-free ranges out of the opening time', () => {
    expect(staffedTime('09:00-19:00', ['09:00-11:00'])).toEqual({ staffed: '11:00-19:00' })
    expect(staffedTime('10:00-19:00', ['15:00-19:00'])).toEqual({ staffed: '10:00-15:00' })
    expect(staffedTime('09:00-19:00', [])).toEqual({ staffed: '09:00-19:00' })
  })

  it('returns null when the whole day is service-free', () => {
    expect(staffedTime('10:00-19:00', ['10:00-19:00'])).toEqual({ staffed: null })
    expect(staffedTime('13:00-18:00', ['13:00-18:00'])).toEqual({ staffed: null })
  })

  it('refuses a split staffed time and ranges outside the opening time', () => {
    expect(staffedTime('09:00-19:00', ['12:00-14:00']).error).toMatch(/split/)
    expect(staffedTime('12:00-19:00', ['10:00-12:00']).error).toMatch(/outside/)
    expect(staffedTime('09:00-19:00', ['09:00-12:00', '11:00-13:00']).error).toMatch(/overlap/)
  })
})

describe('hoursWindow', () => {
  it('skips the menu heading and takes the block with weekdays and times', () => {
    const page = `Navigation\nÖffnungszeiten\nAusleihe und Bibliotheksausweis\nKatalog auf voebb.de\n${'x'.repeat(2000)}\n${BOELL}\nTel.: 030 123`
    const window = hoursWindow(page)
    expect(window).toContain('Montag, 9 bis 19 Uhr')
    expect(window).toContain('(ab 15 Uhr ohne Service)')
    expect(window).not.toContain('Tel.')
  })

  it('keeps the service note that the hours check cuts off', () => {
    const page = 'Öffnungszeiten\nMontag, 9 bis 19 Uhr\nSonntag, 10 bis 19 Uhr\nServicefreie Zeiten\nMontag, 9 bis 10 Uhr\nIn dieser Zeit nur Automaten.\nTel. 030'
    expect(hoursWindow(page)).toContain('Servicefreie Zeiten')
  })

  it('returns an empty string when no hours are found', () => {
    expect(hoursWindow('Nur ein Impressum, Öffnungszeiten folgen.')).toBe('')
  })
})

describe('deriveRun', () => {
  it('derives the staffed times of a real page (Heinrich-Böll-Bibliothek)', () => {
    const run = deriveRun(boellAnswer(), { window: BOELL, opening: BOELL_OPENING })
    expect(run.reasons).toEqual([])
    expect(run.serviceHours).toEqual({
      monday: '10:00-19:00', tuesday: '10:00-19:00', wednesday: '13:00-19:00', thursday: '10:00-19:00',
      friday: '10:00-19:00', saturday: '10:00-15:00', sunday: null
    })
  })

  it('counts "eingeschränkter Service" as no staff', () => {
    const answer = [day('tuesday', '12:00-18:00', [], 'Di, Do: 12:00 – 18:00 Uhr (12:00 – 14:00 Uhr eingeschränkter Service)', ['12:00-14:00'])]
    const window = 'Di, Do: 12:00 – 18:00 Uhr (12:00 – 14:00 Uhr eingeschränkter Service)'
    const run = deriveRun(answer, { window, opening: { tuesday: '12:00-18:00' } })
    expect(run.serviceHours).toEqual({ tuesday: '14:00-18:00' })
  })

  it('notes a quote that is not in the page text', () => {
    const answer = boellAnswer()
    answer[0].quote = 'Montags ist bis 10 Uhr kein Service'
    expect(deriveRun(answer, { window: BOELL, opening: BOELL_OPENING }).unquoted).toEqual(['monday'])
    expect(deriveRun(boellAnswer(), { window: BOELL, opening: BOELL_OPENING }).unquoted).toEqual([])
  })

  it('flags opening hours that differ from the stored ones', () => {
    const answer = boellAnswer()
    answer[2].open = '12:00-19:00'
    expect(deriveRun(answer, { window: BOELL, opening: BOELL_OPENING }).reasons.join()).toMatch(/wednesday: the model read 12:00-19:00, stored is 13:00-19:00/)
  })

  it('flags a bad time format and a service-free range outside the opening time', () => {
    const bad = boellAnswer()
    bad[0].service_free = ['9-10']
    expect(deriveRun(bad, { window: BOELL, opening: BOELL_OPENING }).reasons.join()).toMatch(/bad range/)
    const outside = boellAnswer()
    outside[0].service_free = ['07:00-10:00']
    expect(deriveRun(outside, { window: BOELL, opening: BOELL_OPENING }).reasons.join()).toMatch(/outside the opening time/)
  })
})

describe('judgeLibrary', () => {
  const two = [boellAnswer(), boellAnswer()]

  it('accepts a library without service hours when both runs agree and every guard holds', () => {
    const result = judgeLibrary({ runs: two, window: BOELL, opening: BOELL_OPENING, stored: null })
    expect(result.status).toBe('new')
    expect(result.serviceHours.saturday).toBe('10:00-15:00')
  })

  it('is suspicious when the two runs disagree', () => {
    const other = boellAnswer()
    other[5] = day('saturday', '10:00-19:00', ['16:00-19:00'], '(ab 15 Uhr ohne Service)')
    const result = judgeLibrary({ runs: [boellAnswer(), other], window: BOELL, opening: BOELL_OPENING, stored: null })
    expect(result.status).toBe('suspicious')
    expect(result.reasons[0]).toMatch(/disagree/)
  })

  it('is suspicious with a single run, with no window, or with a failed guard in one run', () => {
    expect(judgeLibrary({ runs: [boellAnswer()], window: BOELL, opening: BOELL_OPENING, stored: null }).status).toBe('suspicious')
    expect(judgeLibrary({ runs: two, window: '', opening: BOELL_OPENING, stored: null }).status).toBe('suspicious')
    const bad = boellAnswer()
    bad[0].open = '08:00-19:00'
    expect(judgeLibrary({ runs: [boellAnswer(), bad], window: BOELL, opening: BOELL_OPENING, stored: null }).status).toBe('suspicious')
  })

  it('needs a valid quote for each day in at least one run, not in both', () => {
    const noQuote = boellAnswer()
    noQuote[5].quote = ''
    expect(judgeLibrary({ runs: [boellAnswer(), noQuote], window: BOELL, opening: BOELL_OPENING, stored: null }).status).toBe('new')
    const invented = boellAnswer()
    invented[5].quote = 'Samstags ab 15 Uhr kein Service'
    const result = judgeLibrary({ runs: [noQuote, invented], window: BOELL, opening: BOELL_OPENING, stored: null })
    expect(result.status).toBe('suspicious')
    expect(result.reasons.join()).toMatch(/saturday: the quoted sentence is not in the page text/)
  })

  it('reports same / changed against stored service hours, and never calls a change fine', () => {
    const stored = { monday: '10:00-19:00', tuesday: '10:00-19:00', wednesday: '13:00-19:00', thursday: '10:00-19:00', friday: '10:00-19:00', saturday: '10:00-15:00', sunday: null }
    expect(judgeLibrary({ runs: two, window: BOELL, opening: BOELL_OPENING, stored }).status).toBe('same')
    expect(judgeLibrary({ runs: two, window: BOELL, opening: BOELL_OPENING, stored: { ...stored, saturday: '10:00-16:00' } }).status).toBe('changed')
  })

  it('is suspicious when service hours are stored but the model finds no service-free time', () => {
    const none = Object.keys(BOELL_OPENING).map(d => day(d, (BOELL_OPENING as Record<string, string>)[d]))
    const result = judgeLibrary({ runs: [none, none], window: BOELL, opening: BOELL_OPENING, stored: { monday: '09:00-19:00' } })
    expect(result.status).toBe('suspicious')
  })

  it('is suspicious when the text talks about service but the model found nothing, none when it does not', () => {
    const none = Object.keys(BOELL_OPENING).map(d => day(d, (BOELL_OPENING as Record<string, string>)[d]))
    expect(judgeLibrary({ runs: [none, none], window: BOELL, opening: BOELL_OPENING, stored: null }).status).toBe('suspicious')
    const plain = 'Öffnungszeiten\nMontag, 9 bis 19 Uhr'
    const one = [day('monday', '09:00-19:00')]
    expect(judgeLibrary({ runs: [one, one], window: plain, opening: { monday: '09:00-19:00' }, stored: null }).status).toBe('none')
  })

  it('calls a failed model call an error, not suspicious data', () => {
    const result = judgeLibrary({ runs: [boellAnswer()], window: BOELL, opening: BOELL_OPENING, stored: null, error: 'RuntimeError: 503 UNAVAILABLE' })
    expect(result.status).toBe('error')
    expect(result.reasons[0]).toMatch(/503/)
  })

  it('leaves stored service hours alone when the page has no service times to compare (ZLB)', () => {
    const result = judgeLibrary({ runs: [], window: 'Mo – Fr 10.00 – 21.00 Uhr', opening: { monday: '10:00-21:00' }, stored: { monday: '11:00-19:00' } })
    expect(result.status).toBe('unchecked')
  })
})

describe('mentionsService', () => {
  it('recognises the wordings of the library pages', () => {
    for (const text of ['ohne Service', 'servicefrei (ohne Personal vor Ort)', 'eingeschränkter Service', 'zu folgenden Servicezeiten da']) {
      expect(mentionsService(text), text).toBe(true)
    }
    expect(mentionsService('Mo – Fr 10:00 – 19:00 Uhr')).toBe(false)
  })
})
