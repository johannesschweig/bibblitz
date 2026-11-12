# Analytics (Umami)

Pipeline scripts and the feature inventory with usage numbers. Read it for `/umami-session-review`, the keep/kill re-checks and when adding a tracking event (add it to `FEATURES` in `scripts/umami/digest.mjs` and to the tables below). How to call `useUmami().track(event, data)` and the `data-domains` setup are in `CLAUDE.md`.

## Pipeline

`npm run umami -- --days 90` (`scripts/umami/fetch.mjs`) pulls stats, metrics, event properties and raw events from the Umami Cloud API into `data/umami/<date>/` (gitignored) and writes `data/umami/latest/digest.json` (`scripts/umami/digest.mjs`: dedup of known tracking artefacts, session funnel, weekly trend, features that never fired). Auth is the dashboard's public share link in `.env` as `UMAMI_SHARE_URL` (website settings → Share URL; the free Umami Cloud plan has no API keys, `UMAMI_API_KEY` is supported for paid plans). The script trades the link for a read-only token the way the shared dashboard does, so anyone with the link can read the same data: revoke it by turning the share URL off. `npm run umami:digest` rebuilds the digest from an existing snapshot. `data/umami/latest/digest.json` is what to read for usage questions (no skill for it). A new tracking event goes into `FEATURES` in `digest.mjs` too, otherwise it shows up as `unknownEvents`. A failing endpoint does not abort the run, it is listed in `meta.json` and the digest warnings.

`npm run umami:journeys -- --out <dir outside data/umami>` (`scripts/umami/journeys.mjs`) exports the visits after `reviewedUntil` in `scripts/umami/review-state.json` as readable journeys with flags (one API call per custom event for its properties). The `/umami-session-review` skill uses it: it reads the unreviewed journeys, verifies suspected UX problems on localhost, adds them to the `TODO.md` problem table and moves `reviewedUntil` forward.

`npm run umami:campaigns` (`scripts/umami/campaigns.mjs`, registry `scripts/umami/campaigns.json`) builds the marketing report `docs/campaigns.md` from the `?ref=` tag on the entry page; see the `campaign-report` skill.

## Feature inventory & usage (Umami)

