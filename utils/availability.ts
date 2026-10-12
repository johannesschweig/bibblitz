// utils/availability.ts
import libraryData from '~/assets/libraries.json'
import { calculateHaversineDistance } from './distance'
import type { AvailabilityInfo } from '../types/types'

// Interfaces
export interface StatusBadgeConfig {
  label: string;
  color: string;
}

/**
 * Private helper: cleans up the scraped library name
 * and finds the matching entry in libraries.json
 */
function findMatchingLibrary(branch: string) {
  const parts = branch.split(':')
  const rawBranchName = parts.length > 1 ? parts[1] : parts[0]

  const cleanScrapedName = (rawBranchName || '')
    .split(' - ')[0] // Cuts off closure notices
    .replace(/[\s\u00a0]+/g, ' ')
    .trim()
    .toLowerCase()

  return libraryData.find(lib => {
    const cleanConfigName = lib.name.replace(/[\s\u00a0]+/g, ' ').trim().toLowerCase()
    return cleanScrapedName.includes(cleanConfigName) || cleanConfigName.includes(cleanScrapedName)
  })
}

/**
 * Private helper: calculates the remaining days from the VÖBB status (year: 2026)
 */
function calculateDaysToWait(status: string): number {
  const cleanStatus = status.toLowerCase().trim()

  // Case 1: available now
  if (
    cleanStatus.includes('verfügbar') ||
    cleanStatus.includes('am regal') ||
    cleanStatus.includes('ausleihbar')
  ) {
    return -999
  }

  // Case 2: specific due date parsed (e.g. "Fällig am: 14.08.2026" or "Fällig am: 05.11.")
  const dateMatch = status.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})?/)
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10)
    const month = parseInt(dateMatch[2], 10) - 1 // JS months are 0-based
    const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : 2026 // Fall back to the current year 2026

    const returnDate = new Date(year, month, day)
    const today = new Date()

    returnDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)

    const diffTime = returnDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

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

/**
 * Calculates the status badge config for the result cards/detail pages
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
    return {
      label: '🔴 Nicht im Bestand',
      color: 'text-red-800 border-red-100'
    }
  }

  // const closeAndAvailable = validBranches.filter(item => (item.distance || 99) < 3 ).filter(item => item.daysToWait === -999)
  if (userZipDefault) {
    const avail = validBranches.filter(item => item.daysToWait === -999).length
    if (avail > 0) {
      return {
        label: avail === 1 ? '🟢 Verfügbar' : `🟢 Verfügbar (${avail}x) `,
        color: 'text-green-700 border-green-200'
      }
    } else {
      return {
        label: '🟡 Aktuell ausgeliehen',
        color: 'text-yellow-800 border-yellow-300'
      }
    }
  } else {
    // Helper for safe distances
    const getDist = (b: any) => b.distance ?? 99

    // 1. Filter the data up front
    const available = validBranches.filter(b => b.daysToWait === -999)
    const borrowed = validBranches.filter(b => (b.daysToWait || 999) > 0 && b.daysToWait !== 999)

    // -------------------------------------------------------------
    // PRIO 1: available & close (< 3 km)
    // -------------------------------------------------------------
    const closeAvailable = available.filter(b => getDist(b) < 3)
    if (closeAvailable.length > 0) {
      return {
        label: closeAvailable.length === 1
          ? '🟢 Verfügbar in deiner Nähe'
          : `🟢 Verfügbar in deiner Nähe (${closeAvailable.length}x)`,
        color: 'text-emerald-800 bg-emerald-50 border-emerald-200'
      }
    }

    // -------------------------------------------------------------
    // PRIO 2: available & further away (3 to < 7 km)
    // -------------------------------------------------------------
    const farAvailable = available.filter(b => getDist(b) >= 3 && getDist(b) < 7)
    if (farAvailable.length > 0) {
      const closestDistance = Math.ceil(Math.min(...farAvailable.map(getDist)))
      return {
        label: farAvailable.length === 1
          ? `🟢 Verfügbar (${closestDistance} km)`
          : `🟢 Verfügbar (${closestDistance} km, ${farAvailable.length}x)`,
        color: 'text-emerald-700 border-emerald-200'
      }
    }

    // -------------------------------------------------------------
    // PRIO 3: on loan & close (< 3 km)
    // -------------------------------------------------------------
    const closeBorrowed = borrowed.filter(b => getDist(b) < 3)
    if (closeBorrowed.length > 0) {
      const minDays = Math.min(...closeBorrowed.map(b => b.daysToWait || 999))
      return {
        label: `⏳ Ausgeliehen (${minDays} Tage)`,
        color: 'text-yellow-800 border-yellow-300'
      }
    }

    // -------------------------------------------------------------
    // PRIO 4: on loan & further away (3 to < 7 km)
    // -------------------------------------------------------------
    const farBorrowed = borrowed.filter(b => getDist(b) >= 3 && getDist(b) < 7)
    if (farBorrowed.length > 0) {
      const minDays = Math.min(...farBorrowed.map(b => b.daysToWait || 999))
      return {
        label: `⏳ Ausgeliehen (${minDays} Tage)`,
        color: 'text-yellow-800 border-yellow-300'
      }
    }

    // -------------------------------------------------------------
    // FALLBACK: nothing matches (or everything is more than 7 km away)
    // -------------------------------------------------------------
    return {
      label: '🟠 Schwer zu bekommen',
      color: 'text-orange-700 border-orange-200'
    }
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