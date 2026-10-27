// Language handling for the detail page (the filter's language list is utils/filterOptions.ts)

// The detail page lists several languages as "Deutsch ; Englisch"
export function parseLanguages(raw: string | undefined): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(';').map(l => l.trim()).filter(Boolean))];
}

// "Deutsch · Englisch". Long lists (DVDs with many audio tracks) are cut after four.
export function formatLanguageLine(languages: string[] | undefined): string {
  if (!languages?.length) return '';
  const more = languages.length > 4 ? ` · +${languages.length - 4}` : '';
  return `${languages.slice(0, 4).join(' · ')}${more}`;
}
