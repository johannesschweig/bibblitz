# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BibBlitz (bibblitz.de) — a Nuxt 4 / Vue 3 / Tailwind 4 front end for the Berlin public library network VÖBB. There is no VÖBB API; the server routes scrape `voebb.de` (aDISWeb) HTML with cheerio. UI copy is in German; write all code comments and test names in English (German only for quoted UI strings or scraped VÖBB labels).

## Commands

- `npm run dev` — runs `vercel dev` (needs Vercel CLI auth/link). For a plain Nuxt dev server use `npx nuxt dev --port 3210` (this is what `.claude/launch.json` uses).
- `npm run build` / `npm run generate` / `npm run preview` — standard Nuxt.
- `npm test` — Vitest with `@nuxt/test-utils` (`environment: 'nuxt'`), tests in `test/`. Page tests use `mountSuspended` and fake `/api/*` with `registerEndpoint`, so they never hit voebb.de. No linter or formatter is configured.
- `CARTO_API_KEY` env var (in `.env`, gitignored) is exposed as `runtimeConfig.public.cartoApiKey` for the Leaflet/CARTO map tiles.
- Deployed on Vercel; server routes must stay within its ~10s function limit (detail fetch uses a 4.5s timeout for this reason).
- Commit messages: one short lowercase subject line, no body unless the why isn't obvious from the diff (then max 2–3 lines).

## Architecture

**Scraping layer (`server/api/`)**
- `search.get.ts` — emulates a browser session against aDISWeb: GET home page for `identity` token → POST search form → parse results (`parseResultsPage`). Pagination ("load more") is stateless on our side: the response includes a base64url `token` encoding the VÖBB `identity`, `requestCount`, form action URL and the serialized tough-cookie jar; passing `?token=` replays the session and "clicks" the next-page toolbar button. `?q=` starts a new search.
- `detail.get.ts` — fetches one record by numeric ID (`SAK<id>` direct link) and parses metadata (media type, author, ISBN) and per-branch availability, then runs it through `utils/availability.ts`.
- `server/routes/sitemap.xml.ts`, `robots.txt.ts` — SEO routes; sitemap is generated from `app/assets/libraries.json`.
- axios + cookiejar packages are force-inlined in `nuxt.config.ts` (`nitro.externals.inline`) so they bundle correctly on Vercel — keep this when touching those deps.

**Shared logic (`utils/`, `types/`)** — at the repo root (not under `app/`), imported by both server and client. `utils/availability.ts` matches scraped branch names to `app/assets/libraries.json` (fuzzy name matching), computes `daysToWait` from VÖBB status strings, distance to the user's ZIP and sorting/badge config. `mediaTypeMapping.ts` normalizes/aggregates media type labels for the filter. `catalogText.ts` cleans VÖBB catalog text (ISBD): it strips format notes like `[Hörbuch]` and extracts the platform, but never drops text after ` : ` (can be part of the name; `MediaTitle.vue` only styles it lighter). The author is the statement of responsibility from the result row (`.rList_name`, for games it is the publisher), cleaned heuristically — the detail page's contributor list can start with the translator. Test cases are real records in `test/unit/catalogText.test.ts`; add new misses there.

**Client state (Pinia, `app/stores/`)**
- `itemCacheStore` — central `id → MediaItem` dictionary; search results push basic data in, `fetchDetails(id)` lazily calls `/api/detail` and merges (dedupes concurrent fetches via `fetching`). Don't refetch if `availability` is already present.
- `mediaStore` — only holds search result ID lists, `lastQuery`, pagination token/state (`executeSearch`, `loadMore`); item data lives in the cache.
- `userStore` — user ZIP/coords, persisted in `localStorage` (`bibblitz_zip`), validated against `app/assets/berlinZipCodes.json`. No accounts/auth (watchlist and Supabase sync were removed, though `@nuxtjs/supabase` remains in package.json).

