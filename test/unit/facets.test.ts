import { describe, it, expect } from 'vitest'
import * as cheerio from 'cheerio'
import { parseFacet, isFilterActive, resolveFilterIds } from '../../server/utils/facets'

// Markup copied from the aDISWeb results page (search "harry potter", 27.10.2026), shortened to a few values.
// The same list structure holds the other facets (Medienart, Bibliothek, ...), only "Sprache" is wanted.
const facetHtml = `
<ul>
<li class="cbtree_branch_li">
<button type="button" class="cbtree_branch_a inactive" name="PTL1_tree_1_0" id="but-PTL1_tree_1_0"><i aria-hidden="true" class="icon-type"></i>Medienart<i aria-hidden="true" class="icon-collapsible"></i></button>
<div class="cbtree_divsub cbtree_hidden" id="sub-PTL1_tree_1_0"><ul class="cbtree_ulsub">
<li class="cbtree_leaf_li"><input type="checkbox" id="sub-PTL1_tree_1_1" name="PTL1_tree_1_1" class="cbtree_leaf_inp cbtree_leaf_inactive"><label for="sub-PTL1_tree_1_1" class="cbtree_leaf_label"><i aria-hidden="true" class="icon-check"></i><a id="lnk-PTL1_tree_1_1" class="cbtree_leaf_a">Buch (Print) <span class="count">(885)</span></a></label></li>
</ul></div>
</li>
<li class="cbtree_branch_li">
<button type="button" class="cbtree_branch_a inactive" name="PTL1_tree_1_157" id="but-PTL1_tree_1_157"><i aria-hidden="true" class="icon-type"></i>Sprache<i aria-hidden="true" class="icon-collapsible"></i></button>
<div class="cbtree_divsub cbtree_hidden" id="sub-PTL1_tree_1_157" aria-labeledby="sub-PTL1_tree_1_157" aria-hidden="true"><ul class="cbtree_ulsub">
<li class="cbtree_leaf_li"><input type="checkbox" id="sub-PTL1_tree_1_158" name="PTL1_tree_1_158" class="cbtree_leaf_inp cbtree_leaf_inactive"><label for="sub-PTL1_tree_1_158" class="cbtree_leaf_label"><i aria-hidden="true" class="icon-check"></i><a id="lnk-PTL1_tree_1_158" class="cbtree_leaf_a">Deutsch  <span class="count">(1238)</span></a></label></li>
<li class="cbtree_leaf_li"><input type="checkbox" id="sub-PTL1_tree_1_159" name="PTL1_tree_1_159" class="cbtree_leaf_inp cbtree_leaf_inactive"><label for="sub-PTL1_tree_1_159" class="cbtree_leaf_label"><i aria-hidden="true" class="icon-check"></i><a id="lnk-PTL1_tree_1_159" class="cbtree_leaf_a">Englisch  <span class="count">(539)</span></a></label></li>
<li class="cbtree_leaf_li"><input type="checkbox" id="sub-PTL1_tree_1_160" name="PTL1_tree_1_160" class="cbtree_leaf_inp cbtree_leaf_inactive"><label for="sub-PTL1_tree_1_160" class="cbtree_leaf_label"><i aria-hidden="true" class="icon-check"></i><a id="lnk-PTL1_tree_1_160" class="cbtree_leaf_a">kein linguistischer Inhalt  <span class="count">(47)</span></a></label></li>
</ul></div>
</li>
</ul>`

describe('parseFacet', () => {
  it('reads label, count and checkbox id of the Sprache values only', () => {
    expect(parseFacet(cheerio.load(facetHtml), 'Sprache')).toEqual([
      { id: 'sub-PTL1_tree_1_158', label: 'Deutsch', count: 1238 },
      { id: 'sub-PTL1_tree_1_159', label: 'Englisch', count: 539 },
      { id: 'sub-PTL1_tree_1_160', label: 'kein linguistischer Inhalt', count: 47 }
    ])
  })

  it('reads the Medienart facet from the same markup', () => {
    expect(parseFacet(cheerio.load(facetHtml), 'Medienart')).toEqual([
      { id: 'sub-PTL1_tree_1_1', label: 'Buch (Print)', count: 885 }
    ])
  })

  it('returns nothing when the page has no Sprache facet (no results, changed markup)', () => {
    expect(parseFacet(cheerio.load('<div>Keine Treffer</div>'), 'Sprache')).toEqual([])
  })
})

// VÖBB drops a filter that matches nothing and shows the unfiltered list instead
describe('isFilterActive', () => {
  it('recognises the "Gesucht wurde mit" line of a filtered page', () => {
    const filtered = '<div class="adis-searched-with"><p class="info">Gesucht wurde mit "Freie Suche = harry potter" u ( Sprache: "Englisch"), Treffer: 539 im "Bibliotheksbestand"</p></div>'
    expect(isFilterActive(cheerio.load(filtered))).toBe(true)
  })

  it('recognises a ticked facet value', () => {
    const ticked = '<input type="checkbox" id="sub-PTL1_tree_1_159" class="cbtree_leaf_inp cbtree_leaf_active" checked>'
    expect(isFilterActive(cheerio.load(ticked))).toBe(true)
  })

  it('is false for the unfiltered list that VÖBB returns when nothing matches', () => {
    const unfiltered = '<div class="adis-searched-with"><p class="info">Gesucht wurde mit "Freie Suche = harry potter", Treffer: 1992 im "Bibliotheksbestand"</p></div><input type="checkbox" class="cbtree_leaf_inp cbtree_leaf_inactive">'
    expect(isFilterActive(cheerio.load(unfiltered))).toBe(false)
  })
})

describe('resolveFilterIds', () => {
  const languages = [{ id: 'l-en', label: 'Englisch', count: 5 }, { id: 'l-de', label: 'Deutsch', count: 9 }]
  const types = [{ id: 't-b', label: 'Buch (Print)', count: 9 }, { id: 't-e', label: 'E-Book', count: 4 }, { id: 't-d', label: 'DVD-Video', count: 1 }]

  it('combines the chosen language with the chosen type', () => {
    expect(resolveFilterIds(languages, types, ['Englisch'], ['Buch'])).toEqual({ ids: ['l-en', 't-b'], nothingMatches: false })
  })

  it('takes every type with copies for a language alone, which leaves out the e-media', () => {
    expect(resolveFilterIds(languages, types, ['Deutsch'], [])).toEqual({ ids: ['l-de', 't-b', 't-d'], nothingMatches: false })
  })

  // Regression: a filter the new search term has no hit for was dropped and the list came back unfiltered
  it('reports that nothing matches when this search has no hit in the chosen language', () => {
    expect(resolveFilterIds(languages, types, ['Russisch'], []).nothingMatches).toBe(true)
  })

  it('reports that nothing matches when this search has no hit of the chosen type', () => {
    expect(resolveFilterIds(languages, types, [], ['Karte']).nothingMatches).toBe(true)
  })

  it('uses the languages that exist when one of several is missing (OR)', () => {
    expect(resolveFilterIds(languages, types, ['Englisch', 'Russisch'], ['Buch']).nothingMatches).toBe(false)
  })
})
