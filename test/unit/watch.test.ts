// Shelf watch: grouping the copies of a record by library, the "nearby" choice and the preselection.
import { describe, it, expect } from 'vitest'
import type { AvailabilityInfo } from '../../types/types'
import { isLostCopy } from '../../utils/availability'
import {
  groupWatchLibraries, watchableLibraries, nearLibraryIds, defaultWatchSelection, nothingFreeNear, isValidEmail
} from '../../utils/watch'

const FREE = -999

const copy = (libraryId: string | undefined, daysToWait: number | undefined, distance?: number, status = 'Ausgeliehen'): AvailabilityInfo => ({
  libraryId, libraryName: `Bezirk: ${libraryId}`, status, daysToWait, distance
})

describe('groupWatchLibraries', () => {
  it('makes one entry per library, in the order of the first copy', () => {
    const libraries = groupWatchLibraries([copy('a', 5, 1), copy('b', 2, 2), copy('a', 9, 1)])
    expect(libraries.map(l => l.libraryId)).toEqual(['a', 'b'])
  })

  it('counts a library as free when any of its copies is free, and shows that copy', () => {
    const [library] = groupWatchLibraries([copy('a', 5, 1), copy('a', FREE, 1, 'Verfügbar')])
    expect(library!.free).toBe(true)
    expect(library!.best.daysToWait).toBe(FREE)
  })

  it('shows the copy that is back first when none is free, an overdue one before a dated one', () => {
    const [dated] = groupWatchLibraries([copy('a', 9, 1), copy('a', 3, 1)])
    expect(dated!.free).toBe(false)
    expect(dated!.best.daysToWait).toBe(3)

    const [overdue] = groupWatchLibraries([copy('a', 3, 1), copy('a', -2, 1)])
    expect(overdue!.best.daysToWait).toBe(-2)
  })

  it('puts a copy without a date after the ones with a due date', () => {
    const [library] = groupWatchLibraries([copy('a', undefined, 1), copy('a', 20, 1)])
    expect(library!.best.daysToWait).toBe(20)
  })

  it('leaves out copies of unknown libraries and lost copies', () => {
    const libraries = groupWatchLibraries([
      copy(undefined, FREE),
      copy('lost', 999, 1, 'Verloren'),
      copy('gone', 999, 1, 'Nicht im Regal'),
      copy('ok', 4, 2)
    ])
    expect(libraries.map(l => l.libraryId)).toEqual(['ok'])
  })
})

describe('isLostCopy', () => {
  it.each(['Verloren', 'Vermisst', 'Nicht im Regal', 'nicht im regal - gesucht'])('%s is lost', (status) => {
    expect(isLostCopy(status)).toBe(true)
  })
  it.each(['Verfügbar', 'Ausgeliehen - Fällig am: 01.01.2027', 'Bestellt'])('%s is not', (status) => {
    expect(isLostCopy(status)).toBe(false)
  })
})

describe('watchableLibraries and nearLibraryIds', () => {
  const libraries = groupWatchLibraries([
    copy('free-near', FREE, 1, 'Verfügbar'),
    copy('loan-near', 4, 1.2),
    copy('loan-edge', 4, 3),
    copy('loan-far', 4, 8)
  ])

  it('offers only libraries without a free copy', () => {
    expect(watchableLibraries(libraries).map(l => l.libraryId)).toEqual(['loan-near', 'loan-edge', 'loan-far'])
  })

  it('counts "nearby" as closer than 3 km, free libraries excluded', () => {
    expect(nearLibraryIds(libraries)).toEqual(['loan-near'])
  })
})

describe('defaultWatchSelection', () => {
  it('selects nothing while the default ZIP is in use', () => {
    const libraries = groupWatchLibraries([copy('a', 4, 1), copy('b', 4, 2)])
    expect(defaultWatchSelection(libraries, true)).toEqual([])
  })

  it('selects the waitable libraries within 3 km once a ZIP is saved', () => {
    const libraries = groupWatchLibraries([copy('a', 4, 1), copy('b', 4, 2.9), copy('c', 4, 3.5), copy('d', FREE, 0.5, 'Verfügbar')])
    expect(defaultWatchSelection(libraries, false)).toEqual(['a', 'b'])
  })

  it('falls back to the three nearest waitable libraries when none is within 3 km', () => {
    const libraries = groupWatchLibraries([
      copy('far5', 4, 9), copy('far1', 4, 4), copy('far2', 4, 5), copy('far3', 4, 6), copy('free', FREE, 3.5, 'Verfügbar')
    ])
    expect(defaultWatchSelection(libraries, false)).toEqual(['far1', 'far2', 'far3'])
  })

  it('takes fewer than three when there are fewer', () => {
    const libraries = groupWatchLibraries([copy('only', 4, 7)])
    expect(defaultWatchSelection(libraries, false)).toEqual(['only'])
  })
})

describe('nothingFreeNear', () => {
  const libraries = (...c: AvailabilityInfo[]) => groupWatchLibraries(c)

  it('says nothing while the default ZIP is in use, near cannot be told then', () => {
    expect(nothingFreeNear(libraries(copy('a', 4, 1)), true)).toBe(false)
  })

  it('is true with a saved ZIP and no free copy within 3 km', () => {
    expect(nothingFreeNear(libraries(copy('a', 4, 1), copy('b', FREE, 6, 'Verfügbar')), false)).toBe(true)
  })

  it('is false when a copy is free within 3 km', () => {
    expect(nothingFreeNear(libraries(copy('a', 4, 1), copy('b', FREE, 2, 'Verfügbar')), false)).toBe(false)
  })
})

describe('isValidEmail', () => {
  it.each(['name@beispiel.de', ' name@beispiel.de ', 'a.b+c@mail.example.com'])('accepts %s', (value) => {
    expect(isValidEmail(value)).toBe(true)
  })
  it.each(['', 'name', 'name@', '@beispiel.de', 'name@beispiel', 'na me@beispiel.de', 'name@beispiel.d'])('rejects "%s"', (value) => {
    expect(isValidEmail(value)).toBe(false)
  })
})
