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

  it('uses https links and stores hours as "HH:MM-HH:MM" or null', () => {
    for (const lib of libraries) {
      if (lib.website) expect(lib.website, lib.name).toMatch(/^https:\/\//)
      for (const hours of [lib.opening_hours, lib.service_hours]) {
        for (const [day, value] of Object.entries(hours ?? {})) {
          expect(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], `${lib.name} ${day}`).toContain(day)
          if (value !== null) expect(value, `${lib.name} ${day}`).toMatch(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/)
        }
      }
    }
  })

  it('keeps service hours inside the opening hours', () => {
    const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
    for (const lib of libraries.filter(l => l.service_hours)) {
      for (const [day, service] of Object.entries(lib.service_hours!)) {
        const open = (lib.opening_hours as Record<string, string | null>)?.[day]
        if (!service) continue
        expect(open, `${lib.name} ${day}: service hours on a closed day`).toBeTruthy()
        const [s0, s1] = service.split('-').map(minutes)
        const [o0, o1] = open!.split('-').map(minutes)
        expect(s0 >= o0 && s1 <= o1, `${lib.name} ${day}: ${service} outside ${open}`).toBe(true)
      }
    }
  })
})