**Pages** — `index` (search + showcase), `media/[id]` (detail/availability), `library/[id]` (library pages, SEO), `imprint`, `data-privacy`, `dev` (toggle to disable Umami tracking on this device).

**Icons** — Lucide via `@nuxt/icon` (`<Icon name="lucide:search" />`), bundled into the client (`clientBundle.scan`, `fallbackToApi: false`), so no requests to the Iconify API (GDPR). Favicon is `public/favicon.svg` (Lucide zap).

**Analytics** — Umami loaded via script in `nuxt.config.ts`; use the `useUmami().track(event, data)` composable. The script has `data-domains="bibblitz.de,www.bibblitz.de"`, so localhost and preview deployments never send data. Only for browser testing on the live bibblitz.de set `localStorage['umami.disabled']='1'` first (or use `/dev`).

`TODO.md` is the product backlog/ideas log (known scraping edge cases are listed there).

## Accessibility: text contrast

All text must meet **WCAG 2.2 AA**: contrast of at least **4.5:1**, or **3:1** for large text (>= 24px, or >= 18.66px and bold). This includes input placeholders, eyebrow labels and the small 10–12px text. Disabled controls are exempt. Non-text graphics (icons, borders) should reach 3:1 when they carry meaning on their own; the decorative icons in `AppIntro.vue` are not audited and get replaced in design backlog #8.

Rules of thumb for Tailwind 4 colours (all measured, not guessed):
- Muted text: `text-gray-500` is the lightest allowed on white and page background (about 4.8:1). On tinted backgrounds (`bg-gray-100`, `bg-*-50`) use `text-gray-600` or darker. `text-gray-400` (2.5:1) is never OK for text, placeholders included (`placeholder:text-gray-500`).
- Coloured text: use the `-700`/`-800` step (`text-blue-700`, `text-red-700`, `text-emerald-800`, `text-green-700`). `-400`/`-500` and `text-emerald-600`, `text-red-500`, `text-green-600` fail. `text-blue-600` (links, `.link`) passes on white and `slate-50`.
- No `opacity-*` on text (it lowers contrast silently), no light-grey text on translucent or gradient backgrounds without measuring.
- `StatusPill` tones pair `-800/-900` text with `-50/-100` backgrounds; keep that pairing when adding a tone.

