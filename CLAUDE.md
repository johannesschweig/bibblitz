# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BibBlitz (bibblitz.de) — a Nuxt 4 / Vue 3 / Tailwind 4 front end for the Berlin public library network VÖBB. There is no VÖBB API; the server routes scrape `voebb.de` (aDISWeb) HTML with cheerio. UI copy is in German; write all code comments and test names in English (German only for quoted UI strings or scraped VÖBB labels).

## Commands

- `npm run dev` — runs `nuxt dev` (the server routes work without Vercel). Do not point it back at `vercel dev`: the Vercel project's Development Command calls `npm run dev`, so `vercel dev` would recurse (`DEV_RECURSIVE_INVOCATION`). `.claude/launch.json` uses `npx nuxt dev --port 3210`.
- `npm run build` / `npm run generate` / `npm run preview` — standard Nuxt.
- `npm test` — Vitest with `@nuxt/test-utils` (`environment: 'nuxt'`), tests in `test/`. Page tests use `mountSuspended` and fake `/api/*` with `registerEndpoint`, so they never hit voebb.de. No linter or formatter is configured.
- `MOCK_VOEBB=1` in `.env` (dev only, restart the dev server): `/api/detail` returns fixtures from `server/utils/mockDetail.ts` instead of scraping voebb.de, for working on the detail page during VÖBB maintenance. Any `/media/<id>` works; `00000001` has no copies, `00000002` has a very long title and no author/ISBN, `34758158` has a long note. Has no effect in production builds. Search is not mocked, so open `/media/<id>` directly.
- `CARTO_API_KEY` env var (in `.env`, gitignored) is exposed as `runtimeConfig.public.cartoApiKey` for the Leaflet/CARTO map tiles.
- Deployed on Vercel; server routes must stay within its ~10s function limit (detail fetch uses a 4.5s timeout for this reason).
- Commit messages: one short lowercase subject line, no body unless the why isn't obvious from the diff (then max 2–3 lines).
- Git workflow: work in regular branches in the main checkout (`git switch -c <name>`), never in git worktrees (no `EnterWorktree`, no sessions with `use_worktree: true`). Merge the branch into `main` when the work is done, then delete it.

## Architecture

**Scraping layer (`server/api/`)**
- `search.get.ts` — emulates a browser session against aDISWeb: GET home page for `identity` token → POST search form → parse results (`parseResultsPage`). Pagination ("load more") is stateless on our side: the response includes a base64url `token` encoding the VÖBB `identity`, `requestCount`, form action URL and the serialized tough-cookie jar; passing `?token=` replays the session and "clicks" the next-page toolbar button. `?q=` starts a new search. Filters: `?lang=Englisch` and `?type=Buch` (comma lists, max 5; the UI sends one each) are applied as a fourth step by VÖBB itself: after the first results page the "Sprache" and "Medienart" facets of the filter box are parsed (`server/utils/facets.ts`) and the wanted values are submitted in one request as `$CbTree_text` (checkbox ids) plus the facet's "Filtern" button pressed (`$Button$2=pressed`, `source=$B`). VÖBB combines the values of one facet with OR and the facets with AND. Measured 27.10.2026 on "harry potter": each facet value applied alone gives exactly its facet count; **a combination with no hit is not reported, VÖBB drops the filter and returns the full list** (`isFilterActive` detects that and the route returns no results). The accepted values are the **fixed lists** in `utils/filterOptions.ts` (3 languages, 14 media-type chips; CD-ROM is merged into CD, the catch-alls Medienkombination and sonstiges Material have no chip but stay in a language-only filter; `utils/mediaTypeFacet.ts` maps them to the VÖBB values, e.g. DVD = DVD-Video + DVD-ROM; a unit test checks that every VÖBB type with copies has a chip). They do not depend on the search: earlier the chips came from the results (top 5 / top 10), so a chosen value vanished silently when a new search term did not offer it. VÖBB only lists values that the current search has a hit for, so a chosen value that is missing from the facet means nothing can match: the route answers with no results and keeps the filter (`resolveFilterIds`). The response carries `appliedLanguages` / `appliedMediaTypes` (values not on the lists are dropped). E-media (`E-Book`, `E-Audio`, `Elektronische Ressource`, series, articles) have no chip; a language filter without a chosen type submits every type with copies, which drops them from the list. A filtered search costs one more VÖBB request (about +0.7 s on 2 s). The facets only exist on results pages, so there is no browse mode without a search term (advanced search with only Sprache works, but returns 200k+ hits). Result rows can still be hidden after filtering (box sets and multi-volume records say "siehe Vollanzeige", about 5 of 22 rows for "harry potter" DVDs).
- `detail.get.ts` — fetches one record by numeric ID (`SAK<id>` direct link) and parses metadata (media type, author, ISBN) and per-branch availability, then runs it through `utils/availability.ts`. It also reads the `Sprache` row (`languages`), shown as a line under the ISBN (the `Sprache Original` row is deliberately not shown).
- Maintenance: while VÖBB is switched off, every aDISWeb URL redirects to a static `/wartung/` page. `utils/maintenance.ts` detects it (and reads the end of the window); `search`/`detail` then return `{ success: false, maintenance: true, until }` and `status.get.ts` (cached 60 s) lets `voebbStatusStore` show a banner (`MaintenanceNotice.vue`) before anyone searches. Any new scraper route must check `isMaintenancePage` first.
- `server/routes/sitemap.xml.ts`, `robots.txt.ts` — SEO routes; sitemap is generated from `app/assets/libraries.json`.
- axios + cookiejar packages are force-inlined in `nuxt.config.ts` (`nitro.externals.inline`) so they bundle correctly on Vercel — keep this when touching those deps.

