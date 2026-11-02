# TODO
- marketing first: blog post hacker news, linkedin, flyers (10x21cm, din lang)

# Problems from session reviews
Scored on 29.10.2026 from the session reviews of 26.10., 28.10. and 29.10.; re-scored on 30.10.2026 after review 4 (39 visits, 29.10. 08:24Z to 21:50Z) and on 02.11.2026 after review 5 (122 visits, 29.10. 21:50Z to 02.11. 08:21Z, 43% of them from the Reddit post of 01.11.). Re-score after each review (counts change, new items arrive).

**Score = reach × severity ÷ effort**, higher first. Rule on top: a confirmed bug that shows wrong information goes first, whatever its score (people act on it and lose trust).
- **Reach**: share of sessions in the review window that hit it, rounded to whole %. `≤` = upper bound (sessions that could hit it, not all did), `*` = no session observed, scored at the floor of one session (2%): a low score then means "no evidence", not "no value".
- **Severity**: 1 extra step / convenience, 2 dead end or wasted effort / unblocks a goal, 3 wrong information.
- **Effort**: S = 1 (up to 2 h incl. test), M = 2 (half a day to a day), L = 4 (more than a day, or needs a product decision or research first). Sizes assume Claude does the work; the `effort:` line says why and what the risk is.
- Scores within about 30% of each other are a tie. The windows are small (52 visits in review 3, 39 in review 4, 122 in review 5; one visit is 1-3 points), so treat the order as a guide. Rows that appeared in more than one review pool the counts ("5 of 91").

| ID | Item | Reach | Sev | Effort | Score |
|---|---|---|---|---|---|
| I4 | Keep the opening hours of the libraries current (all fixed 02.11.; monthly Pi job installed with ntfy, first scheduled run 01.12.; only the heartbeat for a dead job is open, see `docs/library-data.md`) | 2%* | 3 | S | 6 |
| P9 | "Zurück" loops between the book and the library page after a shared library link (verified 02.11.) | 2% | 2 | S | 4 |
| I16 | Add Humboldtschule (non-public school library) to libraries.json | 2%* | 2 | S | 4 |
| P8 | Visitors doubt the result list is complete (re-scored 02.11.: 12 of 13 FAQ opens came before any search, so only the after-a-list share counts) | 3% | 1 | S | 3 |
| P4 | No useful result and no way out (0 hits, junk rows, junk rows above the real title; 6 of 213 visits) | 3% | 2 | M | 3 |
| P1 | Detail page fails to load the copies (retry button done; re-scored 02.11.: 5 of 213 visits, 1 of 106 detail views in review 5) | 2% | 1 | S | 2 |
| I23 | Service hours (staffed times) missing for 19 libraries whose pages list service-free times; the page says "geöffnet" while nobody is at the desk | 2%* | 2 | M | 2 |
| P5 | Filter dead ends (0 hits; 2 more in review 5; grey-out idea would have prevented both) | 2% | 2 | M | 2 |
| I18 | Returning visitors re-open the same record by URL (re-scored 02.11.: 8 of 15 record landings re-open a record seen earlier) | 8% | 1 | L | 2 |
| I9 | Open Graph tags for link previews | 2%* | 1 | S | 2 |
| I11 | Availability fails on SAK35371610 | 2%* | 2 | M | 2 |
| I12 | Title fails on SAK34234459 | 2%* | 2 | M | 2 |
| I13 | "Vollanzeige" as title on SAK15831927 | 2%* | 2 | M | 2 |
| I15 | Merge different versions of the same book/game (verified again: Hannibal DVDs) | 3% | 2 | L | 1.5 |
| I1 | People look for tools ("Bohrmaschine"), hint only (3 of 213 visits, none since review 3) | 1% | 1 | S | 1 |
| P7 | Back button while the filter page is open leaves the results (1 of 161 visits, none in review 5) | 1% | 2 | M | 1 |
| I21 | A ZIP typed into the search box (2 cases, verified: 2 unrelated rows) | 1% | 1 | S | 1 |
| I5 | Sort by publication date | 2%* | 1 | M | 1 |
| I6 | Wildcard search with `*` | 2%* | 1 | M | 1 |
| I16 | Store the records the app has seen (lazy catalogue) | 2%* | 1 | M | 1 |
| I8 | Instant notifications when available | 2%* | 2 | L | 1 |
| I17 | Wishlist (Merkliste) link and "which library is worth a visit" overview | 2%* | 2 | L | 1 |
| I14 | Standort column in availability | 2%* | 1 | M | 1 |
| I20 | List of new Blu-rays / UHDs in my library (Reddit comment; alerts would be L; depends on I16) | 2%* | 1 | M | 1 |
| P6 | Multi-volume series are awkward to browse (2 of 213 visits) | 1% | 2 | L | 0.5 |
| I2 | Covers for books | 2%* | 1 | L | 0.5 |
| I19 | Loans overview with due dates and renewal (needs the VÖBB login; Reddit request) | 2%* | 1 | L | 0.5 |
| I7 | Rare finds / most borrowed media for a newspaper article | n/a | | | marketing, not scored |

Details per item (labels, use the ones that apply): `evidence:` counts, queries, record IDs · `cause:` · `repro:` · `plan:` / `ideas:` · `effort:` why this size, risk · `open:` what to find out next · `status:`. Raw journeys: `npm run umami -- --from <date> --out <dir outside data/umami>`.

## Problems

