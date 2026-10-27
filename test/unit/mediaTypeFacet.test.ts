import { describe, it, expect } from 'vitest'
import { mediaTypeFacetIds, isHiddenMediaType, chipLabel } from '../../utils/mediaTypeFacet'
import { MEDIA_TYPE_OPTIONS, LANGUAGE_OPTIONS } from '../../utils/filterOptions'

// The Medienart facet of the search "harry potter" (27.10.2026), shortened
const facet = [
  { id: 'b', label: 'Buch (Print)', count: 885 },
  { id: 'er', label: 'Elektronische Ressource', count: 500 },
  { id: 'eb', label: 'E-Book', count: 274 },
  { id: 'f', label: 'Filme', count: 167 },
  { id: 'cd', label: 'CD', count: 158 },
  { id: 'ea', label: 'E-Audio', count: 144 },
  { id: 'dvd', label: 'DVD-Video', count: 97 },
  { id: 'bd', label: 'Blu-ray Disc', count: 67 },
  { id: 'rh', label: 'Reihe, mehrbändige Werke', count: 36 },
  { id: 'uhd', label: 'Ultra HD Blu-ray', count: 11 },
  { id: 'dr', label: 'DVD-ROM', count: 9 }
]

describe('mediaTypeFacetIds', () => {
  it('returns every value behind the chosen chip (DVD = DVD-Video + DVD-ROM)', () => {
    expect(mediaTypeFacetIds(facet, ['DVD'])).toEqual(['dvd', 'dr'])
  })

  it('returns every value with copies when nothing is chosen, so a language filter drops the e-media', () => {
    expect(mediaTypeFacetIds(facet, [])).toEqual(['b', 'f', 'cd', 'dvd', 'bd', 'uhd', 'dr'])
  })

  it('returns nothing for a chip this search has no hit of, and for e-media', () => {
    expect(mediaTypeFacetIds(facet, ['Karte'])).toEqual([])
    expect(mediaTypeFacetIds(facet, ['E-Book'])).toEqual([])
  })
})

describe('isHiddenMediaType', () => {
  it('treats every E- type as hidden', () => {
    expect(isHiddenMediaType('E-Learning')).toBe(true)
    expect(isHiddenMediaType('E-Music')).toBe(true)
    expect(isHiddenMediaType('Buch (Print)')).toBe(false)
  })
})

// All 30 values VÖBB listed for "harry potter" on 27.10.2026. Every one that has copies must be reachable
// through a chip, or a type could not be filtered; every chip must lead to a value.
describe('fixed filter lists', () => {
  const measured = [
    'Buch (Print)', 'Elektronische Ressource', 'E-Book', 'Filme', 'CD', 'E-Audio', 'DVD-Video', 'Blu-ray Disc', 'Noten', 'MP3',
    'Punktschrift (Kurzschrift)', 'Konsolenspiel', 'Konventionelles Spiel', 'Reihe, mehrbändige Werke', 'Medienkombination', 'E-Music',
    'MC', 'Zeitschrift/Reihe', 'E-Video', 'Computerspiel', 'Ultra HD Blu-ray', 'Video', 'DVD-ROM', 'CD-ROM', 'Schallplatte', 'Aufsatz',
    'Karte/Plan', 'E-Learning', 'sonstiges Material oder Gegenstand', 'Blu-ray Audio'
  ]
  // Catch-alls without a chip on purpose (a language filter alone still includes them)
  const withoutChip = ['Medienkombination', 'sonstiges Material oder Gegenstand']
  const offered = measured.filter(label => !isHiddenMediaType(label) && label !== 'Filme' && !withoutChip.includes(label))

  it('offers a chip for every VÖBB media type with copies, except the catch-alls', () => {
    for (const label of offered) expect(MEDIA_TYPE_OPTIONS, label).toContain(chipLabel(label))
  })

  it('merges CD-ROM into CD', () => {
    expect(mediaTypeFacetIds([{ id: 'cd', label: 'CD', count: 1 }, { id: 'cr', label: 'CD-ROM', count: 1 }], ['CD'])).toEqual(['cd', 'cr'])
  })

  it('still includes the catch-alls when only a language is chosen', () => {
    expect(mediaTypeFacetIds([{ id: 'mk', label: 'Medienkombination', count: 1 }], [])).toEqual(['mk'])
  })

  it('has no chip without a VÖBB value behind it', () => {
    const reachable = offered.map(chipLabel)
    for (const chip of MEDIA_TYPE_OPTIONS) expect(reachable, chip).toContain(chip)
  })

  it('has no duplicate chips', () => {
    expect(new Set(MEDIA_TYPE_OPTIONS).size).toBe(MEDIA_TYPE_OPTIONS.length)
    expect(new Set(LANGUAGE_OPTIONS).size).toBe(LANGUAGE_OPTIONS.length)
  })
})
