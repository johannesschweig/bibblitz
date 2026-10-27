// Reads one facet of an aDISWeb results page (the filter box next to the result list).
// Each value is a checkbox whose id goes back to VÖBB as `$CbTree_text` when the filter is submitted.
import type * as cheerio from 'cheerio';
import { mediaTypeFacetIds } from '../../utils/mediaTypeFacet';

export interface FacetValue {
  id: string;
  label: string;
  count: number;
}

export type FacetName = 'Sprache' | 'Medienart';

export function parseFacet($: cheerio.CheerioAPI, name: FacetName): FacetValue[] {
  const branch = $('button.cbtree_branch_a').filter((_, el) => $(el).text().trim() === name).first();
  const values: FacetValue[] = [];

  branch.next('div.cbtree_divsub').find('input.cbtree_leaf_inp').each((_, el) => {
    const link = $(el).next('label').find('a.cbtree_leaf_a');
    // "Englisch  (539)": the count sits in its own span, the label is the rest
    const count = parseInt(link.find('.count').text().replace(/\D/g, ''), 10);
    const label = link.clone().find('.count').remove().end().text().trim();
    const id = $(el).attr('id');
    if (id && label && count > 0) values.push({ id, label, count });
  });

  return values;
}

// When no result matches all chosen values, VÖBB does not say so: it drops the filter and returns the
// unfiltered list (measured 27.10.2026: "harry potter" + Italienisch + Noten gives all 1992 hits).
// A page with an active filter has a ticked value and "u ( Sprache: "Englisch")" in the line "Gesucht wurde mit …".
export function isFilterActive($: cheerio.CheerioAPI): boolean {
  return $('.cbtree_leaf_active').length > 0 || /\su\s\(/.test($('.adis-searched-with').text());
}

// The checkboxes to submit for the chosen languages and media types. VÖBB only lists values this search has a
// hit for, so a chosen value that is missing means nothing can match: the caller must answer "no results"
// and keep the filter instead of dropping it (a search for another term must not lose the filter).
export function resolveFilterIds(
  languageFacet: FacetValue[],
  mediaTypeFacet: FacetValue[],
  languages: string[],
  mediaTypes: string[]
): { ids: string[]; nothingMatches: boolean } {
  const languageIds = languageFacet.filter(f => languages.includes(f.label)).map(f => f.id);
  // Without a chosen type every type with copies is selected: that leaves the e-media out of a language filter
  const typeIds = mediaTypeFacetIds(mediaTypeFacet, mediaTypes);
  const nothingMatches = (languages.length > 0 && languageIds.length === 0) || typeIds.length === 0;
  return { ids: [...languageIds, ...typeIds], nothingMatches };
}
