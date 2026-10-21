import { describe, it, expect } from 'vitest'
import { berlinNow, getOpenStatus, isWithinRange } from '../../utils/openingHours'

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
    expect(berlinNow(new Date('2026-07-15T10:30:00Z'))).toEqual({ day: 'wednesday', minutes: 12 * 60 + 30 })
  })

  it('uses Berlin time in winter (CET, UTC+1) and rolls over the day', () => {
    expect(berlinNow(new Date('2026-12-06T23:30:00Z'))).toEqual({ day: 'monday', minutes: 30 })
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