**Shared logic (`utils/`, `types/`)** — at the repo root (not under `app/`), imported by both server and client. `utils/availability.ts` matches scraped branch names to `app/assets/libraries.json` (fuzzy name matching), computes `daysToWait` from VÖBB status strings, distance to the user's ZIP and sorting/badge config. `mediaTypeMapping.ts` normalizes/aggregates media type labels for the filter. `catalogText.ts` cleans VÖBB catalog text (ISBD): it strips format notes like `[Hörbuch]` and extracts the platform, but never drops text after ` : ` (can be part of the name; `MediaTitle.vue` only styles it lighter). The author is the statement of responsibility from the result row (`.rList_name`, for games it is the publisher), cleaned heuristically — the detail page's contributor list can start with the translator. Test cases are real records in `test/unit/catalogText.test.ts`; add new misses there.

**Client state (Pinia, `app/stores/`)**
- `itemCacheStore` — central `id → MediaItem` dictionary; search results push basic data in, `fetchDetails(id)` lazily calls `/api/detail` and merges (dedupes concurrent fetches via `fetching`). Don't refetch if `availability` is already present.
- `mediaStore` — only holds search result ID lists, `lastQuery`, pagination token/state (`executeSearch(query, languages)`, `loadMore`), and the filter state (`languages` / `mediaTypes` as VÖBB applied them, kept as requested when a request fails so "Erneut versuchen" reuses them; the values come from `utils/filterOptions.ts`); item data lives in the cache.
- `userStore` — user ZIP/coords, persisted in `localStorage` (`bibblitz_zip`), validated against `app/assets/berlinZipCodes.json`. No accounts/auth (watchlist and Supabase sync were removed, though `@nuxtjs/supabase` remains in package.json).

**Pages** — `index` (search + showcase), `media/[id]` (detail/availability), `library/[id]` (library pages, SEO), `imprint`, `data-privacy`, `dev` (toggle to disable Umami tracking on this device). The filter UI is `FilterPage.vue`: a fullscreen dialog opened by the "Filter <n>" button under the search (n = active filters, at most 2), a draft that only counts after "Anwenden" ("Zurücksetzen" clears the draft, "Schließen" drops it). Both groups (Sprache, Medienart) are single-select and behave the same: "Anwenden" closes the dialog and runs a new search (skeleton in the list) with `?q=…&lang=…&type=…` in the URL. Filters stay when the text query changes, are cleared when the search box is emptied, and stay after a failed search ("Erneut versuchen"). With no hits the page names the filter and offers "Filter zurücksetzen" / "Filter ändern". The chips are the fixed lists, without counts: VÖBB's counts are hits of the unfiltered search including rows BibBlitz hides (e-media, box sets) and summed over merged types (DVD = DVD-Video + DVD-ROM), so they never match the list. There is no note about the hidden e-media either.

**Icons** — Lucide via `@nuxt/icon` (`<Icon name="lucide:search" />`), bundled into the client (`clientBundle.scan`, `fallbackToApi: false`), so no requests to the Iconify API (GDPR). Favicon is `public/favicon.svg` (Lucide zap).

