import { describe, it, expect } from 'vitest'
import { parseFilterParam, parseMediaTypeParam, sameSelection } from '../../utils/filters'

describe('parseFilterParam', () => {
  it('splits a comma list, trims and drops duplicates and empties', () => {
    expect(parseFilterParam('Deutsch, Englisch,,Deutsch')).toEqual(['Deutsch', 'Englisch'])
  })

  it('accepts a repeated parameter', () => {
    expect(parseFilterParam(['Deutsch', 'Englisch,Spanisch'])).toEqual(['Deutsch', 'Englisch', 'Spanisch'])
  })

  it('returns nothing for missing or non-string values', () => {
    expect(parseFilterParam(undefined)).toEqual([])
    expect(parseFilterParam(null)).toEqual([])
    expect(parseFilterParam([{}])).toEqual([])
  })

  it('caps the list so a crafted URL cannot post dozens of facet values', () => {
    expect(parseFilterParam('a,b,c,d,e,f,g,h')).toHaveLength(5)
  })
})

describe('sameSelection', () => {
  it('ignores order', () => {
    expect(sameSelection(['Deutsch', 'Englisch'], ['Englisch', 'Deutsch'])).toBe(true)
  })

  it('tells different selections apart', () => {
    expect(sameSelection(['Deutsch'], ['Englisch'])).toBe(false)
    expect(sameSelection(['Deutsch'], [])).toBe(false)
    expect(sameSelection([], [])).toBe(true)
  })
})

describe('parseMediaTypeParam', () => {
  it('maps the renamed chip so old ?type=Spiel links keep working', () => {
    expect(parseMediaTypeParam('Spiel')).toEqual(['Gesellschaftsspiel'])
    expect(parseMediaTypeParam('Gesellschaftsspiel')).toEqual(['Gesellschaftsspiel'])
    expect(parseMediaTypeParam('Spiel,Gesellschaftsspiel,Buch')).toEqual(['Gesellschaftsspiel', 'Buch'])
  })
})
