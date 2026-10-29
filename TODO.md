# TODO
- marketing first: blog post hacker news, linkedin, flyers (10x21cm, din lang)

# Problems from session reviews
Scored on 29.10.2026 from the session reviews of 26.10., 28.10. and 29.10. Re-score after each review (counts change, new items arrive).

**Score = reach × severity ÷ effort**, higher first. Rule on top: a confirmed bug that shows wrong information goes first, whatever its score (people act on it and lose trust).
- **Reach**: share of sessions in the review window that hit it, rounded to whole %. `≤` = upper bound (sessions that could hit it, not all did), `*` = no session observed, scored at the floor of one session (2%): a low score then means "no evidence", not "no value".
- **Severity**: 1 extra step / convenience, 2 dead end or wasted effort / unblocks a goal, 3 wrong information.
- **Effort**: S = 1 (up to 2 h incl. test), M = 2 (half a day to a day), L = 4 (more than a day, or needs a product decision or research first). Sizes assume Claude does the work; the `effort:` line says why and what the risk is.
- Scores within about 30% of each other are a tie. The window is small (52 sessions, one session is about 2 points), so treat the order as a guide.

| ID | Item | Reach | Sev | Effort | Score |
|---|---|---|---|---|---|
| P1 | Detail page fails to load the copies (retry button done, rest measuring first; re-scored 29.10., sev 2 → 1, remaining effort S) | 8% | 1 | S | 8 |
| P4 | No useful result and no way out (0 hits, junk rows) | 8% | 2 | M | 8 |
| I1 | People look for tools ("Bohrmaschine"), hint only | 6% | 1 | S | 6 |
| I16 | Add Humboldtschule (non-public school library) to libraries.json | 2%* | 2 | S | 4 |
| I4 | Keep opening hours of the libraries up to date | 2%* | 3 | M | 3 |
| P5 | Filter dead ends (0 hits, Videospiel chip) | 2%* | 2 | M | 2 |
| I9 | Open Graph tags for link previews | 2%* | 1 | S | 2 |
| I11 | Availability fails on SAK35371610 | 2%* | 2 | M | 2 |
| I12 | Title fails on SAK34234459 | 2%* | 2 | M | 2 |
| I13 | "Vollanzeige" as title on SAK15831927 | 2%* | 2 | M | 2 |
| I15 | Merge different versions of the same book/game | 4% | 2 | L | 2 |
| P6 | Multi-volume series are awkward to browse | 2% | 2 | L | 1 |
| I5 | Sort by publication date | 2%* | 1 | M | 1 |
| I6 | Wildcard search with `*` | 2%* | 1 | M | 1 |
| I16 | Store the records the app has seen (lazy catalogue) | 2%* | 1 | M | 1 |
| I8 | Instant notifications when available | 2%* | 2 | L | 1 |
| I14 | Standort column in availability | 2%* | 1 | M | 1 |
| I2 | Covers for books | 2%* | 1 | L | 0.5 |
| I3 | Events of libraries on the library page | 2%* | 1 | L | 0.5 |
| I7 | Rare finds / most borrowed media for a newspaper article | n/a | | | marketing, not scored |

Details per item (labels, use the ones that apply): `evidence:` counts, queries, record IDs · `cause:` · `repro:` · `plan:` / `ideas:` · `effort:` why this size, risk · `open:` what to find out next · `status:`. Raw journeys: `npm run umami -- --from <date> --out <dir outside data/umami>`.

## Problems

