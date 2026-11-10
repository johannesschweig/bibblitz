# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BibBlitz (bibblitz.de) — a Nuxt 4 / Vue 3 / Tailwind 4 front end for the Berlin public library network VÖBB. There is no VÖBB API; the server routes scrape `voebb.de` (aDISWeb) HTML with cheerio. UI copy is in German; write all code comments and test names in English (German only for quoted UI strings or scraped VÖBB labels).

## Commands

- `npm run dev` — runs `nuxt dev`. `.claude/launch.json` uses `npx nuxt dev --port 3210`.
- `npm run build` / `npm run generate` / `npm run preview` — standard Nuxt.
- `npm test` — Vitest with `@nuxt/test-utils` (`environment: 'nuxt'`), tests in `test/`. Page tests use `mountSuspended` and fake `/api/*` with `registerEndpoint`, so they never hit voebb.de. No linter or formatter is configured.
- `MOCK_VOEBB=1` in `.env` (dev only, restart the dev server): `/api/detail` returns fixtures from `server/utils/mockDetail.ts` instead of scraping voebb.de, for working on the detail page during VÖBB maintenance. Any `/media/<id>` works; `00000001` has no copies, `00000002` has a very long title and no author/ISBN, `34758158` has a long note. Has no effect in production builds. Search is not mocked, so open `/media/<id>` directly.
- `CARTO_API_KEY` env var (in `.env`, gitignored) is exposed as `runtimeConfig.public.cartoApiKey` for the Leaflet/CARTO map tiles.
- Hosting: Fly.io app `bibblitz` (personal org, legacy free allowance), one always-on `shared-cpu-1x` 256 MB machine in Frankfurt (`fra`) with 512 MB swap, built from `Dockerfile` (runs `npm test`, then a `node-server` build). A push to `main` deploys via `.github/workflows/deploy.yml` (secret `FLY_API_TOKEN`); by hand `fly deploy`. Logs: `fly logs -a bibblitz`. DNS is at Namecheap: `bibblitz.de` A/AAAA and `www` CNAME `bibblitz.fly.dev`; `server/middleware/canonical-host.ts` redirects the bare domain to www. Memory measured 10.11.2026: ~100 MB idle, 228 MB peak at 16 parallel requests, so keep heavy in-memory caches out. Nothing caches at a CDN any more: `s-maxage` headers only reach browsers (TODO I31). The old Vercel project is paused, not deleted.
- Commit messages: one short lowercase subject line, no body unless the why isn't obvious from the diff (then max 2–3 lines).
- Git workflow: work in regular branches in the main checkout (`git switch -c <name>`), never in git worktrees (no `EnterWorktree`, no sessions with `use_worktree: true`). Merge the branch into `main` when the work is done, then delete it.

## Architecture

**Scraping layer (`server/api/`)**
- `search.get.ts` — emulates a browser session against aDISWeb: GET home page for `identity` token → POST search form → parse results (`parseResultsPage`). Pagination ("load more") is stateless on our side: the response includes a base64url `token` encoding the VÖBB `identity`, `requestCount`, form action URL and the serialized tough-cookie jar; passing `?token=` replays the session and "clicks" the next-page toolbar button. `?q=` starts a new search. `?lang=` / `?type=` filters are applied by VÖBB itself from the fixed lists in `utils/filterOptions.ts`; the mechanics and pitfalls are in `docs/search-and-filters.md`.
- `detail.get.ts` — fetches one record by numeric ID (`SAK<id>` direct link) and parses metadata (media type, author, ISBN) and per-branch availability, then runs it through `utils/availability.ts`. It also reads the `Sprache` row (`languages`), shown as a line under the ISBN (the `Sprache Original` row is deliberately not shown).
- Maintenance: while VÖBB is switched off, every aDISWeb URL redirects to a static `/wartung/` page. `utils/maintenance.ts` detects it (and reads the end of the window); `search`/`detail` then return `{ success: false, maintenance: true, until }` and `status.get.ts` (cached 60 s) lets `voebbStatusStore` show a banner (`MaintenanceNotice.vue`) before anyone searches. Any new scraper route must check `isMaintenancePage` first.
- `server/routes/sitemap.xml.ts`, `robots.txt.ts` — SEO routes; sitemap is generated from `app/assets/libraries.json`.
- axios + cookiejar packages are force-inlined in `nuxt.config.ts` (`nitro.externals.inline`) so they bundle into the self-contained `.output` (the Docker runtime stage has no `node_modules`) — keep this when touching those deps.

