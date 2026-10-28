// Shared by the search route and the filter UI: a filter is a list of labels (?lang=Englisch&type=Buch).

export const MAX_FILTER_VALUES = 5;

// ?lang=Deutsch,Englisch (or repeated ?lang=…) -> ['Deutsch', 'Englisch']
export function parseFilterParam(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  const labels = values
    .flatMap(v => (typeof v === 'string' ? v.split(',') : []))
    .map(v => v.trim())
    .filter(Boolean);
  return [...new Set(labels)].slice(0, MAX_FILTER_VALUES);
}

// Chip labels that were renamed: links, bookmarks and the Umami history still carry the old one
const RENAMED_MEDIA_TYPES: Record<string, string> = { Spiel: 'Gesellschaftsspiel' };

// ?type=Spiel (old) or ?type=Gesellschaftsspiel -> ['Gesellschaftsspiel']
export function parseMediaTypeParam(value: unknown): string[] {
  return [...new Set(parseFilterParam(value).map(label => RENAMED_MEDIA_TYPES[label] ?? label))];
}

export function sameSelection(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
}
