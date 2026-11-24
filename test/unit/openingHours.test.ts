import { describe, it, expect } from 'vitest'
import { berlinNow, getOpenStatus, isWithinRange, activeClosure, upcomingClosures, formatClosure } from '../../utils/openingHours'

describe('isWithinRange', () => {
  it('includes the start and excludes the end', () => {
    expect(isWithinRange('10:00-19:30', 10 * 60)).toBe(true)
    expect(isWithinRange('10:00-19:30', 19 * 60 + 29)).toBe(true)
    expect(isWithinRange('10:00-19:30', 19 * 60 + 30)).toBe(false)
    expect(isWithinRange('10:00-19:30', 9 * 60 + 59)).toBe(false)
  })

  it('treats missing or non-time values as closed', () => {
    expect(isWithinRange(null, 12 * 60)).toBe(false)
    expect(isWithinRange(undefined, 12 * 60)).toBe(false)
    expect(isWithinRange('Geschlossen', 12 * 60)).toBe(false)
  })
})

describe('berlinNow', () => {
  it('uses Berlin time in summer (CEST, UTC+2)', () => {
    expect(berlinNow(new Date('2026-07-15T10:30:00Z'))).toEqual({ day: 'wednesday', minutes: 12 * 60 + 30, date: '2026-07-15' })
  })

  it('uses Berlin time in winter (CET, UTC+1) and rolls over the day', () => {
    expect(berlinNow(new Date('2026-12-06T23:30:00Z'))).toEqual({ day: 'monday', minutes: 30, date: '2026-12-07' })
  })
})

describe('getOpenStatus', () => {
  const opening = { monday: '10:00-19:00', tuesday: null }
  const service = { monday: '11:00-17:00' }
  const at = (h: number, m = 0) => ({ day: 'monday' as const, minutes: h * 60 + m })

  it('is open with service inside the service hours', () => {
    expect(getOpenStatus(opening, service, at(12))).toBe('open-service')
  })

  it('is open without service outside the service hours', () => {
    expect(getOpenStatus(opening, service, at(10, 30))).toBe('open-no-service')
    expect(getOpenStatus(opening, service, at(18))).toBe('open-no-service')
  })

  it('is just open when the library has no service hours', () => {
    expect(getOpenStatus(opening, null, at(12))).toBe('open')
  })

  it('is closed outside the opening hours or on a closed day', () => {
    expect(getOpenStatus(opening, service, at(9))).toBe('closed')
    expect(getOpenStatus(opening, service, { day: 'tuesday', minutes: 12 * 60 })).toBe('closed')
    expect(getOpenStatus(opening, service, { day: 'sunday', minutes: 12 * 60 })).toBe('closed')
  })
})

describe('closures', () => {
  const adlershof = { from: '2026-11-09', to: '2026-12-07', note: 'Umzug in neue Räume' }
  const schaefersee = { from: '2026-12-14' }

  it('finds the closure that covers a date, end date included', () => {
    expect(activeClosure([adlershof], '2026-11-09')).toBe(adlershof)
    expect(activeClosure([adlershof], '2026-12-07')).toBe(adlershof)
    expect(activeClosure([adlershof], '2026-12-08')).toBeNull()
    expect(activeClosure([adlershof], '2026-11-08')).toBeNull()
    expect(activeClosure(undefined, '2026-11-09')).toBeNull()
  })

  it('treats a closure without end date as open-ended', () => {
    expect(activeClosure([schaefersee], '2026-12-13')).toBeNull()
    expect(activeClosure([schaefersee], '2027-06-01')).toBe(schaefersee)
  })

  it('overrides the weekly hours as "closed-temporarily"', () => {
    const opening = { tuesday: '12:00-18:00' }
    const now = { day: 'tuesday' as const, minutes: 13 * 60, date: '2026-11-24' }
    expect(getOpenStatus(opening, null, now)).toBe('open')
    expect(getOpenStatus(opening, null, now, [adlershof])).toBe('closed-temporarily')
    expect(getOpenStatus(opening, null, { ...now, date: '2026-12-08' }, [adlershof])).toBe('open')
  })

  it('lists running and soon starting closures, drops ended and far-away ones', () => {
    const ended = { from: '2026-10-03', to: '2026-10-04' }
    const far = { from: '2027-03-08' }
    expect(upcomingClosures([far, schaefersee, ended, adlershof], '2026-11-24')).toEqual([adlershof, schaefersee])
    expect(upcomingClosures(undefined, '2026-11-24')).toEqual([])
  })

  it('formats single days, ranges and open-ended closures', () => {
    expect(formatClosure({ from: '2026-12-09' })).toBe('ab 09.12.2026')
    expect(formatClosure({ from: '2026-12-09', to: '2026-12-09' })).toBe('09.12.2026')
    expect(formatClosure(adlershof)).toBe('09.11.–07.12.2026')
    expect(formatClosure({ from: '2026-12-24', to: '2027-01-01' })).toBe('24.12.–01.01.2027')
  })
})