- **P1** detail page fails to load the copies and offers no way to retry (review 29.10.2026, re-assessed in the investigation the same day; first read as "false Keine Exemplare", which was wrong)
  - evidence: 4 of 78 detail views failed (Umami `detail-view` status `empty` x3, `error` x1), 4 of 52 sessions. Records 35477215 (34 branches after a reload), 35248610 (2 branches now), 35540903 (error, 91 branches on the next visit; takes ~3 s of the 4.5 s limit). All three `empty` views came 2-5 s after a search in the same session; the `error` one was a direct landing from Google. In none of them did the user see "Keine Exemplare gefunden." (that text only appears for a table with 0 rows).
  - cause 1 (what the user sees): a failed fetch leaves the search row's basic data in `itemCacheStore` without `availability`. The page then shows title + "Standorte konnten nicht geladen werden." (verified in the browser by failing `/api/detail` after a search) with no retry button; a direct landing shows the red "Fehler beim Laden" box, also without retry. Only a reload helps.
  - cause 2 (why the detail click fails): `fetchDetails` awaits an already running row-badge fetch for the same id and returns whatever it left behind, with no second attempt. A click 2-3 s after the search shares the fetch of the row that times out at 4.5 s.
  - cause 3 (the telemetry): `trackDetailView` sees `success` and 0 branches and logs `empty`, so the `empty` count mixes real no-copy records with failed fetches (`availability` undefined).
  - root: VÖBB hangs on parallel requests. Local test (29.10.): sequential fetches of the 3 records 6/6 ok; 2 parallel 3 of 8 timed out at 4.5 s, 4 parallel 5 of 16, 8 parallel 14 of 24, all timeouts, never a page without the copies table or with 0 rows (0 of 48 pages). So the "table missing" theory is not backed.
  - plan: (1) retry button on the detail page for both failure states (done 29.10.: "Erneut versuchen" calls `refresh()`, i.e. fetches again; hidden during maintenance); (2) in `fetchDetails`, if the awaited fetch left no `availability`, make one own attempt (open); (3) `detail-view`: status `failed` when `availability` is undefined, `empty` only for a real 0-row table (done 29.10., events before that mix both); (4) optional: server `retry` only if the first attempt was fast, to stay below the Vercel ~10 s limit (4.5 s x 2 + 0.3 s is already close)
  - real "no copies" cases (checked 29.10. against the 9 `empty` views of reviews 2 and 3): 3 are real. 06001824 has an empty copies table and VÖBB says "Es gibt keine bestellbaren Exemplare". 00100325 and 00162976 (both "Parzival") have exactly one copy, in "Humboldtschule (nicht öffentlich) - ist zurzeit geschlossen", which is not in `libraries.json`, so `filterAndEnrichBranches` drops it and the page says "Keine Exemplare gefunden." The other 6 (35549913, 35328099, 13799191, 35477215, 35540903, 35248610) now return 3, 54, 1, 34, 91 and 2 branches, so they were failed fetches. Idea: for the school-library case say that the only copy is in a non-public library (needs the dropped rows counted in `detail.get.ts`).
  - open (side finding 29.10.): an unknown id such as `/media/99999999` makes VÖBB return a news page instead of a record. We show its title ("Wissen zwischen Büchern vom 1.-10. November") with "Keine Exemplare gefunden." and log `empty`. A record withdrawn from the catalogue (old Google or shared links) would look the same. Not seen in the sessions so far; fix would be to treat a page without the record markup (`#R06` metadata table) as "Eintrag nicht gefunden".
  - effort: M, four small changes in store, page and tracking plus tests; the VÖBB flakiness itself stays, so the failure rate drops (retry) but does not vanish
  - decision 29.10. (Johannes): measure first, no further change now. Impact rated low (4 of 78 detail views, about one affected visitor every few days at normal traffic; with the retry button it is one extra tap). Re-read `detail-view` `failed` (share of detail views) after the retry button is deployed and a week has passed. Options kept for then: A = second own attempt in `fetchDetails` when the awaited row fetch left no copies (S; worst case ~9 s skeleton, failure chance p → ~p²), B = A plus "Eintrag nicht gefunden" for pages without the `#R06` record markup (re-verified 29.10.: `/media/99999999` returns a news page, 34819510 has `#R06`), C = only the not-found fix. Plan item 4 (longer server retry) dropped: `detail.get.ts` already retries once and a longer one hits Vercel's ~10 s limit
