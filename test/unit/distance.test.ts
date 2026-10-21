import { describe, it, expect } from 'vitest'
import { formatDistance } from '../../utils/distance'

describe('formatDistance', () => {
  it('rounds below 1 km to 100 m', () => {
    expect(formatDistance(0.47)).toBe('500 m')
    expect(formatDistance(0.12)).toBe('100 m')
    expect(formatDistance(0.04)).toBe('unter 100 m')
  })

  it('shows 1 km instead of 1000 m', () => {
    expect(formatDistance(0.96)).toBe('1 km')
  })

  it('rounds up to 5 km to 0.5 km with a German decimal comma', () => {
    expect(formatDistance(1)).toBe('1 km')
    expect(formatDistance(1.2)).toBe('1 km')
    expect(formatDistance(1.3)).toBe('1,5 km')
    expect(formatDistance(2.8)).toBe('3 km')
  })

  it('rounds from 5 km to whole km', () => {
    expect(formatDistance(7.25)).toBe('7 km')
    expect(formatDistance(12.6)).toBe('13 km')
  })
})
