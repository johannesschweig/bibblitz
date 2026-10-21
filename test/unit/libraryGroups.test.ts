import { describe, it, expect } from 'vitest'
import { groupLibraries } from '../../utils/libraryGroups'

describe('groupLibraries', () => {
  const libs = [
    { name: 'Zeta', district: 'Pankow' },
    { name: 'BiboBike' },
    { name: 'Alpha', district: 'Pankow' },
    { name: 'AGB', district: 'Zentral- und Landesbibliothek (ZLB)' },
    { name: 'Nord', district: 'Mitte' }
  ]

  it('puts the ZLB first, districts A–Z and mobile services last', () => {
    expect(groupLibraries(libs).map(g => g.title)).toEqual([
      'Zentral- und Landesbibliothek (ZLB)', 'Mitte', 'Pankow', 'Mobile und weitere Angebote'
    ])
  })

  it('collects libraries without a district', () => {
    expect(groupLibraries(libs).at(-1)?.libraries.map(l => l.name)).toEqual(['BiboBike'])
  })

  it('sorts libraries A–Z within a group', () => {
    expect(groupLibraries(libs).find(g => g.title === 'Pankow')?.libraries.map(l => l.name)).toEqual(['Alpha', 'Zeta'])
  })
})
