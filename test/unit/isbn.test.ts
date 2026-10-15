import { describe, it, expect } from 'vitest'
import { normalizeIsbn, toIsbn13, parseIsbn } from '../../utils/isbn'

describe('normalizeIsbn', () => {
  it('accepts ISBN-13 and ISBN-10 with hyphens, spaces or an ISBN prefix', () => {
    expect(normalizeIsbn('978-3-8479-0162-4')).toBe('9783847901624')
    expect(normalizeIsbn('978 3 8479 0162 4')).toBe('9783847901624')
    expect(normalizeIsbn('ISBN 978-3-8479-0162-4')).toBe('9783847901624')
    expect(normalizeIsbn('ISBN-10: 3-89813-259-5')).toBe('3898132595')
  })

  it('accepts an X check digit in either case', () => {
    expect(normalizeIsbn('0-8044-2957-x')).toBe('080442957X')
  })

  it('rejects text, other numbers and wrong check digits', () => {
    expect(normalizeIsbn('Dune Wüstenplanet')).toBeNull()
    expect(normalizeIsbn('2024')).toBeNull()
    expect(normalizeIsbn('9783847901625')).toBeNull()
    expect(normalizeIsbn('3847901620')).toBeNull()
  })
})

describe('toIsbn13', () => {
  it('converts ISBN-10 to ISBN-13 and keeps ISBN-13', () => {
    expect(toIsbn13('3898132595')).toBe('9783898132596')
    expect(toIsbn13('3847901621')).toBe('9783847901624')
    expect(toIsbn13('080442957X')).toBe('9780804429573')
    expect(toIsbn13('9783847901624')).toBe('9783847901624')
  })
})

describe('parseIsbn', () => {
  it('returns the ISBN row as written', () => {
    expect(parseIsbn('978-3-8479-0162-4')).toBe('978-3-8479-0162-4')
    expect(parseIsbn('3-89813-259-5')).toBe('3-89813-259-5')
  })

  it('takes the first ISBN when parallel editions follow', () => {
    expect(parseIsbn('978-3-423-28972-6 978-3-8445-3110-7 (parallele Ausgabe)')).toBe('978-3-423-28972-6')
  })

  it('skips invalid numbers', () => {
    expect(parseIsbn('kart. : EUR 12.00')).toBeUndefined()
    expect(parseIsbn('1234-5678-90 978-3-8479-0162-4')).toBe('978-3-8479-0162-4')
  })
})