**Shared logic (`utils/`, `types/`)** — at the repo root (not under `app/`), imported by both server and client. `utils/availability.ts` matches scraped branch names to `app/assets/libraries.json` (fuzzy name matching), computes `daysToWait` from VÖBB status strings, distance to the user's ZIP and sorting/badge config. `mediaTypeMapping.ts` normalizes/aggregates media type labels for the filter. `catalogText.ts` cleans VÖBB catalog text (ISBD): it strips format notes like `[Hörbuch]` and extracts the platform, but never drops text after ` : ` (can be part of the name; `MediaTitle.vue` only styles it lighter). The author is the statement of responsibility from the result row (`.rList_name`, for games it is the publisher), cleaned heuristically — the detail page's contributor list can start with the translator. Test cases are real records in `test/unit/catalogText.test.ts`; add new misses there.

**Client state (Pinia, `app/stores/`)**
- `itemCacheStore` — central `id → MediaItem` dictionary; search results push basic data in, `fetchDetails(id)` lazily calls `/api/detail` and merges (dedupes concurrent fetches via `fetching`). Don't refetch if `availability` is already present.
- `mediaStore` — only holds search result ID lists, `lastQuery`, pagination token/state (`executeSearch(query, languages)`, `loadMore`), and the filter state (`languages` / `mediaTypes` as VÖBB applied them, kept as requested when a request fails so "Erneut versuchen" reuses them; the values come from `utils/filterOptions.ts`); item data lives in the cache.
- `userStore` — user ZIP/coords, persisted in `localStorage` (`bibblitz_zip`), validated against `app/assets/berlinZipCodes.json`. No accounts/auth (watchlist and Supabase sync were removed, though `@nuxtjs/supabase` remains in package.json).

**Pages** — `index` (search + showcase), `media/[id]` (detail/availability), `library/[id]` (library pages, SEO), `imprint`, `data-privacy`, `dev` (toggle to disable Umami tracking on this device). The filter UI is `FilterPage.vue`, a fullscreen dialog opened by the "Filter <n>" button under the search; see `docs/search-and-filters.md`.

**Icons** — Lucide via `@nuxt/icon` (`<Icon name="lucide:search" />`), bundled into the client (`clientBundle.scan`, `fallbackToApi: false`), so no requests to the Iconify API (GDPR). Favicon is `public/favicon.svg` (Lucide zap).

**Analytics** — Umami loaded via script in `nuxt.config.ts`; use the `useUmami().track(event, data)` composable. The script has `data-domains="bibblitz.de,www.bibblitz.de"`, so localhost and preview deployments never send data. Only for browser testing on the live bibblitz.de set `localStorage['umami.disabled']='1'` first (or use `/dev`).

`TODO.md` is the product backlog/ideas log (known scraping edge cases are listed there).

## Docs: read before working on these

Details that only matter for one kind of work live in `docs/`. Read the file first when the task touches its area.

- Search route filters (`?lang=` / `?type=`), `FilterPage.vue`, `mediaStore` filter state, filter lists → `docs/search-and-filters.md`
- Contrast rules in detail, how to run the audit and which states to cover → `docs/accessibility.md`
- Open design items (tokens, flat list style, covers, wordmark) → `docs/design-backlog.md`
- `libraries.json` (hours, service hours, website links), `npm run libraries:check`, the plan for a monthly Pi job → `docs/library-data.md`
- Marketing campaigns (`?ref=` links), report `npm run umami:campaigns`, refresh with the `campaign-report` skill → `docs/campaigns.md`
- Returning visitors who re-check a record or search, watch/bell lists, notifications, recent searches, Merkliste or list views (TODO I18, merged with I8, I10, I17) → `docs/shelf-watch.md`
- Umami pipeline, feature inventory, usage numbers, keep/kill decisions, adding a tracking event → `docs/analytics.md`

## Accessibility: text contrast

All text must meet **WCAG 2.2 AA**: at least 4.5:1 contrast (3:1 for large text), placeholders and small 10–12px text included. In practice: `text-gray-500` is the lightest allowed muted text (`-600` on tinted backgrounds), never `text-gray-400`; coloured text uses the `-700`/`-800` step; no `opacity-*` on text. The measured colour table and the audit script (`scripts/contrast-audit.js`, run it for UI changes) are in `docs/accessibility.md`.
