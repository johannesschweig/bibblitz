import { describe, it, expect } from 'vitest'
import { parseLanguages, formatLanguageLine } from '../../utils/language'

describe('parseLanguages', () => {
  it('splits the detail page format "Deutsch ; Englisch"', () => {
    expect(parseLanguages('Deutsch ; Englisch')).toEqual(['Deutsch', 'Englisch'])
  })

  it('handles a single value and empty input', () => {
    expect(parseLanguages('Englisch')).toEqual(['Englisch'])
    expect(parseLanguages('')).toEqual([])
    expect(parseLanguages(undefined)).toEqual([])
  })
})

describe('formatLanguageLine', () => {
  it('joins several languages', () => {
    expect(formatLanguageLine(['Deutsch', 'Englisch'])).toBe('Deutsch · Englisch')
  })

  it('cuts long lists (DVDs with many audio tracks) after four', () => {
    expect(formatLanguageLine(['Deutsch', 'Englisch', 'Französisch', 'Spanisch', 'Italienisch', 'Polnisch']))
      .toBe('Deutsch · Englisch · Französisch · Spanisch · +2')
  })

  it('is empty without a language', () => {
    expect(formatLanguageLine(undefined)).toBe('')
    expect(formatLanguageLine([])).toBe('')
  })
})
