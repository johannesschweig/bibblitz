import { describe, it, expect } from 'vitest'
import { calculateStatusInfo, calculateBranchStatus, filterAndEnrichBranches, parseStatus, splitLibraryName } from '../../utils/availability'
import type { AvailabilityInfo } from '../../types/types'

// Real library ids from libraries.json so the distance lookup works
const CENTER = { lat: 52.52, lon: 13.405 } // ~5 km from the branch
const NEXT_TO_BRANCH = { lat: 52.53, lon: 13.35 }

function branch(partial: Partial<AvailabilityInfo>): AvailabilityInfo {
  return { libraryName: 'x', status: 'verfügbar', libraryId: 'fahrbibliothek-mitte-5', daysToWait: -999, ...partial } as AvailabilityInfo
}

describe('calculateBranchStatus', () => {
  it('marks an available branch close by as near, further away as good', () => {
    expect(calculateBranchStatus(branch({ distance: 1.2 }), false).tone).toBe('near')
    expect(calculateBranchStatus(branch({ distance: 5 }), false).tone).toBe('good')
  })

  it('never uses near with the default ZIP, distances are meaningless then', () => {
    expect(calculateBranchStatus(branch({ distance: 0.5 }), true).tone).toBe('good')
  })

  it('shows days to wait on loan and handles due today / overdue', () => {
    expect(calculateBranchStatus(branch({ status: 'Fällig am: 01.01.', daysToWait: 6 }), false)).toEqual({ label: '6 Tage', tone: 'wait' })
    expect(calculateBranchStatus(branch({ daysToWait: 1 }), false).label).toBe('1 Tag')
    expect(calculateBranchStatus(branch({ daysToWait: 0 }), false).label).toBe('Rückgabe heute fällig')
    expect(calculateBranchStatus(branch({ daysToWait: -3 }), false).label).toBe('Rückgabe überfällig')
  })

  it('falls back to a neutral pill with the raw status for unknown states', () => {
    expect(calculateBranchStatus(branch({ status: 'Bestellt', daysToWait: 999 }), false)).toEqual({ label: 'Bestellt', tone: 'neutral' })
  })
})

describe('calculateStatusInfo', () => {
  it('reports not in stock when there are no valid copies', () => {
    expect(calculateStatusInfo([branch({ status: 'Nicht im Regal' })], CENTER, false).tone).toBe('bad')
    expect(calculateStatusInfo([], CENTER, false).tone).toBe('bad')
  })

  it('uses the strongest tone only for available copies close to the user', () => {
    expect(calculateStatusInfo([branch({})], NEXT_TO_BRANCH, false)).toEqual({ label: 'Verfügbar in deiner Nähe', tone: 'near' })
    expect(calculateStatusInfo([branch({})], CENTER, false)).toEqual({ label: 'Verfügbar (5 km)', tone: 'good' })
  })

  it('counts a copy due back today as on loan, not as hard to get', () => {
    const info = calculateStatusInfo([branch({ status: 'Fällig', daysToWait: 0 })], NEXT_TO_BRANCH, false)
    expect(info).toEqual({ label: 'Ausgeliehen (heute fällig)', tone: 'wait' })
  })

  it('keeps hard-to-get as its own tone', () => {
    const far = { lat: 52.9, lon: 13.9 }
    expect(calculateStatusInfo([branch({})], far, false)).toEqual({ label: 'Schwer zu bekommen', tone: 'hard' })
  })

  it('does not use distances with the default ZIP', () => {
    expect(calculateStatusInfo([branch({}), branch({})], CENTER, true)).toEqual({ label: 'Verfügbar (2x)', tone: 'good' })
    expect(calculateStatusInfo([branch({ daysToWait: 5 })], CENTER, true).tone).toBe('wait')
  })
})


describe('parseStatus', () => {
  it('splits state, due date and notes', () => {
    expect(parseStatus('Ausgeliehen - Fällig am: 27.10.2026 - Das Beiheft ist unter derselben Grundsignatur getrennt ausleihbar.')).toEqual({
      state: 'Ausgeliehen',
      due: 'Fällig am: 27.10.2026',
      notes: ['Das Beiheft ist unter derselben Grundsignatur getrennt ausleihbar.']
    })
    expect(parseStatus('Verfügbar - Beschädigt / Beschmutzt')).toEqual({ state: 'Verfügbar', due: undefined, notes: ['Beschädigt / Beschmutzt'] })
    expect(parseStatus('Verfügbar')).toEqual({ state: 'Verfügbar', due: undefined, notes: [] })
  })

  it('does not treat a note that says "ausleihbar" as available', () => {
    const [item] = filterAndEnrichBranches([{
      libraryName: 'ZLB: Amerika-Gedenkbibliothek (AGB)',
      status: 'Ausgeliehen - Fällig am: 27.10.2026 - Das Beiheft ist getrennt ausleihbar.'
    } as AvailabilityInfo])
    expect(item.daysToWait).not.toBe(-999)
    expect(calculateBranchStatus(item, false).tone).toBe('wait')
  })

  it('shows only the state in the pill, the notes are shown separately', () => {
    const label = calculateBranchStatus(branch({ status: 'Verfügbar - Beschädigt / Beschmutzt' }), false).label
    expect(label).toBe('Verfügbar')
  })
})

describe('splitLibraryName', () => {
  it('splits the district prefix from the name', () => {
    expect(splitLibraryName('Mitte: Bezirkszentralbibliothek Philipp Schaeffer')).toEqual({ district: 'Mitte', name: 'Bezirkszentralbibliothek Philipp Schaeffer' })
    expect(splitLibraryName('Friedrichshain-Kreuzberg: Mittelpunktbibliothek Wilhelm Liebknecht / Namik Kemal').district).toBe('Friedrichshain-Kreuzberg')
    expect(splitLibraryName('Fahrbibliothek')).toEqual({ name: 'Fahrbibliothek' })
  })
})

describe('due date across a DST change', () => {
  it('counts whole days even when the clocks change in between', () => {
    const RealDate = Date
    // 16.10.2026 12:00 local, the clocks go back on 25.10.2026
    const fixed = new RealDate(2026, 9, 16, 12, 0, 0).getTime()
    globalThis.Date = class extends RealDate {
      constructor(...args: any[]) { super(...(args.length ? args as [any] : [fixed])) }
      static now() { return fixed }
    } as DateConstructor
    try {
      const [item] = filterAndEnrichBranches([{ libraryName: 'ZLB: Amerika-Gedenkbibliothek (AGB)', status: 'Ausgeliehen - Fällig am: 27.10.2026' } as AvailabilityInfo])
      expect(item.daysToWait).toBe(11)
    } finally {
      globalThis.Date = RealDate
    }
  })
})