**Analytics** — Umami loaded via script in `nuxt.config.ts`; use the `useUmami().track(event, data)` composable. The script has `data-domains="bibblitz.de,www.bibblitz.de"`, so localhost and preview deployments never send data. Only for browser testing on the live bibblitz.de set `localStorage['umami.disabled']='1'` first (or use `/dev`).

`TODO.md` is the product backlog/ideas log (known scraping edge cases are listed there).

## Accessibility: text contrast

All text must meet **WCAG 2.2 AA**: contrast of at least **4.5:1**, or **3:1** for large text (>= 24px, or >= 18.66px and bold). This includes input placeholders, eyebrow labels and the small 10–12px text. Disabled controls are exempt. Non-text graphics (icons, borders) should reach 3:1 when they carry meaning on their own.

Rules of thumb for Tailwind 4 colours (all measured, not guessed):
- Muted text: `text-gray-500` is the lightest allowed on white and page background (about 4.8:1). On tinted backgrounds (`bg-gray-100`, `bg-*-50`) use `text-gray-600` or darker. `text-gray-400` (2.5:1) is never OK for text, placeholders included (`placeholder:text-gray-500`).
- Coloured text: use the `-700`/`-800` step (`text-blue-700`, `text-red-700`, `text-emerald-800`, `text-green-700`). `-400`/`-500` and `text-emerald-600`, `text-red-500`, `text-green-600` fail. `text-blue-600` (links, `.link`) passes on white and `slate-50`.
- No `opacity-*` on text (it lowers contrast silently), no light-grey text on translucent or gradient backgrounds without measuring.
- `StatusPill` tones pair `-800/-900` text with `-50/-100` backgrounds; keep that pairing when adding a tone.

