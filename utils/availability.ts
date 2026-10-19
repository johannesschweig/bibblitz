// utils/availability.ts
import libraryData from '~/assets/libraries.json'
import { calculateHaversineDistance } from './distance'
import type { AvailabilityInfo } from '../types/types'

// Interfaces
// near = available close by (strongest green), good = available further away,
// wait = on loan, hard = hard to get, bad = not in stock, neutral = unknown
export type StatusTone = 'near' | 'good' | 'wait' | 'hard' | 'bad' | 'neutral'

export interface StatusBadgeConfig {
  label: string;
  tone: StatusTone;
}

// Branches closer than this count as "in deiner Nähe"
export const NEAR_KM = 3

/**
 * Private helper: cleans up the scraped library name
 * and finds the matching entry in libraries.json
 */
function findMatchingLibrary(branch: string) {
  const normalize = (name: string) => name
    .replace(/[\s\u00a0]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\bbibl\./g, 'bibliothek') // libraries.json abbreviates "Bibl. Reinickendorf - West"

  const parts = branch.split(':')
  const rawBranchName = normalize((parts.length > 1 ? parts[1] : parts[0]) || '')

  // A " - " can start a closure notice, but also be part of the name ("Reinickendorf - West"),
  // so try the full name first and only then the shortened one
  const candidates = [...new Set([rawBranchName, rawBranchName.split(' - ')[0]!.trim()])].filter(Boolean)
  const libraries = libraryData.map(lib => ({ lib, name: normalize(lib.name) }))

  for (const candidate of candidates) {
    const exact = libraries.find(l => l.name === candidate)
    if (exact) return exact.lib
  }
  for (const candidate of candidates) {
    // Several names can contain each other ("Reinickendorf"): the longest, most specific one wins
    const fuzzy = libraries
      .filter(l => candidate.includes(l.name) || l.name.includes(candidate))
      .sort((a, b) => b.name.length - a.name.length)[0]
    if (fuzzy) return fuzzy.lib
  }
  return undefined
}

/**
 * Splits a VÖBB branch status like "Ausgeliehen - Fällig am: 27.10.2026 - Das Beiheft ist ..."
 * into the actual state, the due date and free-text notes. Only the state and the due date
 * may decide availability: notes can contain words like "ausleihbar" that mean something else.
 */
export function parseStatus(status: string): { state: string, due?: string, notes: string[] } {
  const [state = '', ...rest] = status.split(/\s+-\s+/).map(part => part.trim()).filter(Boolean)
  const due = rest.find(part => /^fällig am/i.test(part))
  return { state, due, notes: rest.filter(part => part !== due) }
}

/**
 * Splits the scraped library name "Mitte: Bezirkszentralbibliothek Philipp Schaeffer" into
 * district and name, so long names stay readable.
 */
export function splitLibraryName(libraryName: string): { district?: string, name: string } {
  const idx = libraryName.indexOf(': ')
  if (idx <= 0) return { name: libraryName }
  return { district: libraryName.slice(0, idx).trim(), name: libraryName.slice(idx + 2).trim() }
}

/**
 * Private helper: calculates the remaining days from the VÖBB status (year: 2026)
 */
function calculateDaysToWait(status: string): number {
  const { state, due } = parseStatus(status)
  const cleanStatus = state.toLowerCase()

  // Case 1: available now
  if (
    cleanStatus.includes('verfügbar') ||
    cleanStatus.includes('am regal') ||
    cleanStatus.includes('ausleihbar')
  ) {
    return -999
  }

  // Case 2: specific due date parsed (e.g. "Fällig am: 14.08.2026" or "Fällig am: 05.11.")
  const dateMatch = `${state} ${due ?? ''}`.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})?/)
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10)
    const month = parseInt(dateMatch[2], 10) - 1 // JS months are 0-based
    const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : 2026 // Fall back to the current year 2026

    const returnDate = new Date(year, month, day)
    const today = new Date()

    returnDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)

    const diffTime = returnDate.getTime() - today.getTime()
    // round, not ceil: a DST change between today and the due date adds an hour
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  }

  // Case 3: reserved / on order without a specific date
  if (
    cleanStatus.includes('vorbestellt') ||
    cleanStatus.includes('entleihen') ||
    cleanStatus.includes('reserviert')
  ) {
    return 14 // Flat estimate
  }

  return 999 // Unknown / lost / not on the shelf
}

function formatDays(days: number): string {
  return days === 0 ? 'heute fällig' : days === 1 ? '1 Tag' : `${days} Tage`
}

/**
 * Status pill for a single branch on the detail page
 */
export function calculateBranchStatus(
  branch: AvailabilityInfo,
  userZipDefault: boolean
): StatusBadgeConfig {
  const days = branch.daysToWait

  if (days === -999) {
    const isNear = !userZipDefault && branch.distance !== undefined && branch.distance < NEAR_KM
    return { label: parseStatus(branch.status).state, tone: isNear ? 'near' : 'good' }
  }
  if (days === undefined || days === 999) return { label: parseStatus(branch.status).state, tone: 'neutral' }
  if (days < 0) return { label: 'Rückgabe überfällig', tone: 'wait' }
  return { label: days === 0 ? 'Rückgabe heute fällig' : formatDays(days), tone: 'wait' }
}

/**
 * Calculates the status pill config for the result cards
 */
