# Search and filters

How the language and media-type filters work in `server/api/search.get.ts` and the UI in `FilterPage.vue`. Read it before changing the search route, `server/utils/facets.ts`, `utils/filterOptions.ts`, `utils/mediaTypeFacet.ts`, the filter state in `mediaStore` or the filter UI.

## Request

`?lang=Englisch` and `?type=Buch` (comma lists, max 5; the UI sends one each) are applied by VÖBB itself as a fourth step of the session: after the first results page the "Sprache" and "Medienart" facets of the filter box are parsed (`server/utils/facets.ts`) and the wanted values are submitted in one request as `$CbTree_text` (checkbox ids) plus the facet's "Filtern" button pressed (`$Button$2=pressed`, `source=$B`). A filtered search costs one more VÖBB request (about +0.7 s on 2 s).

## How VÖBB behaves

- Values of one facet are combined with OR, the facets with AND.
- **A combination with no hit is not reported: VÖBB drops the filter and returns the full list.** `isFilterActive` detects that and the route returns no results.
- VÖBB only lists facet values that the current search has a hit for. A chosen value that is missing from the facet therefore means nothing can match: the route answers with no results and keeps the filter (`resolveFilterIds`).
- The facets only exist on results pages, so there is no browse mode without a search term (advanced search with only Sprache works, but returns 200k+ hits).

## Fixed lists

The accepted values are the fixed lists in `utils/filterOptions.ts`: 3 languages and 14 media-type chips. They do not depend on the search.

- CD-ROM is merged into CD. The catch-alls Medienkombination and sonstiges Material have no chip but stay in a language-only filter.
- `utils/mediaTypeFacet.ts` maps chips to the VÖBB values, e.g. DVD = DVD-Video + DVD-ROM. A unit test checks that every VÖBB type with copies has a chip.
- E-media (`E-Book`, `E-Audio`, `Elektronische Ressource`, series, articles) have no chip. A language filter without a chosen type submits every type with copies, which drops them from the list.

The response carries `appliedLanguages` / `appliedMediaTypes` (values not on the lists are dropped). `mediaStore` keeps them as VÖBB applied them, and as requested when a request fails, so "Erneut versuchen" reuses them.

Result rows can still be hidden after filtering: box sets and multi-volume records say "siehe Vollanzeige" (about 5 of 22 rows for "harry potter" DVDs).

## UI (`FilterPage.vue`)

- A fullscreen dialog opened by the "Filter <n>" button under the search (n = active filters, at most 2). It edits a draft that only counts after "Anwenden"; "Zurücksetzen" clears the draft, "Schließen" drops it.
- Both groups (Sprache, Medienart) are single-select and behave the same. "Anwenden" closes the dialog and runs a new search (skeleton in the list) with `?q=…&lang=…&type=…` in the URL.
- Filters stay when the text query changes, are cleared when the search box is emptied, and stay after a failed search ("Erneut versuchen").
- With no hits the page names the filter and offers "Filter zurücksetzen" / "Filter ändern".
- The chips show no counts, and there is no note about the hidden e-media either (see why below).

## Why it is built this way

- Measured 27.10.2026 on "harry potter": each facet value applied alone gives exactly its facet count. That is how the "no hit drops the filter" behaviour was found.
- Earlier the chips came from the results (top 5 / top 10), so a chosen value vanished silently when a new search term did not offer it. Hence the fixed lists.
- VÖBB's counts are hits of the unfiltered search, including rows BibBlitz hides (e-media, box sets), and summed over merged types (DVD = DVD-Video + DVD-ROM). They never match the visible list, so the chips have no counts.
