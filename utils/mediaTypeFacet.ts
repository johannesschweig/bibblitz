// VÖBB's "Medienart" facet -> the media types BibBlitz offers as filter.
// Measured on 27.10.2026 ("harry potter", every value applied on its own):
// - E-media and series/articles have no copies to check; BibBlitz hides every result row of them
//   ("siehe Vollanzeige"), so they are neither offered nor included when a filter is applied.
// - "Filme" is the sum of the film formats, offering it next to them would double count.

// Facet value -> chip label (unknown values keep their VÖBB label). Same labels as the result rows
// (utils/mediaTypeMapping.ts), so a chip says what the rows say.
const CHIP_LABELS: Record<string, string> = {
  'Buch (Print)': 'Buch',
  'DVD-Video': 'DVD',
  'DVD-ROM': 'DVD',
  'Blu-ray Disc': 'Blu-ray',
  'Ultra HD Blu-ray': 'Blu-ray',
  'Blu-ray Audio': 'Blu-ray',
  'Konventionelles Spiel': 'Spiel',
  'Punktschrift (Kurzschrift)': 'Punktschrift',
  'Punktschrift (Vollschrift)': 'Punktschrift',
  'MC': 'Kassette',
  'Karte/Plan': 'Karte',
  'CD-ROM': 'CD'
};
const NO_COPIES = ['Elektronische Ressource', 'Reihe, mehrbändige Werke', 'Zeitschrift/Reihe', 'Aufsatz'];
const AGGREGATE_ONLY = ['Filme'];

export const isHiddenMediaType = (label: string) => label.startsWith('E-') || NO_COPIES.includes(label);
export const chipLabel = (label: string) => CHIP_LABELS[label] ?? label;

interface FacetEntry { id: string; label: string; count: number }

// Checkbox ids to submit: the facet values behind the chosen chips (none if this search has no hit of
// that type), or, without a choice, every value that has copies (which is how a language filter also drops the e-media)
export function mediaTypeFacetIds(facet: FacetEntry[], chips: string[]): string[] {
  return facet
    .filter(({ label }) => !isHiddenMediaType(label))
    .filter(({ label }) => chips.length === 0 || chips.includes(chipLabel(label)))
    .map(({ id }) => id);
}