export function calculateStatusInfo(
  availability: AvailabilityInfo[] | undefined,
  userCoords: { lat: number; lon: number } | null | undefined,
  userZipDefault: boolean
): StatusBadgeConfig {

  const sortedAvailability = sortBranchesByDistance(availability, userCoords)
  // 1. Filter out invalid/lost copies
  const validBranches = sortedAvailability?.filter(item => {
    const lower = item.status.toLowerCase()
    return !lower.includes('nicht im regal') && !lower.includes('verloren') && !lower.includes('vermisst')
  }) || []

  // Fallback: no valid branches left
  if (validBranches.length === 0) {
    return { label: 'Nicht im Bestand', tone: 'bad' }
  }

  if (userZipDefault) {
    const avail = validBranches.filter(item => item.daysToWait === -999).length
    if (avail > 0) {
      return {
        label: avail === 1 ? 'Verfügbar' : `Verfügbar (${avail}x)`,
        tone: 'good'
      }
    } else {
      return { label: 'Aktuell ausgeliehen', tone: 'wait' }
    }
  } else {
    // Helper for safe distances
    const getDist = (b: any) => b.distance ?? 99

    // 1. Filter the data up front
    const available = validBranches.filter(b => b.daysToWait === -999)
    // daysToWait 0 = due back today, still counts as on loan
    const borrowed = validBranches.filter(b => b.daysToWait !== undefined && b.daysToWait >= 0 && b.daysToWait !== 999)
    const minDays = (branches: AvailabilityInfo[]) => Math.min(...branches.map(b => b.daysToWait as number))

    // -------------------------------------------------------------
    // PRIO 1: available & close (< NEAR_KM)
    // -------------------------------------------------------------
    const closeAvailable = available.filter(b => getDist(b) < NEAR_KM)
    if (closeAvailable.length > 0) {
      return {
        label: closeAvailable.length === 1
          ? 'Verfügbar in deiner Nähe'
          : `Verfügbar in deiner Nähe (${closeAvailable.length}x)`,
        tone: 'near'
      }
    }

    // -------------------------------------------------------------
    // PRIO 2: available & further away (NEAR_KM to < 7 km)
    // -------------------------------------------------------------
    const farAvailable = available.filter(b => getDist(b) >= NEAR_KM && getDist(b) < 7)
    if (farAvailable.length > 0) {
      const closestDistance = Math.ceil(Math.min(...farAvailable.map(getDist)))
      return {
        label: farAvailable.length === 1
          ? `Verfügbar (${closestDistance} km)`
          : `Verfügbar (${closestDistance} km, ${farAvailable.length}x)`,
        tone: 'good'
      }
    }

    // -------------------------------------------------------------
    // PRIO 3: on loan & close (< NEAR_KM)
    // -------------------------------------------------------------
    const closeBorrowed = borrowed.filter(b => getDist(b) < NEAR_KM)
    if (closeBorrowed.length > 0) {
      return { label: `Ausgeliehen (${formatDays(minDays(closeBorrowed))})`, tone: 'wait' }
    }

    // -------------------------------------------------------------
    // PRIO 4: on loan & further away (NEAR_KM to < 7 km)
    // -------------------------------------------------------------
    const farBorrowed = borrowed.filter(b => getDist(b) >= NEAR_KM && getDist(b) < 7)
    if (farBorrowed.length > 0) {
      return { label: `Ausgeliehen (${formatDays(minDays(farBorrowed))})`, tone: 'wait' }
    }

    // -------------------------------------------------------------
    // FALLBACK: nothing matches (or everything is more than 7 km away)
    // -------------------------------------------------------------
    return { label: 'Schwer zu bekommen', tone: 'hard' }
  }

}

/**
 * Filters out invalid entries, enriches them with geo data & calculated wait time
 * and sorts the libraries by distance
 */
export function filterAndEnrichBranches(rawAvailability: AvailabilityInfo[]): AvailabilityInfo[] {
  return rawAvailability
    .map(item => {
      const matchedLibrary = findMatchingLibrary(item.libraryName)
      const sortIndex = matchedLibrary ? libraryData.indexOf(matchedLibrary) : -1
      const daysToWait = calculateDaysToWait(item.status)

      return {
        ...item,
        libraryId: matchedLibrary?.id,
        daysToWait,
        sortIndex
      }
    })
    // Keep only libraries that could be matched
    .filter(item => item.sortIndex !== -1)
    // Remove the temporary helper field 'sortIndex'
    .map(({ sortIndex, ...cleanItem }) => cleanItem)
}

export function sortBranchesByDistance(availability: AvailabilityInfo[], userCoords: { lat: number; lon: number }): AvailabilityInfo[] {
  const mappedAvailability = availability.map(item => {

    const library = libraryData.find(lib => lib.id === item.libraryId)
    const { lat, lon } = library || { lat: undefined, lon: undefined }
    if (lat === undefined || lon === undefined) {
      return {
        ...item,
        distance: undefined
      }
    }
    const distance = calculateHaversineDistance(userCoords.lat, userCoords.lon, lat, lon)

    return {
      ...item,
      distance: distance !== undefined ? Math.round(distance * 10) / 10 : undefined
    };
  });

  return mappedAvailability.sort((a, b) => {
    const distA = a.distance ?? 999;
    const distB = b.distance ?? 999;

    return distA - distB; // Shortest distance first
  });
}