Umami snapshot taken 09.10.2026 (dashboard "bibblitz", range "Last 90 days" = 11.07.–09.10.2026; `date=all` and custom `date=a:b` ranges crash Umami's UI, use `date=90day`). Overall: 373 visitors, 432 visits, 1.65k views, bounce 53%. Of these only 159 visitors fired at least one custom event (843 events). Re-check around **06.11.2026** and decide which features/events to keep or kill.

How to read the "Umami indicator" column: **event** = custom event (Events tab, counts only, no unique visitors); **URL** = Overview → Pages, or filter `?date=90day&path=c./media/` ("contains"). Visitor counts of a URL group are deduplicated, row sums are not.

### Search & results (home `/`)

| Feature | Introduced | Umami indicator | Usage (90d) | Notes |
|---|---|---|---|---|
| Text search | 15.06. | event `search-started` (tracked since 03.07.; since 09.10. fires after the response with `results` count and `error: 1` on failure) | 497 raw, ~300-350 real | core, keep. Use `results: 0` to find dead-end searches |
| ISBN search (ISBN-10/13, hyphens, "ISBN" prefix; normalized to ISBN-13 in `search.get.ts`) | 15.10. | event `search-started` with `isbn: 1` | n/a, new | before 15.10. plain ISBNs already worked, but not ISBN-10 for records catalogued with ISBN-13 or a prefixed "ISBN" |
| Quick-search chips | 07.07. | event `search-quick` | 18 | ~4% of searches |
| Media-type filter | 22.07. (aggregation 20.08.; moved to the filter page and made a VÖBB filter 27.10., single-select) | event `filter-media-type` (`media_type`, `results`) | 29 | ~6% of searches. Before 27.10. it only filtered the loaded rows (16-22 of up to thousands of hits) |
| Filter page: language (Deutsch, Englisch, Französisch) and media type (14 chips, fixed lists), both applied by VÖBB, behind the "Filter" button | 27.10. | events `filter-open` (`source`: button / empty-state), `filter-apply` (`results`, `language`, `media_type`, `reset: 1` when cleared, `error: 1`), `filter-language` and `filter-media-type` (only on a successful apply; own events because Umami counts sessions per event name, not per property), `filter-reset` (reset inside the dialog); `search-started` carries `language` / `media_type` when a filter is active. The chip "Spiel" (board and card games, Memory, puzzles, kits) was renamed "Gesellschaftsspiel" on 28.10.2026 because people read it as "all games"; events before carry `media_type: Spiel`, old `?type=Spiel` links are mapped | n/a, new | requested by users. Dead ends: `filter-apply` with `results` 0. **Decision on 22.12.2026**: keep the language filter if `filter-language` has at least 8 events from at least 5 sessions (the digest's `decisions.languageFilter` shows `events`, `sessions`, `met`); only then consider the language as an inline choice under the search field. Otherwise remove the language chips (the media-type filter stays) |
| "Weitere Treffer laden" (pagination) | 09.09. | event `search-next-page` (with `page`) | 8 | too new, re-check |
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
| Wecker (shelf watch, e-mail alert when a copy is free): opened, submitted | 12.11.2026 | events `watch-open` (`libraries`, `nothing_free_near`, `zip_default`) and `watch-submit` (`libraries`, `preselected_unchanged`, `zip_default`) | snapshot 13.11.2026 (12.-13.11.): `watch-open` 1 (1 session) against 112 `detail-view` in 61 sessions, `watch-submit` 0 | the funnel is `detail-view` → `watch-open` → `watch-submit`; `preselected_unchanged` 1 means the ZIP-based default was taken as it was. Johannes's own test watches do not show up (set through the API, tracking off on his devices). Plan and success rule: `docs/shelf-watch.md` |
| Wecker: confirmed, switched off, return from an alert mail | 12.11.2026 (`watch-return` 13.11.) | events `watch-confirm` (the visit from the confirmation mail, after the call worked), `watch-stop`, `watch-return` (a detail page opened with `?ref=wecker`, the link in the alert mail; `status`, `available_now` = free copies on arrival) | snapshot 13.11.2026: all three 0 | `watch-confirm` ÷ `watch-submit` is the share that finds the mail and clicks it; `watch-return` is the share of alerts that bring someone back and whether the copy was still there. The Wecker is a feature, **not a campaign**: `wecker` is in `ignore` of `scripts/umami/campaigns.json`, so `npm run umami:campaigns` leaves it out of every number and does not warn about an unregistered ref. **Not built yet, deliberately:** a funnel view in the digest (record viewed → opened → submitted → confirmed → returned) and server-side counters (alerts and mails sent, expired, failed); build both once people sign up, see I18 in `TODO.md`. Until then the ntfy message after each timer run shows alerts sent per run |
| Detail outcome | 09.10. | event `detail-view` (`status` ok/empty/failed/error, `failed` since 29.10. = record known from the search row but its copies could not be fetched, before that logged as `empty`; `branches`, `available_now`, `nearest_available_km`, `zip_default` 0/1) | n/a, new | measurement only: shows detail fetch failures, how often nothing is available nearby, and how many viewers still use the default ZIP 10178 |
| Language line on the detail page ("Sprache Deutsch · Englisch") | 27.10. | none | n/a | passive, matches the language filter |
| ISBN on detail page (plain text, not styled as a link; click does nothing yet) | 15.10. | event `isbn-click` | n/a, new | if people click it, link it to an ISBN search (also finds duplicate records of the same edition, with their own copies and availability) |
| Cover on detail page and in result rows (via our proxy `/api/cover/<id>`, from VÖBB's cover service; rows show a media-type tile when there is none, the detail page shows nothing) | 04.11. | event `cover-click` (detail page only; the cover is not clickable, so a click means "wants to enlarge it") | n/a, new | if people click it, add a lightbox with the `m`/`l` size. Covers exist for about 45% of result rows, almost only books (spike 04.11.), see `TODO.md` I2 |
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
- Test clicks fired by Claude before `umami.disabled` was set (3 and 9 Sep) inflate `showcase-click` and probably one `search-next-page`.
- Traffic is low (~370 visitors/90 days), so single-digit counts say little. Compare against visitors who reached the relevant page, not total events.
- **Search events before 09.10.2026 are inflated ~60%**: `handleSearch` called `router.replace`, the `route.query.q` watcher in `app/pages/index.vue` saw `mediaStore.lastQuery` still unset (it is only set after the `/api/search` response) and ran the search again (second scrape too). Export 29.06.–09.10.: 580 search events, ~364 real searches (duplicates arrive 0 s apart), and quick-chip clicks were also logged as `search-started`. Fixed 09.10. with an in-flight guard; compare only counts from after the deploy.
- Events started 03.07., so the 90-day window (from 11.07.) misses the first week of `search-started` and `toggle-faq`.
- Showcase (IDs hardcoded in `app/components/Showcase.vue`) and load-more are the September experiments: question to answer is whether they get used by real visitors; if not, remove the feature, not just the event.
