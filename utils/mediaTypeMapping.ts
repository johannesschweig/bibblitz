// utils/mediaTypeMapping.ts
export interface MediaTypeConfig {
  label: string
  icon: string
}

export const MEDIA_TYPE_MAP: Record<string, MediaTypeConfig> = {
  // Books
  'buch': { label: 'Buch', icon: 'lucide:book' },
  'band': { label: 'Buch', icon: 'lucide:book' },
  'hochschulschrift': { label: 'Buch', icon: 'lucide:book' },
  'noten': { label: 'Noten', icon: 'lucide:music' },
  // Games
  'spiel': { label: 'Gesellschaftsspiel', icon: 'lucide:dices' },
  'konventionelles spiel': { label: 'Gesellschaftsspiel', icon: 'lucide:dices' },
  'konsolenspiel': { label: 'Konsolenspiel', icon: 'lucide:gamepad-2' },
  // Film
  'dvd': { label: 'DVD', icon: 'lucide:clapperboard' },
  'dvd-rom': { label: 'DVD', icon: 'lucide:clapperboard' },
  'blu-ray': { label: 'Blu-ray', icon: 'lucide:clapperboard' },
  'blu-ray disc': { label: 'Blu-ray', icon: 'lucide:clapperboard' },
  'ultra hd': { label: 'Blu-ray', icon: 'lucide:clapperboard' },
  'ultra hd blu-ray': { label: 'Blu-ray', icon: 'lucide:clapperboard' },
  'video': { label: 'Video', icon: 'lucide:clapperboard' },
  // Music
  'cd': { label: 'CD', icon: 'lucide:disc-3' },
  'schallplatte': { label: 'Schallplatte', icon: 'lucide:disc-album' },
  'mp3': { label: 'MP3', icon: 'lucide:file-audio' },
  // Digital
  'e-ressource': { label: 'E-Ressource', icon: 'lucide:globe' },
  // Other
  'medienkombination': { label: 'Medienpaket', icon: 'lucide:package' },
  'medienpaket': { label: 'Medienpaket', icon: 'lucide:package' },
  'karte/plan': { label: 'Karte', icon: 'lucide:map' },
  'gerät': { label: 'Gerät', icon: 'lucide:tablet-smartphone' },
  'plastik': { label: 'Objekt', icon: 'lucide:box' },
}

const FALLBACK: MediaTypeConfig = { label: 'Sonstiges', icon: 'lucide:file-question-mark' }

// Types already reported, so a new VÖBB type shows up in the logs once and not on every render
const reportedTypes = new Set<string>()

export function getMediaTypeConfig(raw: string): MediaTypeConfig {
  const key = raw.toLowerCase().trim()
  const result = MEDIA_TYPE_MAP[key]
  // An empty type is normal: rows render on the server before their record data has arrived (the
  // showcase tiles on the home page), and it used to flood the Fly logs (TODO I32). Only a real,
  // unknown VÖBB type is worth a line.
  if (!result && key && !reportedTypes.has(key)) {
    reportedTypes.add(key)
    console.warn(`[mediaType] no mapping for "${key}", shown as "${FALLBACK.label}"`)
  }
  return result ?? FALLBACK
}