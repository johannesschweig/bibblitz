// Fetches one record from voebb.de and parses it (metadata + per-branch availability). Used by the
// /api/detail route and by the shelf watch (subscribe and checker), so both see the same data.
import * as cheerio from 'cheerio';
import { filterAndEnrichBranches } from '../../utils/availability';
import { cleanPartTitle, cleanAuthor, cleanContributors, parseYear } from '../../utils/catalogText';
import { parseIsbn } from '../../utils/isbn';
import { parseLanguages } from '../../utils/language';
import { parseAvailabilityTable } from '../../utils/shelfmark';
import { isMaintenancePage, parseMaintenanceUntil } from '../../utils/maintenance';
import type { MediaItem } from '../../types/types';
import { getMockDetail } from './mockDetail';

export type RecordResult =
  | { success: true, data: MediaItem }
  | { success: false, maintenance: true, until?: string }
  | { success: false, error: string, statusCode?: number };

/** `id` is the numeric VÖBB record id, already validated by the caller. */
export async function fetchRecord(id: string): Promise<RecordResult> {
  // Dev only: fixtures instead of scraping, for when voebb.de is down (see CLAUDE.md)
  if (import.meta.dev && process.env.MOCK_VOEBB === '1') return getMockDetail(id);

  const targetUrl = `https://www.voebb.de/aDISWeb/app?service=direct/0/Home/$DirectLink&sp=SPROD00&sp=SAK${id}`;

  try {
    const htmlContent = await $fetch<string>(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8',
        'Cache-Control': 'no-cache',
      },
      // Nuxt handles retries automatically in the background
      retry: 1,
      retryDelay: 300,
      timeout: 4500 // With one retry a slow VÖBB keeps the visitor waiting at most about 9 s
    });

    if (isMaintenancePage(htmlContent)) {
      return { success: false, maintenance: true, until: parseMaintenanceUntil(htmlContent) };
    }

    if (!htmlContent || !htmlContent.includes('aDISWeb')) {
      return { success: false, error: 'Unexpected page structure from VÖBB.' };
    }

    // ==========================================
    // PARSING
    // ==========================================
    const $ = cheerio.load(htmlContent);

    let mediaType: string | undefined = undefined;
    let author: string | undefined = undefined;
    let isbn: string | undefined = undefined;
    let year: string | undefined = undefined;
    // Multi-part works (e.g. the discs of a TV season)
    let work: string | undefined = undefined;
    let part: string | undefined = undefined;
    let languages: string[] = [];

    $('#R06 table.gi tr').each((_, el) => {
      const th = $(el).find('th');
      const td = $(el).find('td');
      if (th.length === 0 || td.length === 0) return;
      const leftText = th.text().trim();
      let rightText = td.text().trim().replace(/[\n\t\r]+/g, ' ').replace(/\s+/g, ' ');
      if (leftText.includes('Medienart')) {
        const bracketMatch = rightText.match(/\[(.*?)\]/);
        mediaType = bracketMatch ? bracketMatch[1].trim() : rightText;
      }
      else if (leftText.includes('Verfasser') || leftText.includes('Person')) {
        author = rightText;
      }
      else if (leftText === 'Veröffentlichung') {
        year = parseYear(rightText, { last: true });
      }
      // The same label also holds series statements in parentheses ("(¬Die¬ drei ??? ; 65)",
      // "(Panini books)"), which are not part of the title. Nested works: the first row is the closest.
      else if (leftText === 'Gesamtwerk' && !work && !rightText.startsWith('(')) {
        work = rightText;
      }
      else if (leftText === 'Band' && !part) {
        part = rightText;
      }
      else if (leftText.includes('ISBN')) {
        isbn = parseIsbn(rightText);
      }
      // Exact match: "Sprache und Schrift der Expression" etc. are other rows. "Deutsch ; Englisch"
      else if (leftText === 'Sprache' && languages.length === 0) {
        languages = parseLanguages(rightText);
      }
    });

    const mainTitle = $('.adis-maintitle .html_div, #results h2 .html_div').first();
    let titleText = mainTitle.text().trim();
    // Parts of a multi-part work can have an empty main title: then the h1 would give the page
    // name "Vollanzeige", and cleanPartTitle builds the title from the "Gesamtwerk" row instead
    if (!titleText && !(mainTitle.length && work)) {
      titleText = $('#results h2, h1').first().text().replace(/Aktuelle Seite:\s*/gi, '').trim();
    }
    titleText = titleText.replace(/[\n\t\r]+/g, ' ').replace(/\s+/g, ' ');

    // The detail title ends in "/ Autor ; Übersetzer", which is more reliable than the contributor
    // list (that one can start with the translator)
    const { title: partTitle, platform, responsibility } = cleanPartTitle(titleText, work, part);
    const cleanedTitle = partTitle || 'Unknown Title';

    // https://www.voebb.de/aDISWeb/app/prod00?sp=SAK<id>
    const permanentUrl = $('.aDISListe a:contains("Kopierlink"), a.permalink-unclicked').first().attr('href') || targetUrl;
    const mediaId = permanentUrl.match(/sp=SAK(\d+)/)?.[1];

    const availability = parseAvailabilityTable($, $('.register-table table, .rTable_table, #resptable-1').first());

    const processedAvailability = filterAndEnrichBranches(availability);

    return {
      success: true,
      data: {
        id: mediaId,
        title: cleanedTitle,
        platform,
        mediaType,
        author: cleanAuthor(responsibility) ?? cleanContributors(author),
        year,
        isbn,
        languages,
        availability: processedAvailability
      } as MediaItem
    };

  } catch (error: any) {
    return {
      success: false,
      error: `VÖBB Fetch Failed: ${error.message || error}`,
      statusCode: error.statusCode || 500
    };
  }
}
