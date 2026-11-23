// Restriction from the "Bestellmöglichkeit" column that "Verfügbar" does not tell:
// reading-room = can only be used on site, order-only = closed stacks, has to be ordered first
export type CopyAccess = 'reading-room' | 'order-only';

export interface AvailabilityInfo {
  libraryName: string;
  libraryId?: string;
  status: string;
  shelfmark?: string;
  access?: CopyAccess;
  // Raw "Bestellmöglichkeit" cell; only used to judge dropped rows, removed from kept ones
  order?: string;
  distance?: number;
  daysToWait?: number;
}

// Copies VÖBB lists in libraries without public access (school libraries, "(nicht öffentlich)"),
// which are not in libraries.json and therefore not in `availability`
export interface NonPublicCopies {
  count: number;
  // how many of them VÖBB says can be ordered ("Bestellwunsch möglich")
  orderable: number;
}

export interface MediaItem {
  id: string;
  title: string;
  author?: string;
  year?: string;
  platform?: string;
  isbn?: string;
  // ISBN-13/EAN of the cover VÖBB shows in the result row (see utils/cover.ts)
  coverId?: string;
  // "Sprache" from the detail page
  languages?: string[];
  mediaType: string;
  availability?: AvailabilityInfo[];
  nonPublicCopies?: NonPublicCopies;
  loadingDetails?: boolean;
}

export interface OpeningHours {
  monday?: string | null
  tuesday?: string | null
  wednesday?: string | null
  thursday?: string | null
  friday?: string | null
  saturday?: string | null
  sunday?: string | null
}

export interface Library {
  id: string;
  name: string;
  address: string;
  district: string;
  lat: number;
  lon: number;
  phone: string;
  email: string;
  website: string
  opening_hours?: OpeningHours | null
  service_hours?: OpeningHours | null
}