import { describe, it, expect } from 'vitest'
import libraries from '../../app/assets/libraries.json'

// libraries.json is edited by hand, so keep its spelling consistent (the library list groups by district)
describe('libraries.json', () => {
  it('has unique ids and names', () => {
    expect(new Set(libraries.map(l => l.id)).size).toBe(libraries.length)
    expect(new Set(libraries.map(l => l.name)).size).toBe(libraries.length)
  })

  it('uses one spelling per district', () => {
    const districts = [...new Set(libraries.map(l => l.district).filter(Boolean))]
    expect(districts).toContain('Zentral- und Landesbibliothek (ZLB)')
    expect(districts.filter(d => /zlb|zentral/i.test(d!))).toHaveLength(1)
    expect(districts.filter(d => /oe|ae|ue/.test(d!))).toEqual([])
  })

  it('writes addresses as "Street, ZIP Berlin" without stray commas', () => {
    for (const lib of libraries) {
      expect(lib.address, lib.name).toMatch(/\d{5} Berlin(-\w+)?$/)
      expect(lib.address, lib.name).not.toMatch(/,\S/)
    }
  })

  it('starts addresses with the street, not with a name', () => {
    // The mobile libraries have no street ("An Ihrer Haltestelle")
    for (const lib of libraries.filter(l => !l.address.startsWith('An Ihrer Haltestelle'))) {
      expect(lib.address.split(', ')[0], lib.name).toMatch(/\d/)
    }
  })
})
