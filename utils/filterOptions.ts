// The values the filter page offers. The lists are fixed and do not depend on the search: a chip that
// came and went with the results made a chosen filter vanish when the search term changed.
//
// Languages: the three most frequent in the catalogue (measured on 27.10.2026 over six broad searches:
// roman, kinder, liebe, berlin, märchen, krimi). Spanisch and Russisch follow, but were left out on purpose.
export const LANGUAGE_OPTIONS = ['Deutsch', 'Englisch', 'Französisch'];

// Media types with copies, as chip labels (see utils/mediaTypeFacet.ts for the VÖBB values behind them).
// Not offered: e-media, series and articles (BibBlitz hides their rows), the sum "Filme", and by choice the
// catch-alls "Medienkombination" and "sonstiges Material oder Gegenstand" (a language filter still includes them).
export const MEDIA_TYPE_OPTIONS = [
  'Buch', 'DVD', 'Blu-ray', 'CD', 'Spiel', 'Konsolenspiel', 'Computerspiel', 'Noten', 'MP3', 'Kassette',
  'Schallplatte', 'Video', 'Punktschrift', 'Karte'
];
