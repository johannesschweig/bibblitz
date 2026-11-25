import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getMediaTypeConfig } from '../../utils/mediaTypeMapping'

describe('getMediaTypeConfig logging', () => {
  let warn: ReturnType<typeof vi.spyOn>
  let log: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    log = vi.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('falls back to "Sonstiges" without logging for an empty type', () => {
    // Rows render on the server before their data has arrived (showcase tiles), see TODO I32
    expect(getMediaTypeConfig('').label).toBe('Sonstiges')
    expect(getMediaTypeConfig('  ').label).toBe('Sonstiges')
    expect(warn).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
  })

  it('does not log for a known type, whatever its case', () => {
    expect(getMediaTypeConfig('Buch').label).toBe('Buch')
    expect(warn).not.toHaveBeenCalled()
  })

  it('logs an unknown type once, not on every call', () => {
    expect(getMediaTypeConfig('Hologramm-Würfel').label).toBe('Sonstiges')
    getMediaTypeConfig('hologramm-würfel')
    getMediaTypeConfig('Hologramm-Würfel')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('hologramm-würfel')
  })
})
