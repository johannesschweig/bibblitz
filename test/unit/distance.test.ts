import { describe, it, expect } from 'vitest'
import { formatDistance } from '../../utils/distance'

describe('formatDistance', () => {
  it('zeigt unter 1 km Meter', () => {
    expect(formatDistance(0.4)).toBe('400 m')
    expect(formatDistance(0.04)).toBe('40 m')
  })

  it('zeigt ab 1 km Kilometer mit deutschem Komma', () => {
    expect(formatDistance(1)).toBe('1,0 km')
    expect(formatDistance(7.25)).toBe('7,3 km')
    expect(formatDistance(12.04)).toBe('12,0 km')
  })
})
