// Shelf watch: which libraries a visitor can ask to be told about, and what is preselected.
// Pure functions on the branch list of the detail page, shared by the sheet, the page and the tests.
import type { AvailabilityInfo } from '../types/types'
import { NEAR_KM, isLostCopy } from './availability'

// A library with one or more copies of the record (the detail page lists one row per copy)
export interface WatchLibrary {
  libraryId: string
  libraryName: string
  distance?: number
  // At least one copy can be borrowed right now: nothing to wait for
  free: boolean
  // The copy that decides the status pill: a free one, otherwise the one back first
  best: AvailabilityInfo
}

const FREE = -999
// "Unknown" in availability.ts, sorts after every real due date
const UNKNOWN = 999

/**
 * One entry per library, in the order of the given branches (sorted by distance on the detail page).
 * Copies of unknown libraries and lost copies are left out.
 */
export function groupWatchLibraries(branches: AvailabilityInfo[]): WatchLibrary[] {
  const byLibrary = new Map<string, AvailabilityInfo[]>()
  for (const branch of branches) {
    if (!branch.libraryId || isLostCopy(branch.status)) continue
    byLibrary.set(branch.libraryId, [...(byLibrary.get(branch.libraryId) ?? []), branch])
  }

  return [...byLibrary].map(([libraryId, copies]) => {
    const free = copies.find(copy => copy.daysToWait === FREE)
    const best = free ?? copies.reduce((a, b) => (a.daysToWait ?? UNKNOWN) <= (b.daysToWait ?? UNKNOWN) ? a : b)
    return {
      libraryId,
      libraryName: best.libraryName,
      distance: best.distance,
      free: !!free,
      best
    }
  })
}

/** Libraries a visitor can still wait for: every copy is on loan, reserved or ordered */
export function watchableLibraries(libraries: WatchLibrary[]): WatchLibrary[] {
  return libraries.filter(library => !library.free)
}

function byDistance(a: WatchLibrary, b: WatchLibrary): number {
  return (a.distance ?? 999) - (b.distance ?? 999)
}

/** The "In meiner Nähe" choice: waitable libraries closer than NEAR_KM */
export function nearLibraryIds(libraries: WatchLibrary[]): string[] {
  return watchableLibraries(libraries)
    .filter(library => library.distance !== undefined && library.distance < NEAR_KM)
    .map(library => library.libraryId)
}

/**
 * What the sheet preselects. Without a saved ZIP nothing: the default ZIP is not the visitor's
 * location, so a distance from it means nothing. With one: the waitable libraries within NEAR_KM,
 * or the three nearest waitable ones when none is that close.
 */
export function defaultWatchSelection(libraries: WatchLibrary[], zipDefault: boolean): string[] {
  if (zipDefault) return []
  const near = nearLibraryIds(libraries)
  if (near.length > 0) return near
  return [...watchableLibraries(libraries)].sort(byDistance).slice(0, 3).map(library => library.libraryId)
}

/**
 * Whether the detail page should point at the watch: a saved ZIP and no free copy within NEAR_KM.
 * With the default ZIP "near" cannot be told, so the page says nothing about it.
 */
export function nothingFreeNear(libraries: WatchLibrary[], zipDefault: boolean): boolean {
  if (zipDefault) return false
  return !libraries.some(library => library.free && library.distance !== undefined && library.distance < NEAR_KM)
}

/** Same loose check a browser does for type="email"; the server and the confirmation mail do the real one */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}