How to check: `scripts/contrast-audit.js` defines `window.__audit(label)` for the running app. Paste it into the browser console (or the Claude browser pane's javascript tool), call `__audit('page name')` and fix everything it lists. It reads the computed colours (oklch, translucent backgrounds, opacity), so it is exact, unlike a visual check. Run it on every page **and** every state that shows different text: home with FAQ items opened, results (scrolled so all badges loaded), filtered results, no results, detail page with a saved ZIP and with the ZIP editor open, library pages with and without a saved ZIP (the distance block only shows with a saved ZIP), `/dev` in both states. Navigate client-side (`$router.push`) so `window.__audit` survives. After a state change wait ~300 ms, otherwise buttons mid-transition (`transition-all`) show up as false positives. Last full audit: 16.10.2026, no failures; the filter button and filter page (open, chips selected) were audited on 27.10.2026, no failures.

## Umami pipeline

`npm run umami -- --days 90` (`scripts/umami/fetch.mjs`) pulls stats, metrics, event properties and raw events from the Umami Cloud API into `data/umami/<date>/` (gitignored) and writes `data/umami/latest/digest.json` (`scripts/umami/digest.mjs`: dedup of known tracking artefacts, session funnel, weekly trend, features that never fired). Auth is the dashboard's public share link in `.env` as `UMAMI_SHARE_URL` (website settings → Share URL; the free Umami Cloud plan has no API keys, `UMAMI_API_KEY` is supported for paid plans). The script trades the link for a read-only token the way the shared dashboard does, so anyone with the link can read the same data: revoke it by turning the share URL off. `npm run umami:digest` rebuilds the digest from an existing snapshot. The `/umami-review` skill (`.claude/skills/umami-review`) loads the data and answers questions about it (no report files). A new tracking event goes into `FEATURES` in `digest.mjs` too, otherwise it shows up as `unknownEvents`. A failing endpoint does not abort the run, it is listed in `meta.json` and the digest warnings.

## Feature inventory & usage (Umami)

Umami snapshot taken 09.10.2026 (dashboard "bibblitz", range "Last 90 days" = 11.07.–09.10.2026; `date=all` and custom `date=a:b` ranges crash Umami's UI, use `date=90day`). Overall: 373 visitors, 432 visits, 1.65k views, bounce 53%. Of these only 159 visitors fired at least one custom event (843 events). Re-check around **06.11.2026** and decide which features/events to keep or kill.

How to read the "Umami indicator" column: **event** = custom event (Events tab, counts only, no unique visitors); **URL** = Overview → Pages, or filter `?date=90day&path=c./media/` ("contains"). Visitor counts of a URL group are deduplicated, row sums are not.

### Search & results (home `/`)

| Feature | Introduced | Umami indicator | Usage (90d) | Notes |
|---|---|---|---|---|
| Text search | 15.06. | event `search-started` (tracked since 03.07.; since 09.10. fires after the response with `results` count and `error: 1` on failure) | 497 raw, ~300-350 real | core, keep. Use `results: 0` to find dead-end searches |
| ISBN search (ISBN-10/13, hyphens, "ISBN" prefix; normalized to ISBN-13 in `search.get.ts`) | 15.10. | event `search-started` with `isbn: 1` | n/a, new | before 15.10. plain ISBNs already worked, but not ISBN-10 for records catalogued with ISBN-13 or a prefixed "ISBN" |
| Quick-search chips | 07.07. | event `search-quick` | 18 | ~4% of searches |
| Media-type filter | 22.07. (aggregation 20.08.; moved to the filter page and made a VÖBB filter 27.10., single-select) | event `click-media-filter` until 27.10., then `filter-media-type` (`media_type`, `results`) | 29 | ~6% of searches. Before 27.10. it only filtered the loaded rows (16-22 of up to thousands of hits) |
| Filter page: language (Deutsch, Englisch, Französisch) and media type (14 chips, fixed lists), both applied by VÖBB, behind the "Filter" button | 27.10. | events `filter-open` (`source`: button / empty-state), `filter-apply` (`results`, `language`, `media_type`, `reset: 1` when cleared, `error: 1`), `filter-language` and `filter-media-type` (only on a successful apply; own events because Umami counts sessions per event name, not per property), `filter-reset` (reset inside the dialog); `search-started` carries `language` / `media_type` when a filter is active. The chip "Spiel" (board and card games, Memory, puzzles, kits) was renamed "Gesellschaftsspiel" on 28.10.2026 because people read it as "all games"; events before carry `media_type: Spiel`, old `?type=Spiel` links are mapped | n/a, new | requested by users. Dead ends: `filter-apply` with `results` 0. **Decision on 22.12.2026**: keep the language filter if `filter-language` has at least 8 events from at least 5 sessions (the digest's `decisions.languageFilter` shows `events`, `sessions`, `met`); only then consider the language as an inline choice under the search field. Otherwise remove the language chips (the media-type filter stays) |
| "Weitere Treffer laden" (pagination) | 09.09. | event `search-next-page` (with `page`) | 8 (+2 `search-load-more`, old name) | too new, re-check |
| Availability badge + media-type icons in results | 16.06. / 06.07. | none | n/a | passive, part of every result |
| ZIP entry (distance sorting) | 16.06. (inline entry 09.07.) | event `zip-save` | 34 | ~9% of visitors, persists in `localStorage` |

### Home page content (below the search)

| Feature | Introduced | Umami indicator | Usage (90d) | Notes |
|---|---|---|---|---|
| Intro / empty state (`AppIntro`) | 26.06. | none | n/a | passive |
| Showcase (popular media tiles) | 03.09. | event `showcase-click` | 41 clicks / 21 sessions (export 28.10.): 1 click until 25.10., 40 during the 26.–28.10. traffic spike | **still a deletion candidate, re-check 06.11.** (do not delete before). Cut to the top 3 tiles without "Mehr anzeigen" on 28.10. (the 3 visible tiles got 35 of 41 clicks, and the home page loaded all 7 records for nothing). 8 of the 21 clicking sessions never searched, so for first-time visitors it is the only way in; 4 of 21 went on to `voebb-click` (average 15%). Rule for 06.11.: keep if non-spike traffic clicks it in at least ~3–5% of home sessions, remove if it falls back to ~0.5% (1 click in ~200 sessions before the spike) |
| FAQ accordion | 02.07. (tracking 04.07.) | event `toggle-faq` (with FAQ `id`) | 245 raw; replaying clicks per visit from the export gives ~20% fewer real opens (closes were counted until 09.10.) | all-time opens by item (export 09.10.): `fewer-results` 51, `app-store` 42, `data-source` 37, `data-storage` 33, `distance` 30, `i-have-question` 15 (+12 for removed `sync-watchlist`). 68 sessions (~13% of home sessions) opened any item, 27 of them read 4+ items. `i-have-question` was the weakest and **removed 09.10.2026** (mail is also in About, imprint, privacy); next weakest: `distance`, `data-storage` (covered by privacy page) |
| About section | 20.07. | none | n/a | added because people visited the imprint; `/imprint` still has 19 visitors |

### Media detail (`/media/<id>`)

| Feature | Introduced | Umami indicator | Usage (90d) | Notes |
|---|---|---|---|---|
| Detail page with branch availability | 15.06. | URL `/media/*` | 120 visitors / 611 views (~32% of visitors) | core, keep. 91% arrive from bibblitz.de, so almost no direct/SEO traffic |
| Branch sorting by distance, due-days / overdue labels, hide far branches | 16.06. / 28.06. / 03.07. | none (part of detail page) | n/a | |
| "N entferntere Bibliotheken anzeigen" button (branches beyond 7 km are hidden when there are more than 3, only with a saved ZIP: with the default ZIP all branches are shown, since 10178 is not the user's location; changed 26.10.) | 03.07. (tracking 20.10.) | event `branches-expand` (`hidden`, `available_now` among the visible branches, `zip_default`) | n/a, new | answers whether the default view is enough: compare against `detail-view` with `branches` > 3 |
| "↗ VÖBB" link button | 03.07. (tracking 09.10.) | event `voebb-click` (`available_now`, `zip_default`) | n/a, new | the closest thing to a conversion: BibBlitz cannot reserve, so this is where the user acts on the result |
| Detail outcome | 09.10. | event `detail-view` (`status` ok/empty/failed/error, `failed` since 29.10. = record known from the search row but its copies could not be fetched, before that logged as `empty`; `branches`, `available_now`, `nearest_available_km`, `zip_default` 0/1) | n/a, new | measurement only: shows detail fetch failures, how often nothing is available nearby, and how many viewers still use the default ZIP 10178 |
| Language line on the detail page ("Sprache Deutsch · Englisch") | 27.10. | none | n/a | passive, matches the language filter |
| ISBN on detail page (plain text, not styled as a link; click does nothing yet) | 15.10. | event `isbn-click` | n/a, new | if people click it, link it to an ISBN search (also finds duplicate records of the same edition, with their own copies and availability) |
| Author click (search by author) | 09.07. | event `author-click` | 2 | **deletion candidate** (decide at 06.11. re-check, do not delete before) |
| Branch click → library page | 10.07. | none (see library URL) | n/a | |

### Library pages (`/library/<id>`)

| Feature | Introduced | Umami indicator | Usage (90d) | Notes |
|---|---|---|---|---|
| Library page (address, opening/service hours, website) | 10.07. | URL `/library/*` | 51 visitors / 146 views (~14% of visitors), 5 from google.com | SEO play via sitemap (23.07.); top pages: AGB 11, Hansabibliothek 5 |
| "In Google Maps öffnen" / "Bibliothekswebsite öffnen" | 10.07. (tracking 17.10.) | events `library-maps-click`, `library-website-click` (`id`, `zip_default`) | n/a, new | the library-page counterpart of `voebb-click`: shows whether the (SEO) page leads anywhere |
| Library map (Leaflet / CARTO) | 11.07. | none (part of library page) | n/a | needs `CARTO_API_KEY` |
| Sitemap / robots routes | 23.07. | none | n/a | 5 google visitors on library pages is the only SEO signal so far |

### Static & dev pages

| Feature | Introduced | Umami indicator | Usage (90d) | Notes |
|---|---|---|---|---|
| Imprint | 30.06. | URL `/imprint` | 19 visitors | legal, keep |
| Data privacy | 30.06. | URL `/data-privacy` | 4 visitors | legal, keep |
| `/dev` tracking opt-out | 28.06. | none (own visits are excluded) | n/a | dev tool |
| Navbar: "Zurück" left, logo centred (`AppNavbar.vue`, every page but `/`) | 29.10. | events `back-click` (`from` home/detail/library/other, `had_history` 0 = direct landing, fell back) and `logo-click` (`from`, `had_results`) | n/a, new | replaced the two page-level back buttons. Fallback without history: `/`, on a shared library link with `?media=<id>` the book. The logo clears the results on purpose (decided 29.10., P3 in `TODO.md`: a logo that returns to old results would be unusual); `logo-click` only measures whether people use it as "back" instead of "Zurück" |

### Removed

| Feature | Introduced → removed | Umami leftovers |
|---|---|---|
| Watchlist / bookmarks / account sync | 19.05. → 22.07. | event `bookmark-button-clicked` (5), URL `/watchlist` (5 visitors still arrive, now a dead page) |
| Share button | 13.07. → 09.10. | event `share-media` (2) |
| Library click event | 09.07. → 13.07. | event `library-click` (20, only in the export, 4 sessions on 09.07.) |

Caveats when re-reading the numbers:
- **Traffic spike 26.–28.10.2026**: ~230 sessions in three days (146 on 27.10.) against 1–3 a day before; most of the 90-day total (430 sessions). 125 sessions were direct, 27 came from `forum.zlb.de` (a login-protected ZLB Discourse forum, so the post cannot be read; the referrer path is always `/`), 27 from google.com; 140 on mobile, 179 in Germany. Almost all data for the filter page (27.10.), `branches-expand` (24.10.), library outbound clicks (17.10.) and `showcase-click` comes from these first-time visitors, so it shows how new visitors behave, not a long-term baseline. Re-read after the spike has faded.
- Test clicks fired by Claude before `umami.disabled` was set (3 and 9 Sep) inflate `showcase-click`, `search-load-more` and probably one `search-next-page`.
- Traffic is low (~370 visitors/90 days), so single-digit counts say little. Compare against visitors who reached the relevant page, not total events.
- **Search events before 09.10.2026 are inflated ~60%**: `handleSearch` called `router.replace`, the `route.query.q` watcher in `app/pages/index.vue` saw `mediaStore.lastQuery` still unset (it is only set after the `/api/search` response) and ran the search again (second scrape too). Export 29.06.–09.10.: 580 search events, ~364 real searches (duplicates arrive 0 s apart), and quick-chip clicks were also logged as `search-started`. Fixed 09.10. with an in-flight guard; compare only counts from after the deploy.
- Events started 03.07., so the 90-day window (from 11.07.) misses the first week of `search-started` and `toggle-faq`.
- Showcase (IDs hardcoded in `app/components/Showcase.vue`) and load-more are the September experiments: question to answer is whether they get used by real visitors; if not, remove the feature, not just the event.

## Design backlog

From a design review on 12.10.2026. Goal: the UI currently reads as stock Tailwind / AI-generated and shows raw catalog data. Done so far (see `TODO.md` → DONE): Lucide icons, the intro photo, one `max-w-2xl` column without the single-tab nav, loading/empty states, text contrast, and the detail page redesign (16.10.).

**The detail page is now the reference for the rest of the app.** It has a text-only header (eyebrow `text-xs uppercase tracking-wider`, title `text-3xl md:text-4xl`, subtitle stacked on its own line via `MediaTitle stacked`, author `text-xl`, ISBN `text-sm`), a flat branch list (`divide-y`, `hover:bg-gray-50`, status pill plus a separate note line, no cards) and Lucide arrows/chevrons. The open items below should move the other pages toward it. Ordered roughly from small to big; tick off by deleting the line and noting it in `TODO.md` → DONE.

6. **Design tokens** in `@theme` in `app/assets/style.css`: one typeface (consider a serif for titles; inspiration: https://literal.club/ for its serif, Libre Baskerville, and its minimalist design), one non-Tailwind-blue accent, two radii, shadows only on hover. Start from the type scale the detail page already uses. Remove one-offs (`#5b8dee` gradient in `About.vue`, black `.btn-primary` vs blue search button).
7. **Bring the flat list style to the remaining cards.** Done: branch list on the detail page, library page (20.10.). Open: result rows (`MediaItem.vue`, also used by `Showcase.vue`: still `rounded-xl border shadow-sm` per item), `ZipCode.vue`, `AppIntro.vue` and `About.vue`. Decision: the detail header dropped the media-type icon, but result rows still show VÖBB's grey type icons. Drop them there too (text only, consistent) or keep them until covers (#9) replace them.
9. **Covers via ISBN** (see `TODO.md` for sources and the referrer problem): biggest visual lever, but GDPR (proxy through our server), Vercel timeout budget and missing covers for games/Tonies need a fallback. The text-only detail header has no slot for a cover yet; decide placement (beside the title or above it) together with #7's icon decision.
10. **Wordmark and favicon** instead of plain `font-black` text and the placeholder favicon (`public/favicon.svg`, a Lucide zap).
