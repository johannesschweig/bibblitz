// server/api/search.get.ts
import { defineEventHandler, getQuery, createError } from 'h3';
import axios, { type AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { cleanTitle, cleanAuthor, parseYear } from '../../utils/catalogText';
import { normalizeIsbn, toIsbn13 } from '../../utils/isbn';
import { isMaintenancePage, parseMaintenanceUntil } from '../../utils/maintenance';
import { parseFilterParam, parseMediaTypeParam } from '../../utils/filters';
import { LANGUAGE_OPTIONS, MEDIA_TYPE_OPTIONS } from '../../utils/filterOptions';
import { parseFacet, isFilterActive, resolveFilterIds } from '../utils/facets';

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

// Presses a button of the results page: the hidden session fields plus whatever the button needs
function postPageAction(
  client: AxiosInstance,
  actionUrl: string,
  session: { identity: string; requestCount: string },
  fields: Array<[string, string]>,
  button: { source?: string; focus?: string } = {}
) {
  const params = new URLSearchParams();
  params.append('identity', session.identity);
  params.append('keyCode', '0');
  params.append('focus', button.focus ?? '');
  params.append('stz', '');
  params.append('source', button.source ?? '');
  params.append('selected', '');
  params.append('requestCount', session.requestCount);
  params.append('scriptEnabled', 'true');
  params.append('scrollPos', '0');
  fields.forEach(([key, value]) => params.append(key, value));

  return client.post(actionUrl, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': actionUrl,
      'User-Agent': USER_AGENT
    }
  });
}

export default defineEventHandler(async (event) => {
  const { q, token, lang, type } = getQuery(event);

  try {
    let html: string;
    let responseUrl: string;

    if (token && typeof token === 'string') {
      // Load next page: resume the existing session and "click" the "nächster" button
      const decoded = decodeToken(token);
      const restoredJar = CookieJar.deserializeSync(decoded.cookies as any);
      const restoredClient = wrapper(axios.create({ jar: restoredJar }));

      const nextRes = await postPageAction(
        restoredClient,
        decoded.actionUrl,
        { identity: decoded.identity, requestCount: decoded.requestCount },
        [['$Toolbar_3.x', '5'], ['$Toolbar_3.y', '5']]
      );

      html = nextRes.data;
      responseUrl = nextRes.request.res.responseUrl;

      if (isMaintenancePage(html, responseUrl)) {
        return { success: false, maintenance: true, until: parseMaintenanceUntil(html) };
      }

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
    if (isMaintenancePage(initialRes.data, initialRes.request.res.responseUrl)) {
      return { success: false, maintenance: true, until: parseMaintenanceUntil(initialRes.data) };
    }
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
    let $ = cheerio.load(html);
    let page = parseResultsPage($, responseUrl);

    // PHASE 4 (optional): narrow the results with the facets, both in one request. VÖBB combines the values of
    // one facet with OR and the facets with AND. Only the values of the filter page are accepted (see utils/filterOptions.ts).
    const wantedLanguages = parseFilterParam(lang).filter(label => LANGUAGE_OPTIONS.includes(label));
    const wantedTypes = parseMediaTypeParam(type).filter(label => MEDIA_TYPE_OPTIONS.includes(label));
    if (wantedLanguages.length > 0 || wantedTypes.length > 0) {
      const { ids, nothingMatches } = resolveFilterIds(parseFacet($, 'Sprache'), parseFacet($, 'Medienart'), wantedLanguages, wantedTypes);

      if (nothingMatches) {
        page = { ...page, searchResults: [], hasMore: false };
      } else {
        const filterButton = $('input.imp-button.filter').first();
        const filterRes = await postPageAction(
          client,
          page.actionUrl,
          { identity: page.identity, requestCount: page.requestCount },
          [
            ...ids.map((id): [string, string] => ['$CbTree_text', id]),
            [filterButton.attr('name') || '$Button$2', 'pressed']
          ],
          { source: '$B', focus: filterButton.attr('data-fld') || '$$GFBO_11' }
        );
        html = filterRes.data;
        responseUrl = filterRes.request.res.responseUrl;
        $ = cheerio.load(html);
        page = parseResultsPage($, responseUrl);
        // No result matches every chosen value: VÖBB answers with the unfiltered list, which must not be shown
        if (!isFilterActive($)) page = { ...page, searchResults: [], hasMore: false };
      }
    }

    return {
      success: true,
      results: page.searchResults,
      hasMore: page.hasMore,
      token: page.hasMore ? encodeToken({ identity: page.identity, requestCount: page.requestCount, actionUrl: page.actionUrl, cookies: jar.toJSON() }) : null,
      appliedLanguages: wantedLanguages,
      appliedMediaTypes: wantedTypes
    };

  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Scraping Fehler'
    });
  }
});
