// Dev-only fixtures for /api/detail, for working on the detail page while voebb.de is down.
// Switched on with MOCK_VOEBB=1 in .env (see CLAUDE.md). Raw rows go through the same
// filterAndEnrichBranches as scraped ones, so the status/name parsing is exercised too.
import { filterAndEnrichBranches } from '../../utils/availability'
import type { MediaItem, AvailabilityInfo } from '../../types/types'

// "Fällig am: 27.10.2026" for today + n days, so the fixtures never go stale
function due(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `Fällig am: ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

type Raw = Pick<AvailabilityInfo, 'libraryName' | 'status' | 'shelfmark' | 'access'>
type Fixture = Omit<MediaItem, 'id' | 'availability'> & { availability: Raw[] }

const fixtures: Record<string, Fixture> = {
  // Typical book: several branches, free and on loan, one with a short note
  '34112359': {
    title: 'Ein einfaches Leben : Roman',
    mediaType: 'Buch',
    author: 'Min Jin Lee',
    year: '2018',
    isbn: '9783423289726',
    languages: ['Deutsch'],
    availability: [
      { libraryName: 'Mitte: Bezirkszentralbibliothek Philipp Schaeffer', status: 'Verfügbar', shelfmark: 'Roman Lee' },
      { libraryName: 'Mitte: Hansabibliothek', status: `Ausgeliehen - ${due(5)}`, shelfmark: 'Roman Lee' },
      { libraryName: 'Friedrichshain-Kreuzberg: Mittelpunktbibliothek Wilhelm Liebknecht / Namik Kemal', status: 'Verfügbar - Beschädigt / Beschmutzt', shelfmark: 'Roman Lee' },
      { libraryName: 'ZLB: Amerika-Gedenkbibliothek (AGB)', status: 'Verfügbar', shelfmark: '108/000 270 755' },
      { libraryName: 'ZLB: Amerika-Gedenkbibliothek (AGB)', status: `Ausgeliehen - ${due(26)}`, shelfmark: 'L 782 Lee M 50 f' },
      { libraryName: 'Neukoelln: Helene-Nathan-Bibliothek', status: `Ausgeliehen - ${due(-3)}`, shelfmark: 'Roman Lee' },
      { libraryName: 'Pankow: Kurt-Tucholsky-Bibliothek (Pankow)', status: 'Verfügbar', shelfmark: 'Roman Lee' },
      { libraryName: 'Spandau: Hauptbibliothek Spandau', status: `Ausgeliehen - ${due(12)}`, shelfmark: 'Roman Lee' },
      { libraryName: 'Tempelhof-Schoeneberg: Bezirkszentralbibliothek Tempelhof-Schöneberg', status: 'Bestellt', shelfmark: 'Roman Lee' }
    ]
  },
  // Long free-text note next to a due date (a note says "ausleihbar" but the copy is on loan)
  '34758158': {
    title: 'Dune : der Wüstenplanet',
    mediaType: 'Ultra HD Blu-ray',
    author: 'David Lynch',
    year: '2021',
    availability: [
      { libraryName: 'ZLB: Amerika-Gedenkbibliothek (AGB)', status: `Ausgeliehen - ${due(11)} - Das Beiheft ist unter derselben Grundsignatur getrennt ausleihbar.`, shelfmark: 'Film 10 Ly 5 a:BD/4K.BD' }
    ]
  },
  // Reading-room-only copy plus a closed-stacks copy that has to be ordered (see the access note)
  '15180452': {
    title: 'Carl Vogt : seine Entwicklung vom angehenden naturwissenschaftlichen Materialisten zum idealen Politiker der Paulskirche ; (1817 - 1848)',
    mediaType: 'Band',
    author: 'Hermann Misteli',
    year: '1938',
    availability: [
      { libraryName: 'ZLB: Berlin-Sammlungen', status: 'Verfügbar', shelfmark: 'KucLa 3309', access: 'reading-room' },
      { libraryName: 'ZLB: Amerika-Gedenkbibliothek (AGB)', status: 'Verfügbar', shelfmark: '112/000 041 487', access: 'order-only' }
    ]
  },
  '00224031': {
    title: 'Neuromancer',
    mediaType: 'CD',
    author: 'William Gibson',
    year: '2003',
    isbn: '3898132595',
    languages: ['Deutsch', 'Englisch'],
    availability: [
      { libraryName: 'ZLB: Amerika-Gedenkbibliothek (AGB)', status: 'Verfügbar', shelfmark: '112/000 041 487' },
      { libraryName: 'Mitte: Hansabibliothek', status: 'Verfügbar', shelfmark: 'Hörbuch' }
    ]
  },
  // Edge case: nothing found
  '00000001': {
    title: 'Ein Titel ohne Exemplare',
    mediaType: 'Buch',
    author: 'Erika Mustermann',
    year: '2020',
    availability: []
  },
  // Edge case: very long title, no author, no ISBN, no shelf marks
  '00000002': {
    title: 'Handbuch der angewandten Bibliothekswissenschaft und Informationspraxis : eine umfassende Einführung in Katalogisierung, Erschließung, Bestandsaufbau und Benutzerberatung für Studierende, Praktiker und Quereinsteiger',
    mediaType: 'Buch',
    year: '2019',
    availability: [
      { libraryName: 'Mitte: Hansabibliothek', status: 'Verfügbar' },
      { libraryName: 'ZLB: Amerika-Gedenkbibliothek (AGB)', status: `Ausgeliehen - ${due(4)}` }
    ]
  }
}

/** Fixture for the id, or the typical book for any other id so every /media/<id> link works. */
export function getMockDetail(id: string) {
  const fixture = fixtures[id] ?? fixtures['34112359']
  return {
    success: true,
    data: {
      ...fixture,
      id,
      availability: filterAndEnrichBranches(fixture.availability as AvailabilityInfo[])
    } as MediaItem
  }
}
