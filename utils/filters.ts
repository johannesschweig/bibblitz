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

export function sameSelection(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
}
