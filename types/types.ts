export interface AvailabilityInfo {
  libraryName: string;
  libraryId?: string;
  status: string;
  shelfmark?: string;
  distance?: number;
  daysToWait?: number;
}

export interface MediaItem {
  id: string;
  title: string;
  author?: string;
  year?: string;
  platform?: string;
  isbn?: string;
  mediaType: string;
  availability?: AvailabilityInfo[];
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