- **P2** "← Zurück" does nothing on a directly opened detail page (review 29.10.2026) - done 29.10.
  - evidence: 6 of 52 sessions started on `/media/<id>` (Google, Facebook fbclid, shared links)
  - cause: `$router.go(-1)` has no history in a fresh tab (checked in the browser pane)
  - done: "Zurück" moved into the navbar (left, logo centred) on every page but `/`, replacing the page-level buttons of the detail and library page. No history: `/`, on a library link with `?media=<id>` the book. Events `back-click` (`from`, `had_history`) tell how many arrive without history and press it. Test: `test/nuxt/navbar-back.test.ts`
- **P3** results get lost when going back via the logo (review 28.10.2026, quantified 29.10.) - resolved 29.10., decision: the logo keeps clearing the results
  - evidence: 34 of 109 searching sessions landed on an empty home after a detail/library page, 17 searched again within 90 s; 18 of 109 re-ran an identical query. Those sessions clicked through to VÖBB more often (38% vs 15%), so heavy users rather than lost conversions. Browser back and both "Zurück" buttons keep the results (checked).
  - cause: the "BibBlitz" logo clears the search on purpose (`AppNavbar.vue`)
  - ideas: on detail/library pages let the logo keep the results (clear only when already on the home page), or offer "Zurück zu den Treffern"
  - effort: S, but a product decision because clearing was requested earlier
  - status: resolved 29.10. by the navbar "Zurück" (3e63ff4), which keeps the results. Decision (Johannes): the logo keeps clearing them; a logo that returns to old results is unusual behaviour, so option A (keep results on detail/library) and B ("Zurück zu den Treffern") are not done. `logo-click` (`from`, `had_results`) stays as a measurement only; reopen only if it shows heavy use of the logo as "back". Umami fires no pageview on back navigation, so the earlier numbers were inferred
- **P4** searches with no useful result and no way out (review 29.10.2026)
  - evidence: 4 of 77 searches with 0 hits: "Bretman", "Bedlam beide" (the user then found it with "Bedlam bride"), "Bretman rock", "der stein der weisen, 13051" (ZIP typed into the search box). Review 28.10.: 9 of 250, e.g. "mc fadden" 0 hits vs "mcfadden" 1. The opposite case: "Bretmam" returns 22 unrelated rows ("Gesetzliche Krankenversicherung") without a hint that none matches.
  - ideas: on 0 hits retry once without digits/commas or with the words joined; hint when no result contains a query word
  - effort: M, a retry costs another VÖBB request (search takes ~3 s median); VÖBB offers no spell check or "did you mean"