- **P1** detail page fails to load the copies and offers no way to retry (review 29.10.2026, re-assessed in the investigation the same day; first read as "false Keine Exemplare", which was wrong)
  - review 5 (02.11.2026): 1 of 106 `detail-view` events failed (`error`, 105 `ok`), a direct landing on record 34269726 (Mac, Safari, 64 branches): the visitor pressed the logo after 2 s, searched "Naruto massiv" and opened the same record 93 s later, where it loaded. Two refetches on localhost worked (transient, the record is a large page of the ~3 s kind). Pooled: 5 of 213 visits (2%), 1 of 106 detail views against 4 of 78 before: the failure rate looks lower, but whether the retry button was visible to that visitor is unknown (they left within 2 s). The measure-first decision stands.
  - review 4 (30.10.2026): 0 of 27 `detail-view` events were `failed`, `empty` or `error` (all `ok`; 39 visits, 25 or so distinct views, direct landings included). Pooled with the 29.10. window: 4 of 91 visits. Measure-first decision stands; whether the `failed` status and the retry button were already live in this window is not visible (all events are `ok`), re-read after a week of traffic.
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
  - review 5 (02.11.2026): 2 of 96 searches had 0 hits, both from one visit (an Android visitor with 11 searches in 16 min looking for William Joyce's "Nicholas St. North" books: the ISBN-13 of an English edition and the full English title, both 0 hits, **verified** on localhost; VÖBB probably does not hold them, so a true absence). Junk-row variant, **verified**: "William Joyce" returns 20 rows about James Joyce, with no hint that the author is not in the catalogue; the visitor then added "nicholas", got 20 junk rows again and tried six more titles. A second, milder case: "Marita grasmane" 2 hits, the visitor fixed it to "Maruta grasmane" in 3 s and found the record (works as intended). Zero-hit share fell (2 of 96 against 4 of 77 and 9 of 250), and only one visitor was stuck. Pooled with the earlier reviews: 6 of 213 visits (3%).
  - review 4 (30.10.2026): 0 of 19 searches with 0 hits (pooled 4 of 96 since 29.10.). New variant, **verified** on localhost: junk rows ranked above the real title. "Die Lücken" (a 2026 novel) lists four records without author or year ("Bauen Luecke", "Luecke-Projekt", "Luecken der revolutionaeren", "Dokumentation Luecke-Plan", ASCII-transliterated) and an IT book before the novel at rows 6-7. Three visits looked for it; one found the row in 5 s, one opened a wrong row first (an essay on gaps in the cityscape) before the right one, and the right record (96 branches) was the most opened record of the window (4 visits, two of them direct landings). Reach for this row: 1 of 39 visits had a wasted detour, pooled 5 of 91.
  - ideas (new): rank rows client-side whose title contains all query words (or an exact title match) above the rest, without touching VÖBB's order otherwise; needs a rule that does not hide anything, only reorders the first page, and a test with the "Die Lücken" rows (M, the risk is reordering that surprises people more than the junk does)
  - evidence: 4 of 77 searches with 0 hits: "Bretman", "Bedlam beide" (the user then found it with "Bedlam bride"), "Bretman rock", "der stein der weisen, 13051" (ZIP typed into the search box). Review 28.10.: 9 of 250, e.g. "mc fadden" 0 hits vs "mcfadden" 1. The opposite case: "Bretmam" returns 22 unrelated rows ("Gesetzliche Krankenversicherung") without a hint that none matches.
  - ideas: on 0 hits retry once without digits/commas or with the words joined; hint when no result contains a query word
  - effort: M, a retry costs another VÖBB request (search takes ~3 s median); VÖBB offers no spell check or "did you mean"
- **P5** filter dead ends (review 28.10. + 29.10.2026)
  - review 5 (02.11.2026): the filter is used much more, mostly by the Reddit visitors: 17 of 122 visits opened it (24 opens), that is 29% of the 59 visits that searched (before 27.10.: ~6%); 10 visits applied one (DVD 6, Blu-ray 3, Buch 1, Konsolenspiel 1, plus one language, Englisch). 2 of 12 applies were dead ends (0 hits), **both verified** on localhost: "Cairn" + Konsolenspiel (also 0 with Computerspiel; the unfiltered 8 rows are a CD, a dog book and DVDs, so VÖBB holds no game of that name) and "House md" + DVD (0 hits; the 9 unfiltered rows are junk, "Dr. House" + DVD gave 19: the typo in the query, not the filter, was the problem, the visitor found out via Blu-ray 1 hit and a new search). Greying out chips with no hit would have shown both before the tap. Reach pooled 3 of 161 visits (2%).
  - not applied (7 of 17 opens): in 5 of the 7 the next action 7-11 s later was a result click or a page change, so the dialog was probably closed or opened by mistake (the button sits between the search field and the first row; not verified, no event for "Schließen"). Opened twice within 11-18 s and then applied in 3 visits (hypothesis: the first tap closed it without a choice).
  - review 4 (30.10.2026): 5 filter opens from 5 of 39 visits (pooled 17 opens from 14 sessions), 2 applied, 3 left without applying (3 of the 5 opened the dialog within 5 s of the results appearing). One new dead end, **verified**: "Tonie Eiskönigin" + Punktschrift gave 0 hits (the chip list offers Braille next to Buch and DVD; the visitor had just opened a Tonie record, so a mis-tap or exploring). Same remedy as the open item below: grey out chips with 0 hits. Reach 1 of 39 visits (3%).
  - evidence: 12 filter opens from 9 sessions, only 4 applied one (why the other 5 left is unknown). "Charles stross" + Englisch + Buch gave 0 hits (Englisch alone 1, not a book), the user left for the libraries page. "Star wars rebellion" + Spiel gave 0 hits, the user then found it under "Konsolenspiel". Language + type combinations often leave only 1-2 hits. Only 1 session in the 29.10. window, hence the floor.
  - status: done 28.10.: "Spiel" renamed "Gesellschaftsspiel" (chip and result rows; it is VÖBB's "Konventionelles Spiel": board and card games, Memory, puzzles, kits), old `?type=Spiel` links are mapped
  - open: PC games are "Computerspiel" (shown as "DVD" in rows, DVD-ROM), a "Konsolenspiel" search never finds them: merge Konsolenspiel + Computerspiel into one "Videospiel" chip (S)? Grey out (not hide) chips that would give 0 hits for the current search (VÖBB only lists facet values with hits, `resolveFilterIds` already knows)
- **P6** multi-volume series are awkward to browse (review 29.10.2026)
  - review 5 (02.11.2026): one more visit (iOS, Reddit): "Planet earth" + Blu-ray, then "Planet erde 2", "Planet erde 3" and "Planet erde 2" four times in 85 s, 21 rows each time, no row opened. **Verified** that "Planet erde 2" + Blu-ray lists the wanted release first: "Planet Erde. - 2. Eine Erde - viele Welten" (2017, Blu-ray and Ultra HD as separate rows), so the record was there on row 1; the volume suffix style (". - 2. Eine Erde ...") may be why it was not recognised (hypothesis; the visitor's goal is unknown). Pooled 2 of 213 visits (1%).
  - evidence: 1 session, but it needed 6 searches. "Yona Prinzessin 1." lists volumes in VÖBB's relevance order (1, 26, 11, 33, 22) and titles end in ". - 26.". Related to I15.
  - ideas: strip the ". - <volume>." suffix from the title and show the volume as its own label (S, `catalogText.ts` + test); sort volumes of one series by number
  - effort: L for the sorting (VÖBB order, not ours), S for the title suffix
- **P7** the back button while the filter page is open leaves the results (review 4, 30.10.2026)
  - review 5 (02.11.2026): no visit shows the signature (landing on an empty home page right after a filter open, with no logo or back-click event), although 17 visits opened the filter. 7 left without applying, all of them with a result click, a page change or the end of the visit (no way to tell a closed tab from back). Pooled 1 of 161 visits (1%); the repro is still valid, so the item stays, at low priority.
  - evidence: one visit is consistent with it (Android, from Google: searched "Babel kuang", opened Filter 5 s later, 14 s on it, then landed on the home page without a logo or back-click event and read three FAQ items; the results were gone). Not proven from the data alone: 5 of 39 visits opened the filter, so up to 13% could do it. The DONE entry of 27.10. already lists "no URL/back-button handling for the open page" as open.
  - repro (verified 30.10. on localhost, desktop browser pane): search "Dune" via the chip, click "Filter", `history.back()` -> the filter closes together with the results page and the browser lands on the page before the search (here a library page, from Google it would be Google). The filter page is not a history entry.
  - ideas: push a history state (or `?filter=1`) when the dialog opens and close it on `popstate`, so back closes the dialog and keeps the results; the drafts stay as they are
  - effort: M, router/popstate handling in `FilterPage.vue` and the page that opens it, plus a test; risk: double history entries when the dialog is closed with "Schließen" (must pop its own entry)
- **P8** visitors doubt that the result list is complete (review 4, 30.10.2026)
  - review 5 (02.11.2026): the FAQ item `fewer-results` was opened in 13 of 122 visits (11%), but **12 of the 13 opened it before any search** in the visit (7 of them Reddit visitors); only 1 came after searches. 8 visits opened at least 4 of the 5 FAQ items in a row (7 from Reddit), so for first-time visitors the FAQ works as the "what is this app" text, and `fewer-results` is the question they expect to have before they see a list. Pooled with review 4: 18 of 161 visits opened it, 4 after seeing a result list (3 + 1). The hypothesis below (a short list reads as "BibBlitz did not find it") now fits 4 of 161 visits (2-3%), not 8-13%. A hint under the list serves only that share; the pre-search readers would need an answer in the intro. Reach cut to 3%.
  - evidence: the FAQ item "Warum finde ich weniger Treffer als beim VÖBB?" (`fewer-results`) was opened in 5 of 39 visits (13%), 3 of them right after a search (9 rows for "Babel kuang" with no click, 5 rows "Tonie Eiskönigin" followed by a zero-hit filter, 2 rows "fitzek nachtzug" after a record with 0 of 12 branches free), 2 without searching (forum.zlb.de and the Weddingweiser blog). All FAQ items together: 6 of 39 visits. Earlier reviews: it was already the most-opened item (51 opens by 09.10.).
  - cause (hypothesis): a result list shows no sign of what is left out (e-media, box sets and multi-volume records stay hidden, see docs/search-and-filters.md), so a short list reads as "BibBlitz did not find it". A FAQ open only shows doubt, not what the visitor was missing.
  - ideas: a one-line hint under the list that points to that FAQ item (S); a count of hidden rows ("3 weitere Treffer (E-Medien, Boxsets) ausgeblendet", M, needs the count from `parseResultsPage`); first ask whether leaving the hint out was a deliberate decision (CLAUDE.md only states that there is none)
  - effort: S for the static hint, M for the count; the hint costs a line of space on every result page
- **P9** "Zurück" loops between the book and the library page after a shared library link (review 5, 02.11.2026; a hole in the P2 fix)
  - evidence: 2 of 122 visits (2%), both iOS, both a direct landing on `/library/<id>?media=<id>`. One visit pressed "Zurück" 11 times in 13 s (alternating `back-click` from library with `had_history: 0` and from detail with `had_history: 1`), then went to the home page and searched for something else; the other pressed it 3 times in 2 s, then used the logo. Both were stuck in the loop instead of reaching a place they could work from, so the "Zurück" the visitor reaches for is a dead end here (severity 2: wasted effort; whether they still got what the link was meant to show is unknown).
  - cause (**verified** on localhost 02.11., fresh tab on `/library/bibliothek-am-wasserturm?media=35194217`): the fallback in `AppNavbar.vue` sends a library page without history to `/media/<id>` with `router.push`. That adds a history entry, so on the detail page `history.state.back` is the library page and "Zurück" does `router.back()` to it. Each further tap flips between the two pages (5 taps: media, library, media, library, media).
  - ideas: use `router.replace` for the fallback, so the library entry is gone and "Zurück" on the book finds no history and goes to `/` (a visitor who wanted the book's library lists reaches it again via the branch list); or keep the push and let the detail page ignore history when it came from this fallback (needs a flag in the route state). First is the smaller change and keeps the rule "no history means next best place". A unit test: no history, library with `?media`, two taps end on `/`.
  - effort: S, one line in `goBack` plus a test in `test/nuxt/navbar-back.test.ts`; the risk is that "Zurück" on the book skips the library page the sender meant (acceptable, the book is the point of the link)
  - status: open

# Contemplating / Ideas
- **I1** people look for tools
  - review 5 (02.11.2026): not seen again (0 of 122 visits; no tool, DIY or non-media queries; the Reddit visitors searched films, games, books and puzzles). Pooled 3 of 213 visits (1%), all from review 3.
  - evidence: "Bohrmaschine" and "Bohrer" from 3 of 52 sessions (review 29.10.2026), the results are books about drills
  - ideas: a hint that the VÖBB catalogue only holds media; not a UI bug, watch whether it recurs before doing anything
  - effort: S for the hint text; it does not serve the need itself
- **I2** covers for books, e.g. https://www.voebb.de/vlb/cover/<isbn-wo-dashes>/m 200ms or open library https://covers.openlibrary.org/b/isbn/0385472579-M.jpg 600ms
  - evidence: no session asked for them; they would show in every result list (30 of 52 sessions searched), so the floor undersells the visual impact (design backlog #9)
  - covers on openlibrary are super sparse
  - voebb img needs a referrer (!headache): endpoint?
  - check google covers with api or some other service
  - effort: L, GDPR means proxying through our server, Vercel time budget, fallback for games/Tonies
- **I4** keep opening hours and service hours of the libraries up to date
  - **checked 02.11.2026 (sample of 10 libraries, one per district plus the ZLB, each against its own website): 3 of 10 have wrong opening hours.** The data went stale. No visitor reported it and none of the 27 library-page views in review 5 was one of these three, so it is measured from the websites, not from sessions.
    - Egon-Erwin-Kisch-Bibliothek (Lichtenberg): the site lists Sa and So 09:00-19:00 (with service-free times, Sa 13-19 and So all day, loans and returns only at the machines); `libraries.json` has no Saturday and no Sunday. Two open days are missing.
    - Stadtteilbibliothek Friedrich von Raumer (Friedrichshain-Kreuzberg), from the district page "aktuelle Öffnungszeiten": Fr 11:00-19:00 (17-19 service-free) and Sa 11:00-16:00; stored Fr 11:00-17:00 and no Saturday. Caveat: the library's own page loads its hours dynamically, so this is the district's page, not a second source.
    - Heinrich-Schulz-Bibliothek (Charlottenburg-Wilmersdorf): Sa 10:00-19:00 on the site, 11:00-19:00 stored (one hour).
    - Minor: Amerika-Gedenkbibliothek: opening hours match, but the Saturday service time (10:00-19:00) is missing from `service_hours` (only Mo-Fr stored).
    - Match: Hansabibliothek, Thomas-Dehler-Bibliothek, Bibliothek am Schäfersee, Bettina-von-Arnim-Bibliothek, Stadtteilbibliothek Alt-Treptow, Stadtteilbibliothek Haselhorst.
    - The pattern behind the misses is new weekend or service-free opening (Kisch, Raumer), and the data does not model "service-free" consistently: Kisch and Schulz store the full opening span including the service-free or restricted-service part, Raumer's Friday stops at the staffed time. `libraries.json` was last edited on 21.10.2026 (cleaning), the hours date from the first import in July.
  - reach (before the fix): library pages are 27 of 122 visits (22%) in review 5; at the sampled error rate up to about 7% of visits could have seen a wrong hours list or a wrong "geöffnet" pill. Not observed in the data.
  - **fixed 02.11.2026 (branch `fix-library-hours`): all libraries checked, not only the sample.** `npm run libraries:check` (`scripts/libraries/check.mjs`, described in `docs/library-data.md`) read the hours of every library from its own website. Of the roughly 68 libraries whose page could be read, **16 had wrong hours (about 24%) and were corrected**: Egon-Erwin-Kisch, Anton-Saefkow, Anna-Seghers (Sa/So missing), Friedrich von Raumer, Wilhelm Liebknecht / Namik Kemal and Pablo Neruda (Fr and Sa longer, Neruda also Sunday), Heinrich-Schulz (Sa), Dietrich-Bonhoeffer (Sa, So), Kurt-Tucholsky Pankow (Fr, plus the volunteers' Saturday 11-13), Eberhard-Alexander-Burgh (Mo closed, Tue-Fri 14-18), Wolfdietrich-Schnurre (Fr), Bibliothek im Märkischen Viertel (Tue), Margarete-Kubicka (all days), Helene-Nathan (all days), Hauptbibliothek Spandau (Sa, So), Stadtteilbibliothek Lankwitz (Mo). Two libraries without stored hours got them (Tiergarten Süd, Bodo-Uhse). After the fixes the check reports 69 libraries ok, 0 different, 0 with hours missing. Not checked by the machine: 9 `unreadable` (bookmobiles with stops, two pick-up points, Wasserturm whose hours are a sentence, checked by hand: matches) and 10 without stored hours that have no readable page. Mobile libraries keep stops, not hours.
  - the pattern: the first sample (3 of 10) matched the full result (16 of about 68). Most misses are new weekend or extended opening and the district pages' service-free times; two libraries (Kubicka, Helene-Nathan) had a completely different schedule.
  - convention fixed in `docs/library-data.md`: `opening_hours` = the building is open, including service-free or restricted-service times; `service_hours` = staffed. Test added for format and "service inside opening". Dead and redirected links: see the DONE entry for I22.
  - **keeping it current: Pi job installed 02.11.2026.** Monthly cron (1st, 09:00) on the Pi runs `run.sh` (`scripts/libraries/run.sh`) in `~/bibblitz-check`; first run there matched the dev machine. It is silent when everything matches and sends an ntfy message on differences, missing hours, dead links, a changed number of unreadable pages or a crash.ntfy is configured and tested end to end (02.11.). First scheduled run 01.12.2026. Weak spot: a dead cron job or an off Pi is silent (heartbeat idea in `docs/library-data.md`). Details and deploy commands in `docs/library-data.md`.
  - effort: M as scored (the fix itself is done; the job and the recurring review remain)
  - status: data fixed and committed 02.11.; job installed, notifications work; heartbeat for a silent failure not built
- **I5** sort
  - nach erscheinungsdatum
  - add year (Veröffentlichung): probably done (DONE 12.10.: author + year from the search row), check and delete
  - effort: M, sorting only the loaded rows would mislead like the old media filter did; VÖBB's own sort would need a new scrape step
  - checked 01.11.2026: VÖBB's results page offers Relevanz, Titel, Verfasser, Jahr abwärts and Jahr aufwärts (by publication year only, no acquisition date; see I20). So "by publication date" exists on VÖBB's side and would be the new scrape step (press the sort button after the search, like the filter step).
- **I6** wildcard search with * (not sure if voebb supports it)
  - effort: M; testing whether aDISWeb supports it is S, decide after that
- **I7** seltenes fundstück / meistausgeliehene medien für artikel in der zeitung (marketing, not scored)
- **I8** instant notifications when available: in app (native) or via email or in telegram
  - evidence: none; the watchlist was removed 22.07. because nobody used it (speaks against)
  - bell functionality: add a bell to a exemplar. if you load the page all bells are loaded. you get a popup with the bells that are green.
  - bell for a search?
  - effort: L, storage plus push/email infrastructure, GDPR
- **I9** open graph im head für link previews
  - review 5 (02.11.2026): 15 of 122 visits started on a record (12) or library page (3); 8 of them re-open a record seen earlier (see I18), 4 carry a Facebook, Google or DuckDuckGo marker. Pooled with the earlier reviews about 24 of 213 visits begin on one of the two page types. Whether a preview mattered stays unmeasurable, the reach stays at the floor.
  - review 4 (30.10.2026): 9 of 39 visits started on a record (6) or library page (3: 2 with a Google referrer, both a returning browser, see I18, and 1 probable crawler); 3 of the record landings are not explained by a returning browser (direct, mobile). Pooled with review 3: about 9 of 91 visits could come from a shared link. Whether the preview mattered stays unmeasurable, so the reach stays at the floor.
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
  - review 5 (02.11.2026), **verified** again: 12 of the 59 searching visits opened at least 3 different records from one search (not all look-alikes: "Hogfather", "Fiasko", "puzzle ravensburger" are different works or editions the visitor weighed). Clear look-alike cases: two independent visits for "Hannibal" + DVD (Reddit, within 3 min of each other) both opened the same two rows, 34352777 (2004) and 08264450 (2001), each titled just "Hannibal" with the same director, then went on to 07233102; the DVD list holds at least six rows titled "Hannibal" (2000, 2001, 2001, 2004, 2007, one without year) next to three "Hannibal Rising" rows. One of them opened the first row twice. Pooled with review 4: 5 of 161 visits (3%).
  - review 4 (30.10.2026), **verified**: "Die Lücken : Roman" (Shida Bazyar, 2026) exists as two identical rows, 35574936 (3 branches, none free) and 35540903 (96 branches, 1 free); the one with the copies is the second, behind four junk rows (see P4). "Babel kuang" lists the same title as 5 English, 1 German and 2 Ukrainian editions in 9 rows; the visitor left without opening one and read the FAQ (P8). Reach unchanged (4%): 3 of 39 visits searched one of the two titles, 2 found the right row quickly.
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
- **I17** wishlist (Merkliste) connection and a "which library is worth a visit" overview (user feedback, 30.10.2026, a former VideLibri user)
  - evidence: one unsolicited comment, no session data (floor). Quote: "VideLibri konnte ich früher nutzen, jetzt geht die nur noch, um die eigenen Ausleihen zu verlängern. Ich brauch aber eine Anbindung zu meiner Merkliste. Führe parallel eine Excel-Tabelle in der ich immer mal wieder notiere welche Bib. welches Buch hat, um dann zu überlegen welche Bib. gerade ein Besuch lohnt. Wär schön sowas mal automatisch zu haben. Datenbank-Anbindung und dann ne Karte der Bibs. Aber gut, Zukunftsmusik." The user's job: keep a list of wanted books, see per library which of them are on the shelf, and pick the library where a trip pays off. Today that is a manual Excel sheet.
  - two parts: (a) get the books of the user's VÖBB Merkliste into BibBlitz (needs the VÖBB login, i.e. credentials passing through our server, or a manual import such as pasting record IDs/links; VÖBB has no API); (b) a view that crosses the list with the branches: per library the available titles from the list, on the existing Leaflet map (the library page already has one), sorted by count and distance
  - related: the own watchlist (bookmarks, local list) was removed 22.07. because nobody used it, which speaks against (a) as an own list; I8 (notifications) and I16 (records table) are building blocks. A first cheap variant without login: a local list again, but only as the input for (b), so the value is the map and not the list itself
  - open: ask the user how they would feed the list (login vs. paste); check whether the Merkliste is reachable via aDISWeb without a login (probably not); GDPR if credentials are handled; the 10 s Vercel limit with one detail scrape per listed title
  - effort: L, product decision first (login vs. local list), then one detail scrape per title and a map view
- **I18** returning visitors re-open the same record by URL (review 4, 30.10.2026; hypothesis, not a bug)
  - review 5 (02.11.2026): the pattern is stronger. 15 of 122 visits began on a record (12) or library page (3); **8 of the 15 re-open a record that an earlier visit in the same window had opened** (same device class and OS), and 3 of those are confirmed returning browsers by Umami session: a record again after 30 min and after 1 h 52 min (the second one with a DuckDuckGo referrer), and a library-with-book page 3.6 h later. The other 5 landed on a record an earlier visit (different Umami session, so possibly another person) had opened 41 min to a day before. All 8 are mobile; none pressed "Zurück", none clicked "↗ VÖBB". Pooled with review 4: about 13 of 161 visits (8%; 8 of them confirmed by session). The hypothesis that people use the URL as a bookmark to re-check "is it on the shelf now?" is now the best-supported reading of the direct landings.
  - evidence: 5 of 39 visits (13%) were a browser that came back (same Umami session as an earlier visit) and landed directly on a record or library page: one returned 13 h later to a record, one opened the same library-with-book URL twice (referrer google.com, i.e. from the browser's address bar), one opened the same record twice 8 min apart. Three more direct record landings from mobile with a saved ZIP (`zip_default: 0`) cannot be tied to an earlier session (shared link, or a returning visitor on another browser). In sum 9 of 39 visits (23%) began on a record (6) or library page (3, one of them a laptop from China without referrer, probably a crawler). Nobody pressed "Zurück" after such a landing.
  - cause (hypothesis): people use the record URL as a bookmark to re-check "is it on the shelf now?", the core job. The own watchlist was removed on 22.07. because nobody used it, and "recent searches" (I10) was dropped on 29.10., both before there was data on returning visitors. The record page has no way to find the last viewed books again except the browser history.
  - ideas: "Zuletzt angesehen" (last 5 records, local storage, only on the home page next to the suggestions); or nothing, since the browser history already does it for these people. First check whether the share holds in the next review and whether those visits clicked "↗ VÖBB" (this window: 0 `voebb-click` in 27 detail views).
  - effort: L, because it reopens the decisions to remove the watchlist and to drop I10; the build itself would be M (local storage list, a component on the home page, a privacy note for the stored IDs)
- **I19** loans overview with return dates and renewal ("Verlängern") from inside BibBlitz (user request, Reddit comment, 01.11.2026)
  - evidence: one unsolicited comment, no session data (floor). Quote: "Ich benutze eine App, die mir anzeigt welche Medien ich ausgeliehen habe und wann ich diese zurückgeben kann. Kann sie auch direkt verlängern. [...] Wird es diese Funktion bei dir auch irgendwann geben oder beschränkst du dich bewusst auf die reine Suche ohne Login und Co." The commenter added that they first took BibBlitz for an app, and found it "sehr nützlich und sinnvoll" as it is. The user's job: see what is on loan, when it is due, renew without opening VÖBB. The commenter already has an app for it, most likely **VÖPP** (checked 01.11.2026, not confirmed by the commenter): a free, unofficial iPhone and Mac app by one developer (u/-drengen-, "mostly vibecoded", open source at github.com/noestreich/voebbar, site voepp.de), announced in r/berlin around 06.07.2026 (22 points, 4 comments) and covered by iphone-ticker.de on 17.07.2026. It shows the loans of several VÖBB accounts sorted by due date, renews eligible items, reminds before the due date and adds cards by barcode scan. It has no servers: card number and password stay in the iPhone Keychain and the app reads voebb.de directly. VideLibri (Android, Linux, Windows, see Competitors) is less likely, it was not mentioned in the r/berlin thread.
  - related: I17 (a former VideLibri user, 30.10.2026) asks for the account side too (Merkliste, own loans), so this is the second unsolicited comment about account features. It stays one idea family: anything that needs the VÖBB login. The standing position in "Competitors → Not to copy" is no login: credentials would pass through our server and every VÖBB page change breaks the scraper.
  - open: the question in the comment is also a message for the project: say consciously "search without login" (a reply on Reddit and maybe a line in the FAQ, e.g. `data-storage`), or open the product decision. Check whether VÖBB offers a login-free route to loans (probably not), and whether a browser-side variant (credentials never reach our server) is possible against aDISWeb (CORS makes it unlikely; VÖPP can do it only because it is a native app without that restriction, so the "no server, credentials on the device" model does not carry over to a website).
  - effort: L, a product decision first, then login handling, scraping of the account pages, renewal as a write action on the user's account, GDPR, and a breakage risk on every VÖBB change
- **I20** alert or list for new Blu-rays / UHDs (and other media types) added to my library (user comment, 01.11.2026)
  - evidence: one comment, no session data (floor). It is on the VÖPP thread in r/berlin (see Competitors), not about BibBlitz, from u/6ohm (Kreuzberg, "a regular VÖBB user", 8 upvotes on the comment): "too bad the included functions are not really relevant for my use case. I'd find it particularly useful if the app could send me a reminder when a new blu-ray or UHD is added in my library." The user's job: follow a media type in one library and learn about new titles, a discovery need before any specific record exists.
  - difference to I8: I8 is about a known record becoming available, this is about new records appearing. It needs a "new in the catalogue" source and a notion of "my library", and needs no VÖBB login, so it does not collide with the no-login position.
  - investigated 01.11.2026 (read-only, on voebb.de), what VÖBB offers:
    - a "Neuerwerbungen (gesamter VÖBB)" page (menu Aktuelles → Neuerwerbungen) with the categories Lesen, Hören, Schauen: a teaser of about 16 titles per category (Schauen: 13 DVD, 3 Blu-ray, rendered twice in the page text), no Ultra HD, no date, no library, links are JavaScript only. Not usable as a data source.
    - sort options on a results page: Relevanz, Titel, Verfasser, Jahr abwärts, Jahr aufwärts. Only the publication year, no acquisition date (the detail page has none either: Medienart, Veröffentlichung with the year, Vormerkungen, copies table). Also answers the sort question in I5.
    - "my library" is possible: the search scope select lists every branch ("Bezirk: Bibliothek"), and the filter box has a "Bibliothek" facet next to "Medienart" and "Jahr" (the facet mechanism of `server/utils/facets.ts` already handles Sprache and Medienart).
    - record IDs (`SAK<id>`) are catalogue record numbers in creation order, so they roughly grow over time. Samples (sequential, 1 s apart): 35520000 Buch 2026, 35549913/-914/-920 Ultra HD / Blu-ray 2026 (new films come in a block), 35555000 E-Book 2026, 35560000 CD 2026, 35570000 E-Book 2022, 35600000 no record, so the top lies between 35.57 and 35.60 million. But the range is mixed (magazine issues, e-media, a 1982 book at 35549000), a new copy of an old title keeps its ID, and finding new IDs by probing means one request each (estimated 1,000+ new records a day, not measured), too heavy for VÖBB.
  - plan if built (pull view first): a daily job searches Medienart "Ultra HD Blu-ray" / "Blu-ray Disc" with the year filter for the current year, sorted "Jahr abwärts", a few pages; the IDs go into the records table of I16 with a first-seen date; new = not seen before; per new title one detail fetch to check whether the chosen library has a copy; a page "Neu im Bestand" per media type and library. Alerts (e-mail/push) come after, shared with I8.
  - limits: the date is when BibBlitz first saw a record, not the acquisition date; no baseline on the first run; within a year VÖBB gives no order, so newness comes only from our table; new copies of old titles are not detected; whether Vercel's free plan allows a daily cron job is not checked.
  - open: ask whether "my library" means one branch or the whole network; build I16 first, this is its first use
  - effort: M for the pull view (job, table, page, test; the table is I16), L for alerts (as I8). Re-scored 01.11.: M instead of L, score 1 (2%* × 1 ÷ 2)
- **I21** a ZIP typed into the search box (review 5, 02.11.2026; seen once in review 3 as well)
  - evidence: 1 of 122 visits, **verified**: an iOS visitor from DuckDuckGo read four FAQ items (incl. `distance`), searched "threshing day", then searched "13357" (a Berlin ZIP) and got 2 unrelated rows ("Der Museumsshop als Schnittstelle von Konsum und Kultur", "Emma : Roman"). They opened "Emma", saw the ZIP box on that detail page and saved their ZIP 13 s later (`zip-save`). Review 3 had "der stein der weisen, 13051" (a ZIP typed after a title; listed under P4). Pooled 2 of about 250 visits.
  - cause (hypothesis): the search box reads as the one input of the app, so people put the location where they expect it; the ZIP entry only shows on the detail and library page (inline since 09.07.) and in the `distance` FAQ item. The visitor found the box by luck of the junk row.
  - ideas: a query that is only a ZIP from `app/assets/berlinZipCodes.json` is not sent to VÖBB; the page offers "PLZ speichern" (same validation as `ZipCode.vue`) and says why. Reuse the existing store call, no new UI pattern. Do nothing for ZIPs inside a longer query.
  - effort: S, one check in `handleSearch` plus a small notice and a test with a valid and an invalid ZIP; the risk is a book whose title is a number that is also a ZIP (rare, the message could offer "trotzdem suchen")
  - status: open, one more case would make it worth doing

- **I23** service hours (staffed times) missing for libraries that have service-free times (found 02.11.2026 while fixing I4)
  - evidence: `npm run libraries:check` notes 19 libraries (about 20 now that Bodo-Uhse has hours) whose pages mention service-free, "ohne Service" or restricted-service times and have no `service_hours` stored: in Mitte, Lichtenberg (Kisch, Saefkow, Seghers, Bodo-Uhse), Pankow (Böll, Korczak, Schnurre), Friedrichshain-Kreuzberg (Raumer, Liebknecht, Neruda, Else Ury), Tempelhof-Schöneberg, Charlottenburg-Wilmersdorf (Schulz, Bonhoeffer, Bachmann), Spandau (Hauptbibliothek) and Köpenick Alter Markt; the exact list is the `note:` lines of the check. Only 5 libraries have `service_hours` today (the ZLB sites, Wasserturm, Museum Pankow). No visitor evidence (floor).
  - user problem: the library page says "Jetzt geöffnet" and shows the hours, but at e.g. Anton-Saefkow nobody is at the desk Sunday all day and before 11:00 on weekdays: no new registration, no card extension, no printing, and some media cannot be borrowed (the page of the Hauptbibliothek Spandau lists them). A visitor who travels for a service that is not there leaves with a wasted trip (severity 2).
  - plan: add `service_hours` for these libraries from the pages (the parse of "servicefrei" ranges and "ohne Service" sentences is the new part of the check; derive staffed = open minus service-free); the page already shows a "Servicezeiten" block and "geöffnet, ohne Service" from `service_hours`. Convention and test are in place (`docs/library-data.md`).
  - effort: M: 19 libraries in five wording variants, a parser extension with tests and a person reading each result (the wording is ambiguous in places, e.g. Kisch Friday: service-free 11-18 leaves only 10-11 staffed, and the ZLB gives service times in a separate paragraph)
  - status: open

# Competitors

## VideLibri (videlibri.de, checked 30.10.2026)
Read from the website, the F-Droid changelog and the aDISWeb templates in `benibela/videlibri` on GitHub (`data/libraries/templates/aDISWeb`). The app itself was not run, so everything below comes from the docs and the code, not from using it. Open whether VÖBB uses the generic aDISWeb template or its own (changelog says "aDIS/VÖBB").
- **What it is**: a client for the user's library account (GPL, one developer, Linux/Windows/Android), not a catalogue. It logs in and scrapes voebb.de like BibBlitz does. Updates break when VÖBB changes its pages (2.958 on 23.05.2026 fixed "search and ordering" for aDIS/VÖBB; the user quoted in I17 said it only renews loans now, probably an old version).
- **What it does for the user**: automatic renewal of all loans, due-date warnings from local data, catalogue search with reserve/order when logged in, a local book list (wish/reading list), search across 1,000+ libraries and 20 OPAC systems, Linux e-mail reports, statistics, BibTeX export.
- **Search**: structured fields (title, author, keyword, ISBN, free text, signature, year) plus filters (media type, branch, location, language); same VÖBB ranking as ours, no own index or typo tolerance. The result row status comes from VÖBB's traffic-light image (green/red/info) for the whole catalogue, not per branch and not by distance. The detail page reads per copy: branch, Standort, signature, barcode, loan type, status; no due date field.
- **What it cannot do**: compare libraries, show a map, say which library is worth a visit, rank by distance to the user; no browser version (install needed, reduced Android feature set); the book list is local, not VÖBB's Merkliste (not confirmed in the code, not looked for).
- **Where BibBlitz is ahead**: no install, availability per branch with distance to the user's ZIP, cleaned titles/authors/media types, language and media-type filter in one dialog, ISBN normalisation.
- **Where VideLibri is ahead**: account functions (renewal, reserve, order), targeted search fields and year/branch filters, Standort and signature per copy.
- **Ideas for BibBlitz** (not scored): branch filter "only in my library" (check first whether VÖBB offers the branch as a facet, fits I17); Standort/signature per copy (I14); targeted author/year search only if the data asks for it (author click had 2 events in 90 days). The gap VideLibri leaves is the one in I17: wishlist crossed with availability per library on a map.
- **Not to copy**: account/login features. Credentials would pass through our server, and VideLibri shows that this breaks with every VÖBB change.

## VÖPP (voepp.de, checked 01.11.2026)
Read from the iphone-ticker.de article (17.07.2026), the r/berlin post as an archived mirror (about 06.07.2026, 22 points, 4 comments) and the comments there. The app and its GitHub repo (`noestreich/voebbar`) were not run or read, so everything below is what the sources say.
- **What it is**: a free, unofficial iPhone (iOS 16+) and Mac app for the user's VÖBB account, by one developer (u/-drengen-, "mostly vibecoded"; the App Store lists aketo GmbH), open source. Like VideLibri it reads voebb.de directly, so it breaks when VÖBB changes its pages and shows the last loaded data when VÖBB is down.
- **What it does for the user**: loans of several accounts in one list sorted by due date and coloured by urgency, open fees, renewal of eligible items (it checks first whether renewal is possible), a reminder before the due date, cards added by barcode scan. No own servers, no ads, no tracking, no account; card number and password stay in the iPhone Keychain.
- **What the sources do not mention**: catalogue search or availability per branch (it looks like an account tool, not a search), Android, a web version.
- **Reactions in the thread**: u/6ohm found the features not relevant and asked for alerts about new Blu-rays/UHDs in the library (I20); u/Philip10967 liked the macOS menu bar app but said pasting into the login fields is blocked, so a password manager cannot be used.
- **Relation to BibBlitz**: complementary, not a rival. VÖPP serves "what do I have and when is it due" after borrowing, BibBlitz "which library has it now" before borrowing. I19 (a Reddit commenter, probably about VÖPP) asks for both in one place. Its model, credentials only on the device, works because it is a native app; a website cannot copy it (see I19).
- **Ideas for BibBlitz** (not scored): a FAQ entry "Kann ich hier verlängern?" that says no and points to VÖPP and VideLibri (S, links only; check first that the apps stay maintained); watch whether people ask for account features again after that.

# DONE
- library hours and links (I4, I22, 02.11.): `npm run libraries:check` compares all libraries with their websites; 16 libraries with wrong opening hours corrected, 2 added, 8 dead website links replaced (7 Tempelhof-Schöneberg pages moved from `/bibliotheken/<name>/` to `/<name>/`, plus the Kleiner Bücherbus in Reinickendorf), 7 links that pointed at a district front page now point at the library (Drewitz, Benn, Lankwitz, Fahrbibliothek Steglitz-Zehlendorf, Helene-Nathan, Hauptbibliothek Spandau, Humboldt), all redirected links updated to their final https URL, ZLB links point at `zlb.de/standorte/`; tests for the parser and for format and https in `libraries.json`; `docs/library-data.md`. Note: the Schöneberg-Nord library (Gertrud-Kolmar-Bibliothek, Pallasstr. 27) currently has no premises according to its page; the entry stays (VÖBB may still list copies) and has no hours
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
- I3 events of libraries (readings, workshops) on the library page (30.10.): only one person asked for it, library pages had 14% of visitors (09.10. snapshot), so demand is unproven. Investigated 30.10., feasible but not worth it now. Data: the berlin.de state calendar (`https://www.berlin.de/land/kalender/`) has an RSS feed filtered by location, `index.php?rss&v_ort=<location id>` (tested: AGB 21 events in ~0.7 s, with title, start time, description; the `ls=` parameter is paging, not a location filter). zlb.de has no feed, but the AGB events are also in the berlin.de calendar. A name match found a location id for 46 of 88 libraries (5 with several ids), the other 42 (bookmobiles, Berlin-Sammlungen, Außenmagazin, renamed ones) need manual mapping and upkeep. Open before building: reuse terms of the calendar are not stated (check the Impressum or ask BerlinOnline, skip the event images, they carry copyright notices). Effort M with the RSS feed (id map, cached server route, section on the library page, test with real items), L if district pages or zlb.de need their own scrapers. Score ~1. Reopen if library pages get more engagement or more people ask; a start would be the next 3 events, only for libraries with an id
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
