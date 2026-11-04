// Server side of covers: reading the id from a result row, fetching the image from VÖBB, cache headers.
import type { Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';
import { COVER_SIZES, isCoverId, parseCoverId } from '../../utils/cover';

// The cover is not inside the row's grid wrapper but in the sibling before it
export function coverIdOfRow(rowContainer: Cheerio<AnyNode>): string | undefined {
  return parseCoverId(rowContainer.prev('.rList_cover').find('img').attr('data-src'));
}

// VÖBB's cover service answers 403 unless the Referer is an aDISWeb page (hotlink protection); with
// one it needs no cookies. Every other case (no Referer, the bare host) is refused.
const REFERER = 'https://www.voebb.de/aDISWeb/app/prod00';
// Stays below Vercel's 10 s function limit; a cover is small, VÖBB answers in about 0.2 s
const TIMEOUT_MS = 4000;

export type CoverResult =
  | { status: 'ok'; contentType: string; body: ArrayBuffer }
  // VÖBB has no image for this id (404): the id is in the result row, the image is not always behind it
  | { status: 'missing' }
  | { status: 'invalid' }
  // Refused, timed out, maintenance page, ...: says nothing about the cover, so it must not be cached
  | { status: 'error' };

interface RawResponse {
  status: number;
  headers: Headers;
  _data?: ArrayBuffer;
}

type RawFetch = (url: string, options: Record<string, any>) => Promise<RawResponse>;

const rawFetch: RawFetch = (url, options) => $fetch.raw(url, options) as Promise<RawResponse>;

export async function fetchCover(id: string, size: string, get: RawFetch = rawFetch): Promise<CoverResult> {
  if (!isCoverId(id) || !(COVER_SIZES as readonly string[]).includes(size)) return { status: 'invalid' };

  try {
    const res = await get(`https://www.voebb.de/vlb/cover/${id}/${size}`, {
      headers: { Referer: REFERER },
      responseType: 'arrayBuffer',
      // 4xx/5xx come back as a status instead of throwing, we sort them ourselves
      ignoreResponseError: true,
      timeout: TIMEOUT_MS
    });
    if (res.status === 404) return { status: 'missing' };

    const contentType = res.headers.get('content-type') ?? '';
    // A 200 that is not an image is VÖBB's maintenance page or an error page
    if (res.status !== 200 || !contentType.startsWith('image/') || !res._data) return { status: 'error' };
    return { status: 'ok', contentType, body: res._data };
  } catch {
    return { status: 'error' };
  }
}

const DAY = 86400;

// VÖBB itself sends no-store, so we say how long the CDN may keep an answer. "No cover" is kept for
// a shorter time so a cover VÖBB adds later shows up; a failure is never kept.
export function coverCacheHeaders(status: 'ok' | 'missing' | 'error'): Record<string, string> {
  if (status === 'ok') return { 'Cache-Control': `public, max-age=${7 * DAY}, s-maxage=${30 * DAY}, stale-while-revalidate=${30 * DAY}` };
  if (status === 'missing') return { 'Cache-Control': `public, max-age=${DAY}, s-maxage=${DAY}` };
  return { 'Cache-Control': 'no-store' };
}