How to check: `scripts/contrast-audit.js` defines `window.__audit(label)` for the running app. Paste it into the browser console (or the Claude browser pane's javascript tool), call `__audit('page name')` and fix everything it lists. It reads the computed colours (oklch, translucent backgrounds, opacity), so it is exact, unlike a visual check. Run it on every page **and** every state that shows different text: home with FAQ items opened, results (scrolled so all badges loaded), filtered results, no results, detail page with a saved ZIP and with the ZIP editor open, library pages with and without a saved ZIP (the distance block only shows with a saved ZIP), `/dev` in both states. Navigate client-side (`$router.push`) so `window.__audit` survives. After a state change wait ~300 ms, otherwise buttons mid-transition (`transition-all`) show up as false positives. Last full audit: 16.10.2026, no failures.

## Feature inventory & usage (Umami)

Umami snapshot taken 09.10.2026 (dashboard "bibblitz", range "Last 90 days" = 11.07.–09.10.2026; `date=all` and custom `date=a:b` ranges crash Umami's UI, use `date=90day`). Overall: 373 visitors, 432 visits, 1.65k views, bounce 53%. Of these only 159 visitors fired at least one custom event (843 events). Re-check around **06.11.2026** and decide which features/events to keep or kill.

How to read the "Umami indicator" column: **event** = custom event (Events tab, counts only, no unique visitors); **URL** = Overview → Pages, or filter `?date=90day&path=c./media/` ("contains"). Visitor counts of a URL group are deduplicated, row sums are not.

### Search & results (home `/`)

| Feature | Introduced | Umami indicator | Usage (90d) | Notes |
|---|---|---|---|---|
| Text search | 15.06. | event `search-started` (tracked since 03.07.; since 09.10. fires after the response with `results` count and `error: 1` on failure) | 497 raw, ~300-350 real | core, keep. Use `results: 0` to find dead-end searches |
| ISBN search (ISBN-10/13, hyphens, "ISBN" prefix; normalized to ISBN-13 in `search.get.ts`) | 15.10. | event `search-started` with `isbn: 1` | n/a, new | before 15.10. plain ISBNs already worked, but not ISBN-10 for records catalogued with ISBN-13 or a prefixed "ISBN" |
| Quick-search chips | 07.07. | event `search-quick` | 18 | ~4% of searches |
| Media-type filter | 22.07. (aggregation 20.08.) | event `click-media-filter` | 29 | ~6% of searches |
| "Weitere Treffer laden" (pagination) | 09.09. | event `search-next-page` (with `page`) | 8 (+2 `search-load-more`, old name) | too new, re-check |
| Availability badge + media-type icons in results | 16.06. / 06.07. | none | n/a | passive, part of every result |
| ZIP entry (distance sorting) | 16.06. (inline entry 09.07.) | event `zip-save` | 34 | ~9% of visitors, persists in `localStorage` |

### Home page content (below the search)

| Feature | Introduced | Umami indicator | Usage (90d) | Notes |
|---|---|---|---|---|
| Intro / empty state (`AppIntro`) | 26.06. | none | n/a | passive |
| Showcase (popular media tiles) | 03.09. | event `showcase-click` | 1 (likely a Claude test click) | **deletion candidate** (decide at 06.11. re-check, do not delete before). Tiles go to `/media/<id>`; check `/media/00224031`, `/media/35168840`, `/media/34112359`, `/media/07235286`, `/media/01392424` (2, 2, 2, 1, 1 visitors) |
| FAQ accordion | 02.07. (tracking 04.07.) | event `toggle-faq` (with FAQ `id`) | 245 raw; replaying clicks per visit from the export gives ~20% fewer real opens (closes were counted until 09.10.) | all-time opens by item (export 09.10.): `fewer-results` 51, `app-store` 42, `data-source` 37, `data-storage` 33, `distance` 30, `i-have-question` 15 (+12 for removed `sync-watchlist`). 68 sessions (~13% of home sessions) opened any item, 27 of them read 4+ items. `i-have-question` was the weakest and **removed 09.10.2026** (mail is also in About, imprint, privacy); next weakest: `distance`, `data-storage` (covered by privacy page) |
| About section | 20.07. | none | n/a | added because people visited the imprint; `/imprint` still has 19 visitors |

### Media detail (`/media/<id>`)

| Feature | Introduced | Umami indicator | Usage (90d) | Notes |
|---|---|---|---|---|
| Detail page with branch availability | 15.06. | URL `/media/*` | 120 visitors / 611 views (~32% of visitors) | core, keep. 91% arrive from bibblitz.de, so almost no direct/SEO traffic |
| Branch sorting by distance, due-days / overdue labels, hide far branches | 16.06. / 28.06. / 03.07. | none (part of detail page) | n/a | |
| "↗ VÖBB" link button | 03.07. (tracking 09.10.) | event `voebb-click` (`available_now`, `zip_default`) | n/a, new | the closest thing to a conversion: BibBlitz cannot reserve, so this is where the user acts on the result |
| Detail outcome | 09.10. | event `detail-view` (`status` ok/empty/error, `branches`, `available_now`, `nearest_available_km`, `zip_default` 0/1) | n/a, new | measurement only: shows detail fetch failures, how often nothing is available nearby, and how many viewers still use the default ZIP 10178 |
| ISBN on detail page (plain text, not styled as a link; click does nothing yet) | 15.10. | event `isbn-click` | n/a, new | if people click it, link it to an ISBN search (also finds duplicate records of the same edition, with their own copies and availability) |
| Author click (search by author) | 09.07. | event `author-click` | 2 | **deletion candidate** (decide at 06.11. re-check, do not delete before) |
| Branch click → library page | 10.07. | none (see library URL) | n/a | |

### Library pages (`/library/<id>`)

| Feature | Introduced | Umami indicator | Usage (90d) | Notes |
|---|---|---|---|---|
| Library page (address, opening/service hours, website) | 10.07. | URL `/library/*` | 51 visitors / 146 views (~14% of visitors), 5 from google.com | SEO play via sitemap (23.07.); top pages: AGB 11, Hansabibliothek 5 |
| Library map (Leaflet / CARTO) | 11.07. | none (part of library page) | n/a | needs `CARTO_API_KEY` |
| Sitemap / robots routes | 23.07. | none | n/a | 5 google visitors on library pages is the only SEO signal so far |

### Static & dev pages

| Feature | Introduced | Umami indicator | Usage (90d) | Notes |
|---|---|---|---|---|
| Imprint | 30.06. | URL `/imprint` | 19 visitors | legal, keep |
| Data privacy | 30.06. | URL `/data-privacy` | 4 visitors | legal, keep |
| `/dev` tracking opt-out | 28.06. | none (own visits are excluded) | n/a | dev tool |

### Removed

| Feature | Introduced → removed | Umami leftovers |
|---|---|---|
| Watchlist / bookmarks / account sync | 19.05. → 22.07. | event `bookmark-button-clicked` (5), URL `/watchlist` (5 visitors still arrive, now a dead page) |
| Share button | 13.07. → 09.10. | event `share-media` (2) |
| Library click event | 09.07. → 13.07. | event `library-click` (20, only in the export, 4 sessions on 09.07.) |

Caveats when re-reading the numbers:
- Test clicks fired by Claude before `umami.disabled` was set (3 and 9 Sep) inflate `showcase-click`, `search-load-more` and probably one `search-next-page`.
- Traffic is low (~370 visitors/90 days), so single-digit counts say little. Compare against visitors who reached the relevant page, not total events.
- **Search events before 09.10.2026 are inflated ~60%**: `handleSearch` called `router.replace`, the `route.query.q` watcher in `app/pages/index.vue` saw `mediaStore.lastQuery` still unset (it is only set after the `/api/search` response) and ran the search again (second scrape too). Export 29.06.–09.10.: 580 search events, ~364 real searches (duplicates arrive 0 s apart), and quick-chip clicks were also logged as `search-started`. Fixed 09.10. with an in-flight guard; compare only counts from after the deploy.
- Events started 03.07., so the 90-day window (from 11.07.) misses the first week of `search-started` and `toggle-faq`.
- Showcase (IDs hardcoded in `app/components/Showcase.vue`) and load-more are the September experiments: question to answer is whether they get used by real visitors; if not, remove the feature, not just the event.

## Design backlog

From a design review on 12.10.2026. Goal: the UI currently reads as stock Tailwind / AI-generated and shows raw catalog data. Ordered from small and self-contained to bigger decisions; do them roughly in this order (content and consistency first, brand later). Tick off by deleting the line and noting it in `TODO.md` → DONE.

**Needs decisions**
6. **Design tokens** in `@theme` in `app/assets/style.css`: one typeface (consider a serif for titles), one non-Tailwind-blue accent, two radii, shadows only on hover. Remove one-offs (`#5b8dee` gradient in `About.vue`, emerald heading on library pages, black `.btn-primary` vs blue search button).
7. **Results as a list, not cards**: dividers instead of `rounded-xl border shadow-sm` per item.
8. **Replace the AI illustration** `public/search-borrow.png` (619 px, `opacity-90`, generic generated look) with a real screenshot/GIF of the availability view, an own photo of a Berlin library, or nothing. Rewrite `AppIntro.vue` from three generic emoji bullets into one concrete sentence.
9. **Covers via ISBN** (see `TODO.md` for sources and the referrer problem): biggest visual lever, but GDPR (proxy through our server), Vercel timeout budget and missing covers for games/Tonies need a fallback.
10. **Wordmark and favicon** instead of plain `font-black` text and the ⚡ emoji.