- **P5** filter dead ends (review 28.10. + 29.10.2026)
  - evidence: 12 filter opens from 9 sessions, only 4 applied one (why the other 5 left is unknown). "Charles stross" + Englisch + Buch gave 0 hits (Englisch alone 1, not a book), the user left for the libraries page. "Star wars rebellion" + Spiel gave 0 hits, the user then found it under "Konsolenspiel". Language + type combinations often leave only 1-2 hits. Only 1 session in the 29.10. window, hence the floor.
  - status: done 28.10.: "Spiel" renamed "Gesellschaftsspiel" (chip and result rows; it is VÖBB's "Konventionelles Spiel": board and card games, Memory, puzzles, kits), old `?type=Spiel` links are mapped
  - open: PC games are "Computerspiel" (shown as "DVD" in rows, DVD-ROM), a "Konsolenspiel" search never finds them: merge Konsolenspiel + Computerspiel into one "Videospiel" chip (S)? Grey out (not hide) chips that would give 0 hits for the current search (VÖBB only lists facet values with hits, `resolveFilterIds` already knows)
- **P6** multi-volume series are awkward to browse (review 29.10.2026)
  - evidence: 1 session, but it needed 6 searches. "Yona Prinzessin 1." lists volumes in VÖBB's relevance order (1, 26, 11, 33, 22) and titles end in ". - 26.". Related to I15.
  - ideas: strip the ". - <volume>." suffix from the title and show the volume as its own label (S, `catalogText.ts` + test); sort volumes of one series by number
  - effort: L for the sorting (VÖBB order, not ours), S for the title suffix

# Contemplating / Ideas
- **I1** people look for tools
  - evidence: "Bohrmaschine" and "Bohrer" from 3 of 52 sessions (review 29.10.2026), the results are books about drills
  - ideas: a hint that the VÖBB catalogue only holds media; not a UI bug, watch whether it recurs before doing anything
  - effort: S for the hint text; it does not serve the need itself
- **I2** covers for books, e.g. https://www.voebb.de/vlb/cover/<isbn-wo-dashes>/m 200ms or open library https://covers.openlibrary.org/b/isbn/0385472579-M.jpg 600ms
  - evidence: no session asked for them; they would show in every result list (30 of 52 sessions searched), so the floor undersells the visual impact (design backlog #9)
  - covers on openlibrary are super sparse
  - voebb img needs a referrer (!headache): endpoint?
  - check google covers with api or some other service
  - effort: L, GDPR means proxying through our server, Vercel time budget, fallback for games/Tonies
- **I3** show events of libraries (e.g. readings, workshops) on the library page
  - evidence: none; library pages had 14% of visitors in the 90-day snapshot (09.10.)
  - effort: L, needs a data source per library and upkeep
- **I4** keep opening hours and service hours of the libraries up to date
  - evidence: none observed; they live in `app/assets/libraries.json`, so they go stale (severity 3 assumes the hours are wrong when stale)
  - open: check a sample of 10 libraries against their websites; that turns the floor into a measured number
  - effort: M, manual and recurring
- **I5** sort
  - nach erscheinungsdatum
  - add year (Veröffentlichung): probably done (DONE 12.10.: author + year from the search row), check and delete
  - effort: M, sorting only the loaded rows would mislead like the old media filter did; VÖBB's own sort would need a new scrape step
- **I6** wildcard search with * (not sure if voebb supports it)
  - effort: M; testing whether aDISWeb supports it is S, decide after that
- **I7** seltenes fundstück / meistausgeliehene medien für artikel in der zeitung (marketing, not scored)
- **I8** instant notifications when available: in app (native) or via email or in telegram
  - evidence: none; the watchlist was removed 22.07. because nobody used it (speaks against)
  - bell functionality: add a bell to a exemplar. if you load the page all bells are loaded. you get a popup with the bells that are green.
  - bell for a search?
  - effort: L, storage plus push/email infrastructure, GDPR
- **I9** open graph im head für link previews
  - evidence: 6 of 52 sessions started on a detail page, partly from shared links (Facebook); whether the preview mattered is not measurable in sessions
  - effort: S
- **I10** show people their recent searches - dropped for now 29.10. (Johannes: the navbar "Zurück" from 3e63ff4 already keeps the results, so the need is covered; reopen only if the next review still shows identical re-searches)
  - evidence: same sessions as P3 (18 of 109 re-ran an identical query, measured before the navbar Zurück); do not count both reaches
  - option evaluated 29.10. (not built): "Zuletzt gesucht" chips (max 5, only queries with hits, query text without filters) in the empty home state next to the suggestions, "Verlauf löschen", event `search-recent`, short privacy note (the privacy page does not mention our own localStorage yet, not even the ZIP). Alternatives: native `<datalist>` (S, no delete control), combobox dropdown (L)
  - I would need to store those in localstorage
  - effort: M, list plus UI under the search field; no GDPR issue as it stays local
- **I11** availability fails: https://www.voebb.de/aDISWeb/app/prod00?sp=SAK35371610 Zusatzinfos statt Bestellmöglichkeit
  - open: check what the page shows to the user now (severity 2 is a guess; 3 if it is wrong information)
- **I12** title fails: https://www.voebb.de/aDISWeb/app/prod00?sp=SAK34234459
  - open: what exactly is wrong is not noted, re-check
- **I13** vollanzeige as title: https://www.voebb.de/aDISWeb/app/prod00?sp=SAK15831927
- (I11–I13) effort: M each, scraping edge cases in `utils/shelfmark.ts` / `catalogText.ts`; a real record goes into the unit tests
- **I14** add standort column in availability
  - open: unclear what it should show; related to the dropped Magazin note (signature is not unique for Magazin, see DROPPED)
  - effort: M
- **I15** merging of different versions of the same book/game (what to do with the id?)
  - evidence: observed 26.10.2026 in real sessions (2 cases): "Lieben knausgard" shows 4 rows "Lieben: Roman · 2012" (1-7 copies each) and the edition with the copies (2013, 22 branches, 15 available) is row 5; the user opened 5 rows in 50 s. "Yesteryear" shows 4 rows "Yesteryear · 2026", one of them "Nicht im Bestand".
  - cheap first step (S, would score 4): load the badges of the first 10-12 rows in the background (queue from 26.10. allows it), not only for rows scrolled into view; costs ~12 instead of ~6 VÖBB requests per search. Then check whether people still click through several look-alike rows before building the real merge.
  - real merge (L): group by title + author + media type ("5 Ausgaben · 22 verfügbar"); open: which id the row links to, combined detail page needs several scrapes (10 s Vercel limit), risk of merging different works with the same title.
  - sorting rows by availability once loaded was rejected for now: rows would jump while the badges arrive.
- **I16** adding Humboldtschule to libraries.json (found 29.10.2026 while checking the `empty` detail views, see P1)
  - evidence: records 00100325 and 00162976 ("Parzival") have one copy, in "Humboldtschule (nicht öffentlich) - ist zurzeit geschlossen". The library is not in `libraries.json`, so `filterAndEnrichBranches` drops the row and the page says "Keine Exemplare gefunden." One session opened both records (reach: 1 session, so the floor).
  - open: which Humboldtschule it is (VÖBB's library list only has "Humboldtschule (nicht öffentlich)"; district, address, coordinates, hours are not known yet); `test/unit/libraries.test.ts` needs a district and an address like "Street, ZIP Berlin". How a non-public library shows up on the detail and library page (the status already says "zurzeit geschlossen"; a note like "nicht öffentlich" so nobody travels there). Other non-public school libraries exist (VÖBB lists "Schulbibliothek Blücherstr. (nicht öffentlich)"): find all of them before adding one by one.
  - effort: S for the entry, M with the display of non-public libraries and the check for others
- **I16** store the records the app has seen in a small table (lazy catalogue) instead of crawling all of VÖBB
  - background (29.10.2026): VÖBB has about 3 million titles (3.2 m per Treptow-Köpenick, 2.7 m per Pankow/Mitte; some older sources say 8.3 m copies; e-media on top; not checked on voebb.de). A full local copy would give sub-100 ms search, own ranking, typo tolerance, filters without a search term and search during maintenance. Not worth it now: no bulk export or API, so ~3 m HTML requests (~5 days at 5 parallel, if VÖBB does not throttle), a re-crawl for new acquisitions, a legal check of bulk copying, and a hosted index (~1 GB, not the free Postgres tier, not Vercel). Availability would stay live scraping either way.
  - idea: whenever `search.get.ts` / `detail.get.ts` return a record, upsert id, title, author, year, ISBN, media type (no availability) into a table. Gives ISBN dedupe for I15 (same ISBN = same edition), pages for titles people actually look up (SEO, I9), and a base for typo hints on 0 hits (P4). No crawl, no extra VÖBB load.
  - evidence: none directly; it is a building block for I15, P4 and I9, so do not score its reach separately
  - open: (1) ask VÖBB or Open Data Berlin whether a catalogue dump exists (none found); (2) revisit the full copy only if `search-started` with `results: 0` and repeated searches turn out to be a large share of sessions (P4: 4 of 77 and 9 of 250 so far); (3) pick storage (Supabase is still a dependency, free tier 500 MB is enough for the seen records)
  - effort: M, one table, upserts in two routes, no UI by itself; GDPR is no issue as it holds catalogue data only, no user data

# DONE
- detail page: "Erneut versuchen" when the copies could not be loaded (store fetch failed, direct landing), `detail-view` logs `failed` instead of `empty` for failed fetches (P1 plan items 1 and 3, 29.10.)
- P3 resolved without a logo change (29.10.): the navbar "Zurück" keeps the results, the logo keeps clearing them on purpose (a logo that returns to old results is unusual behaviour)
- navbar: "Zurück" on the left of every page but `/`, logo centred, replaces the page-level back buttons; falls back to `/` (or the book on a shared library link) when there is no history; events `back-click` and `logo-click` (P2, 29.10.)
- marketing: blog post in the Weddingweiser, https://weddingweiser.de/bibblitz-optimal-bibliotheksbestaende-durchforsten/ (27.10.)
- language filter + filter page (27.10.): "Filter <n>" button under the search opens a fullscreen page with language (Deutsch, Englisch, Französisch) and media type (14 chips), fixed lists, single-select each. Both are applied by VÖBB's own facets in one request (`?lang=` / `?type=`), so they filter all hits, not just the loaded rows; e-media are never offered and left out when filtering; no counts on the chips (VÖBB's counts do not match the visible list); zero-hit and error states keep the filter and offer a way out. Language line on the detail page. Decision on 22.12.2026 (see CLAUDE.md feature inventory). Open: no URL/back-button handling for the open page, no total count ("1.457 Treffer") although VÖBB reports one, result rows of box sets / multi-volume records stay hidden
- detail + library page: copies that are "Nur Lesesaal" or only "bestellbar" (Magazin) get a note next to the unchanged "Verfügbar" pill, read from VÖBB's Bestellmöglichkeit column (`parseAccess` in `utils/shelfmark.ts`, 27.10.). Open: the result-row badge still counts them as available (option B: own pill/tone and exclusion from the badge)
- library page redesign: text-only header (district eyebrow, 3xl title, open-now pill with today's hours), flat sections with dividers, no icon tiles or nested boxes, map after the address (h-48, centred on the library at zoom 15, no wheel zoom), today highlighted in the hours lists, "Kein Service" days folded into one line, back link falls back to `/` (design backlog, 20.10.)
- intro: AI illustration replaced by an own photo (phone at the library shelf, `public/hero-am-regal.webp`, 4:5, 106 KB, EXIF stripped, originals stay in gitignored `res/photos/`) and three icon bullets by the headline "Ist es gerade im Regal?" with one concrete sentence; "Über BibBlitz" portrait replaced by `public/johannes.webp` (design backlog, 19.10.)
- detail page redesign: text-only header with stacked subtitle, flat branch list with dividers instead of cards (design backlog, 16.10.)
- detail page: long status texts and library names no longer break the layout: status split into pill (state or days) + note, district split from the library name, pill under the text on mobile; a note containing "ausleihbar" no longer marks a loaned copy as available, due-date days correct across DST (16.10.)
- text contrast to WCAG AA on all pages and states (gray-400 → gray-500, coloured text to -700/-800, placeholders), audit script in `scripts/contrast-audit.js` (16.10.)
- loading and empty states: result and detail skeletons, badge placeholder instead of a gap, "Verfügbarkeit nicht abrufbar" with retry when a detail fetch fails (design backlog, 16.10.; the labelled VÖBB button was tried and reverted)
- one content width (`max-w-2xl` in layout and header, pages no longer set their own), single-tab "Suche" nav removed; no header search field (design backlog, 16.10.)
- ISBN search (ISBN-10/13, normalized server-side) and ISBN on the detail page (plain text, clicks tracked to decide on a search by ISBN)
- one icon set (Lucide via @nuxt/icon) instead of emoji in nav, intro, library page, quick-search chips, ZIP box and favicon (design backlog, 12.10.)
- clean titles and authors: author + year from the search row, format notes stripped, platform shown, no more "Unbekannter Autor"; library addresses get a space before the ZIP (design backlog, 12.10.)
- one status pill (`StatusPill.vue`, tones near/good/wait/hard/bad/neutral) in list and detail page (design backlog, 12.10.)
- detail page: distance per branch, heading without wrap (design backlog, 12.10.)
- 2nd page search
- showcase: popular books/games/tonies
  - july: 34112359 01392424 07235286 34971091 35168840 00224031 06115009
- filter: improve media type filter: filter labels (Dvd->DVD), aggregate (DVD+DVD-ROM)
- libraries page: add to google search console via sitemap
- what to do with merkliste. nobody uses it
  - throw merkliste route raus. throw account sync raus. throw bookmarkbutton raus
- filter by media type
- search should not reset when coming from watchlist (user request)
- map: green dot sometimes gets overlayed
- about section (why do people visit the imprint)
- a share button on the detail page
- events for click on library and clicking on author
- consistent back button styling
- buy domain
  - check in google search console
- where is schiller library: address on click
  - add data to libraries: district,opening horus, website
  - nice map illustration
- check/change email
- set zip code in search somehow
- better aggregation if zip code is default
- clicking on navbar / or pressing x in search does not clear the results
- reduce bounce rate before searching: suggestions for searches or sth
  - 40% (61/146) of people only go to home page and never search i.e. bounce
  -  popkultur (dune wüstenplanet) / spiele (siedler von catan) / hörbücher kinder (tonie eiskönigin)
- input numeric zip code
- icons for different media types
- zip code save validation
- add login to merkliste page as "Sync option"
- saving user location and watchlist w/o account
- better sorting of branches (see branchSorter)
- bookmark button on detail page
- navbar overflow mobile
- contact email
- display due days
- timeout while fetching Availabilitybadge -> id page -> back. does not get resolved
  - better caching handling. ask if data available, if not, get it and store it
  - detail: send 500. VÖBB Fetch Failed
- plz refresh does only work after relogin
- better analytics for ref=sticker
- docker ausbauen, falls alles stabil im backend läuft
- nette illustration, die erklärt, was die app macht
- kein detail fetch, wenn schon im store
- suchperformance verbessern / playwright ablösen
- Standort-Abfrage dynamisieren: Die HTML5 Geolocation API im Frontend integrieren, um die Distanzen zu den Bibliotheken anhand deiner echten aktuellen Koordinaten zu berechnen, statt feste Werte zu nutzen.
  - users have to input their district
- empty result state
- watchlist
- availability score in der ergebnisliste
- deploy
- save records for later
- crawl first page of results
- display media type

# DROPPED
- I10 recent searches (29.10.): covered by the navbar "Zurück" that keeps the results; details under I10
-  Performance-Optimierung (Caching): Ein Server-Caching (z.B. mit Nuxt nitroStorage) für die Detailansichten einbauen, damit bereits geladene Bestandsdaten für einige Minuten zwischengespeichert werden und die Seiten blitzschnell laden. Für jetzt reicht erstmal pinia store und optimierte sucheperformance
  - search
    - cold (deployed): 50s
    - warm (deployed): 5s
  - detail
    - deployed: 4s
- job to check them regularly: watchlist is convenient enough
- show bestellmöglichkeit für magazin
  - signature is not unique for magazin stuff (see http://bibblitz.de/media/12485080). I would need to pass Standort (Magazin/Außenmagazin) or Bestellmöglichkeit (bestellbar)
- add link to google maps to library selection: not likely that people don't know the library they want to go to
- zip code visualiziation: there are just too many zip codes. better label with district
- search by clicking on author
  - no one did it yet
- rework navbar to header and menubar. authmodal as page. 
  - minimal navbar for now
- contact form for faster feedback?
  - needs Mail-Versand-Service (Resend, Mailgun) oder Supabase-Tabelle, DSGVO-Pflichtfelder, Spam-Schutz. lots of work
- korrekten footer anzeigen auf allen seiten (impressum, datenschutz, kontakt)
