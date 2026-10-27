import { defineEventHandler, getQuery, createError } from 'h3';
import * as cheerio from 'cheerio';
import { filterAndEnrichBranches } from '../../utils/availability';
import { cleanTitle, cleanAuthor, cleanContributors, parseYear } from '../../utils/catalogText';
import { parseIsbn } from '../../utils/isbn';
import { parseLanguages } from '../../utils/language';
import { parseAvailabilityTable } from '../../utils/shelfmark';
import { isMaintenancePage, parseMaintenanceUntil } from '../../utils/maintenance';
import type { MediaItem } from '../../types/types';

export default defineEventHandler(async (event) => {
  const { id } = getQuery(event);

  if (!id || typeof id !== 'string' || !/^\d+$/.test(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid numeric VÖBB-ID is required.',
    });
  }

  // Dev only: fixtures instead of scraping, for when voebb.de is down (see CLAUDE.md)
  if (import.meta.dev && process.env.MOCK_VOEBB === '1') return getMockDetail(id);

  const targetUrl = `https://www.voebb.de/aDISWeb/app?service=direct/0/Home/$DirectLink&sp=SPROD00&sp=SAK${id}`;

  try {
    // Native Nuxt $fetch call, runs reliably as ESM on Vercel
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
      timeout: 4500 // Stays safely below Vercel's hard 10-second limit
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
      else if (leftText.includes('ISBN')) {
        isbn = parseIsbn(rightText);
      }
      // Exact match: "Sprache und Schrift der Expression" etc. are other rows. "Deutsch ; Englisch"
      else if (leftText === 'Sprache' && languages.length === 0) {
        languages = parseLanguages(rightText);
      }
    });

    let titleText = $('.adis-maintitle .html_div, #results h2 .html_div').first().text().trim();
    if (!titleText) {
      titleText = $('#results h2, h1').first().text().replace(/Aktuelle Seite:\s*/gi, '').trim();
    }
    titleText = titleText.replace(/[\n\t\r]+/g, ' ').replace(/\s+/g, ' ') || 'Unknown Title';

    // The detail title ends in "/ Autor ; Übersetzer", which is more reliable than the contributor
    // list (that one can start with the translator)
    const { title: cleanedTitle, platform, responsibility } = cleanTitle(titleText, { withResponsibility: true });

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
});
