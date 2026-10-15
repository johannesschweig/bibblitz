// server/api/search.get.ts
import { defineEventHandler, getQuery, createError } from 'h3';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { cleanTitle, cleanAuthor, parseYear } from '../../utils/catalogText';
import { normalizeIsbn, toIsbn13 } from '../../utils/isbn';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

interface SearchToken {
  identity: string;
  requestCount: string;
  actionUrl: string;
  cookies: object;
}

function encodeToken(token: SearchToken): string {
  return Buffer.from(JSON.stringify(token)).toString('base64url');
}

function decodeToken(token: string): SearchToken {
  return JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'));
}

// Parses the result list and the info needed to load the next page (pagination)
function parseResultsPage($: cheerio.CheerioAPI, responseUrl: string) {
  const searchResults: any[] = [];

  $('.rList_titel a').each((i, el) => {
    const titleText = $(el).text() || '';
    const href = $(el).attr('href') || '';
    const idMatch = href.match(/SAK(\d+)/);
    const id = idMatch ? idMatch[1] : '';

    if (!id) return;

    const rowContainer = $(el).closest('.rList_grid_wrapper');

    // Filter out e-resources (e.g. "siehe Vollanzeige")
    if (rowContainer.length > 0) {
      const altText = rowContainer.find('.rList_availability img').attr('alt') || '';
      if (altText.toLowerCase().includes('siehe vollanzeige')) return;
    }

    // mediatype from img
    const mediumImg = rowContainer.find('.rList_medium img');
    const rawMediaType = mediumImg.attr('title') || mediumImg.attr('alt') || 'unbekannt';

    const mediaType = rawMediaType.trim();

    // Each result row also carries the statement of responsibility and the year
    const clean = (text: string) => text.replace(/[\s\u00a0]+/g, ' ').trim();
    const { title, platform } = cleanTitle(clean(titleText));

    searchResults.push({
      id,
      title,
      platform,
      author: cleanAuthor(clean(rowContainer.find('.rList_name').text())),
      year: parseYear(rowContainer.find('.rList_jahr').text()),
      mediaType
    });
  });

  // The "nächster" toolbar button indicates whether there is another page
  const nextButton = $('input[name="$Toolbar_3"]');
  const hasMore = nextButton.length > 0 && !nextButton.is('[disabled]') && !nextButton.hasClass('toolbar_img_dis');

  const identity = $('input[name="identity"]').val() as string;
  const requestCount = $('input[name="requestCount"]').val() as string;
  const formAction = $('form').first().attr('action') || '';
  const actionUrl = new URL(formAction, responseUrl).href;

  return { searchResults, hasMore, identity, requestCount, actionUrl };
}

export default defineEventHandler(async (event) => {
  const { q, token } = getQuery(event);

  try {
    let html: string;
    let responseUrl: string;

    if (token && typeof token === 'string') {
      // Load next page: resume the existing session and "click" the "nächster" button
      const decoded = decodeToken(token);
      const restoredJar = CookieJar.deserializeSync(decoded.cookies as any);
      const restoredClient = wrapper(axios.create({ jar: restoredJar }));

      const params = new URLSearchParams();
      params.append('identity', decoded.identity);
      params.append('keyCode', '0');
      params.append('focus', '');
      params.append('stz', '');
      params.append('source', '');
      params.append('selected', '');
      params.append('requestCount', decoded.requestCount);
      params.append('scriptEnabled', 'true');
      params.append('scrollPos', '0');
      params.append('$Toolbar_3.x', '5');
      params.append('$Toolbar_3.y', '5');

      const nextRes = await restoredClient.post(decoded.actionUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': decoded.actionUrl,
          'User-Agent': USER_AGENT
        }
      });

      html = nextRes.data;
      responseUrl = nextRes.request.res.responseUrl;

      const $ = cheerio.load(html);
      const { searchResults, hasMore, identity, requestCount, actionUrl } = parseResultsPage($, responseUrl);

      return {
        success: true,
        results: searchResults,
        hasMore,
        token: hasMore ? encodeToken({ identity, requestCount, actionUrl, cookies: restoredJar.toJSON() }) : null
      };
    }

    if (!q || typeof q !== 'string') {
      throw createError({ statusCode: 400, statusMessage: 'Query required' });
    }

    // VÖBB's "Überall suchen" finds ISBNs, but not with an "ISBN" prefix, and an ISBN-10 does not
    // find records catalogued with the ISBN-13 (the other way round works)
    const isbn = normalizeIsbn(q);
    const searchTerm = isbn ? toIsbn13(isbn) : q;

    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar }));

    // PHASE 1: get session & anti-CSRF token
    const initialRes = await client.get('https://www.voebb.de/aDISWeb/app/prod00');
    const $home = cheerio.load(initialRes.data);

    const identity = $home('input[name="identity"]').val();
    const formAction = $home('form').first().attr('action');

    if (!identity || !formAction) {
      throw new Error("Session-Token oder Action-URL nicht gefunden.");
    }

    const postUrl = new URL(formAction, 'https://www.voebb.de/aDISWeb/app/prod00').href;

    // PHASE 2: submit the search request
    const params = new URLSearchParams();
    params.append('identity', identity as string);
    params.append('keyCode', '82');
    params.append('focus', '$$GFBO_1');
    params.append('requestCount', '1');
    params.append('scriptEnabled', 'true');
    params.append('$Autosuggest', searchTerm);
    params.append('$Select', 'Überall suchen');
    params.append('$Button', 'pressed');

    const searchRes = await client.post(postUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': initialRes.request.res.responseUrl,
        'User-Agent': USER_AGENT
      }
    });

    html = searchRes.data;
    responseUrl = searchRes.request.res.responseUrl;

    // PHASE 3: parse the results page HTML
    const $ = cheerio.load(html);
    const { searchResults, hasMore, identity: nextIdentity, requestCount, actionUrl } = parseResultsPage($, responseUrl);

    return {
      success: true,
      results: searchResults,
      hasMore,
      token: hasMore ? encodeToken({ identity: nextIdentity, requestCount, actionUrl, cookies: jar.toJSON() }) : null
    };

  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Scraping Fehler'
    });
  }
});
