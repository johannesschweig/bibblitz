// utils/mediaTypeMapping.ts
export interface MediaTypeConfig {
  label: string
  icon: string
}

const ICON_BASE = 'https://www.voebb.de/aDISWeb_kopac86/img/medien/'

export const MEDIA_TYPE_MAP: Record<string, MediaTypeConfig> = {
  // Books
  'buch': { label: 'Buch', icon: `${ICON_BASE}buch.svg` },
  'band': { label: 'Buch', icon: `${ICON_BASE}buch.svg` },
  'hochschulschrift': { label: 'Buch', icon: `${ICON_BASE}buch.svg` },
  'noten': { label: 'Noten', icon: `${ICON_BASE}noten.svg` },
  // Games
  'spiel': { label: 'Spiel', icon: `${ICON_BASE}brettspiel.svg` },
  'konventionelles spiel': { label: 'Spiel', icon: `${ICON_BASE}brettspiel.svg` },
  'konsolenspiel': { label: 'Konsolenspiel', icon: `${ICON_BASE}konsolenspiel.svg` },
  // Film
  'dvd': { label: 'DVD', icon: `${ICON_BASE}dvd.svg` },
  'dvd-rom': { label: 'DVD', icon: `${ICON_BASE}dvd.svg` },
  'blu-ray': { label: 'Blu-ray', icon: `${ICON_BASE}bluray.svg` },
  'blu-ray disc': { label: 'Blu-ray', icon: `${ICON_BASE}bluray.svg` },
  'ultra hd': { label: 'Blu-ray', icon: `${ICON_BASE}bluray.svg` },
  'ultra hd blu-ray': { label: 'Blu-ray', icon: `${ICON_BASE}bluray.svg` },
  'video': { label: 'Video', icon: `${ICON_BASE}video.svg` },
  // Music
  'cd': { label: 'CD', icon: `${ICON_BASE}cd.svg` },
  'schallplatte': { label: 'Schallplatte', icon: `${ICON_BASE}lp.svg` },
  'mp3': { label: 'MP3', icon: `${ICON_BASE}mp3.svg` },
  // Digital
  'e-ressource': { label: 'E-Ressource', icon: `${ICON_BASE}eressource.svg` },
  // Other
  'medienkombination': { label: 'Medienpaket', icon: `${ICON_BASE}medienkombination.svg` },
  'medienpaket': { label: 'Medienpaket', icon: `${ICON_BASE}medienkombination.svg` },
  'karte/plan': { label: 'Karte', icon: `${ICON_BASE}karte.svg` },
  'gerät': { label: 'Gerät', icon: `${ICON_BASE}datentraeger.svg` },
  'plastik': { label: 'Objekt', icon: `${ICON_BASE}plastik.svg` },
}

const FALLBACK: MediaTypeConfig = { label: 'Sonstiges', icon: '' }

export function getMediaTypeConfig(raw: string): MediaTypeConfig {
  const key = raw.toLowerCase().trim()
  const result = MEDIA_TYPE_MAP[key]
  if (!result) console.log(`No match: "${key}"`, JSON.stringify(key))
  return result ?? FALLBACK
}