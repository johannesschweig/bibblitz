// Cover ids and URLs, shared by the search route (reads the id of a result row), the cover proxy
// route (validates what it is asked for) and the UI. VÖBB identifies a cover by the ISBN-13
// (books) or EAN of the record, bare digits.
import { normalizeIsbn, toIsbn13 } from './isbn';

export type CoverSize = 's' | 'm';

// Pixel sizes VÖBB serves: s is about 5 kB (result rows), m about 18 kB (detail page)
export const COVER_SIZES: readonly CoverSize[] = ['s', 'm'];

// The id of a result row is in its lazy-loaded image: ".../vlb/cover/9783257056082/s". Rows without
// a cover point at a local placeholder (cover-bg.svg) instead.
export function parseCoverId(src: string | undefined): string | undefined {
  return src?.match(/\/vlb\/cover\/(\d{13}|\d{9}[\dX])\//)?.[1];
}

// ISBN-13/EAN or ISBN-10, bare. Anything else must never end up in the VÖBB URL.
export function isCoverId(id: string): boolean {
  return /^(\d{13}|\d{9}[\dX])$/.test(id);
}

// The detail page has no result row, but it has the ISBN (usually the id VÖBB uses, in the form of the ISBN-13)
export function coverIdFor(item: { coverId?: string; isbn?: string }): string | undefined {
  if (item.coverId) return item.coverId;
  const isbn = item.isbn ? normalizeIsbn(item.isbn) : null;
  return isbn ? toIsbn13(isbn) : undefined;
}

// Always our own route: the browser never talks to voebb.de (GDPR, and VÖBB refuses foreign Referers)
export function coverSrc(id: string, size: CoverSize): string {
  return `/api/cover/${id}?size=${size}`;
}
