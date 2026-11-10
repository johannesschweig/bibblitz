# Shelf watch: re-checking, watching and notifying

Everything about one user job: **"Is the title I want on the shelf now, and where?"** Today visitors answer it by re-opening the same record or search again and again. This file holds the evidence, the VÖBB facts that limit what we can promise, the options (from "make the re-check fast" to push and e-mail) and the open questions. Read it before working on returning visitors, a watch or bell feature, notifications, recent searches, a Merkliste or list view, or anything that stores record IDs for the user.

The backlog item is **I18** in `TODO.md` (lane 2, Friction). On 09.11.2026 the ideas I8 (notifications), I10 (recent searches) and I17 (Merkliste matrix) were merged into it, because they are answers to the same problem; their old IDs point here.

## The user problem

People who want a specific title keep a standing "is it on the shelf now?" view open and re-check it by hand, sometimes every 1-2 hours. Two kinds of people, probably:

- **Waiting**: the title is out, they want to know when it comes back (the manual version of "tell me when it is available").
- **Keeping**: the title is available, they want to know it is still there before they go (record 35408557 was "Verfügbar" on every one of its six re-opens), or they keep the tab open as a reminder until they get to the library.

Johannes' reading (09.11.2026): visitors who enter on a `/media/<id>` URL are most likely refreshing to see whether it is available, or have the tab still open (iOS reloads an old tab when the browser comes back to it). The `0 s` visits without any event fit the open tab.

A third group with a list instead of one title: drongo (I17) keeps a VÖBB Merkliste and an Excel sheet of titles × usual libraries, and picks the library where a trip pays off. Same question, many titles at once.

**Measured 10.11.2026 (see Audience)**: the keeping group is by far the larger one. 56 of 62 re-check views showed a title with at least one copy available, so "tell me when it is available" serves about 1 in 10 re-checks, a handful of people a month. **Still open**: whether anyone wants to be *told* at all, or which form they want (list, reminder, alert). The fake door test below is meant to answer that.

## Evidence

Reach in the Friction table: about **43 of 415 visits (10%)** pooled over reviews 4-9; **22 of 96 (23%)** in review 9 alone. All mobile, mostly iOS, almost all direct.

- **review 9 (09.11.2026)**: the pattern extends from records to searches, and it is the largest in the data so far. 19 of 96 visits began on a `/?q=…` URL and 17 of them re-open a search that was run before: "Xylaphon" 7 landings in 3.5 days (iOS Safari, each ending within 5 s of the results; Umami ties only two of them to one browser), "Das neinhorn" 6 (iOS Chrome, five tied to one browser, 06.11. between 06:13 and 17:06, every 1-2 h, all 0 s with no search event), "Darm mit Charme" 2 (an Android browser that had searched it five times on 05.11., see I15), a filtered "Maria duenas" 2 days after it was searched, "Belarus history" 8 min after. Five more visits re-open a record seen before (35408557 for the sixth time, the showcase record 01354361 three hours after a click, 34269726, 15507147, 34284436 one hour after). Of the 13 searching visits that began on a `?q=` landing only 1 opened a record (typed searches: 30 of 35), so these visits come for the list, and the row badges are what answers them. Two readings, both consistent with the data: a bookmark of the search, or a browser tab left open that iOS reloads when the visitor returns. Not a bug; it also means about 6 of the window's 39 bounces are such reloads, so the bounce rate overstates first-time bounces. Identical re-searches within a visit too: "Tag Team" twice 7 min apart (a tab reload), "Poznanski" twice after the back button left the results (P7).
- **review 8 (05.11.2026)**: record 35408557 again, two more direct landings (iOS Safari, 04.11. 11:14Z and 13:04Z, default ZIP, one branch 7.7 km away, "Verfügbar"), so 5 landings in 27 h since 03.11. 09:57Z. No "Zurück", no "↗ VÖBB", no stay (both end in 0 s). A third returning browser landed on a record with a saved ZIP (`zip_default: 0`, Android), pressed "Zurück" after 1 s and searched (see P2). "Darm mit Charme" searched five times in 100 s within one visit (I15). Pooled about 21 of 319 visits (7%).
- **review 7 (04.11.2026)**: the cleanest record case. 4 of 68 real visits began on a record; 3 are the same record (35408557), all iOS Safari, direct, 03.11. at 09:57, 12:12 and 17:42 UTC (different Umami sessions, so not provable, but one device re-checking the same book three times in 8 h is the likeliest reading). One went to the library page after 6 s; none pressed "Zurück" or "↗ VÖBB", all three on the default ZIP, so the distance never reflected where this person lives.
- **review 6 (03.11.2026)**: an iOS visit landed directly on `/media/07233102`, a record that visits of review 5 had opened; it pressed "Zurück" 2 s later and searched another film. A second visit resumed a library-with-book tab (first event a logo click). No `voebb-click` after either.
- **review 5 (02.11.2026)**: 15 of 122 visits began on a record (12) or library page (3); 8 of the 15 re-open a record that an earlier visit had opened (same device class and OS), 3 confirmed as returning browsers by Umami session: a record again after 30 min and after 1 h 52 min, a library-with-book page 3.6 h later. All 8 mobile; none pressed "Zurück", none clicked "↗ VÖBB".
- **review 4 (30.10.2026)**: 5 of 39 visits were a browser that came back (same Umami session) and landed directly on a record or library page: one returned 13 h later, one opened the same library-with-book URL twice, one opened the same record twice 8 min apart.
- **Library comparison by hand** (reviews 8 and 9, the list group): one visit opened 11 library pages in 200 s, one 7 in 150 s, both on the default ZIP, a third compared two libraries in 16 minutes; "Zurück" then zig-zags (P14). 3 of 132 visits.
- **drongo** (unsolicited, 30.10. and 09.11.2026), a former VideLibri user: "VideLibri konnte ich früher nutzen, jetzt geht die nur noch, um die eigenen Ausleihen zu verlängern. Ich brauch aber eine Anbindung zu meiner Merkliste. Führe parallel eine Excel-Tabelle in der ich immer mal wieder notiere welche Bib. welches Buch hat, um dann zu überlegen welche Bib. gerade ein Besuch lohnt. Wär schön sowas mal automatisch zu haben. Datenbank-Anbindung und dann ne Karte der Bibs. Aber gut, Zukunftsmusik." Follow-up: the sheet has the Merkliste titles as rows and their usual libraries as columns, crosses where a title is available; copying is manual ("Das übernehmen der Einträge passiert leider manuell"). In the library: "Aber auch in der Bib. hätte ich gerne eine Ansicht welche Medien meiner Liste gerade hier auszuleihen sind und unter welcher Kennung ich die finde. Da muss ich dann auch immer mich einloggen und meine Merkliste manuell durchgehen."

**Speaks against**: the own watchlist (bookmarks, local list) was removed on 22.07.2026 because nobody used it, and "Zuletzt gesucht" (I10) was dropped on 29.10. because the navbar "Zurück" (3e63ff4) keeps the results. Both decisions were taken before there was data on returning visitors, and the navbar "Zurück" does not help people who come back by URL. The watchlist was a list without the availability payoff; whether that was why nobody used it is not known.

## Audience (Umami, 10.10.-09.11.2026)

Window: 642 visitors, 817 visits, including the Reddit and blog spike of late October (week of 26.10.: 374 sessions; week of 02.11.: 224).

**Method** (raw events from `npm run umami -- --days 30`, `data/umami/2026-11-09/events.json`; the script was a throwaway in the session scratchpad, so redo it from this description): a *re-check* is a visit whose first pageview is a direct landing (no referrer domain) on a `/media/<id>` or `/?q=…` URL that an earlier visit in the window had already opened. The showcase records (34112359, 01354361, 07235286) are left out. Each re-check gets a certainty tier: **A** = the same Umami session opened it before (same browser, confirmed); **B** = a visit with the same OS and device type opened it before (likely the same person); **C** = only someone else did. "People" is counted as distinct target + OS + device type.

| Tier | Visits | People | Share of 642 visitors |
|---|---|---|---|
| A, same browser confirmed | 30 (20 records, 10 searches) | about 24 | about 4% |
| A + B, likely the same person | 94 (53 records, 41 searches) | about 54 | about 8% |
| Heavy: 3 or more visits to one title | - | 14 | about 2% |

- A is a floor: Umami gives a new session ID when a phone changes its IP address, so real returns go unrecognised. A + B is a ceiling: on a popular title two different iPhone users look like one person ("Die Lücken" 35540903, "harry potter").
- It is not only the spike: re-checks ran at 4-12 a day before and after the 27.-28.10. peak.
- They are glances: 61 of the 94 A + B visits end within 5 s.
- Top repeats: "Xylaphon" (iOS, 7), 01351601 (iOS, 6), "Darm mit Charme" (Android, 6), 35408557 (iOS, 6), "Das neinhorn" (iOS, 6), 35540903 (iOS, 4).

**Was the title available at the time?** The `detail-view` event of each A + B re-check visit (62 views, fetched one by one from `/event-data/<id>`):

- **56 of 62 had at least one copy available** (`available_now` > 0), only **6 had none**. Several titles were available on every single re-check (35408557 1 copy six times, 01351601 14-18 copies six times).
- Nearest available copy: median about 3 km (0.5-21 km). But 34 of the 62 views were on the default ZIP (10178), so the distance is from Mitte, not from home; some of the "available" views may be people waiting for a copy *near them*, which the data cannot show.

**What it means**: a "notify me when available" feature reaches about 3-5 people a month at today's traffic. The larger group (25-55 a month) re-checks titles that are on the shelf: they keep a to-do ("I want to fetch this") and check it is still there. A list of watched titles with the current status (options 3 and 4) fits them better than an alert.

## VÖBB facts that limit what we can promise

- **Due date**: VÖBB shows "Fällig am …" per copy on loan; `utils/availability.ts` turns it into `daysToWait` and the badges say "Verfügbar in n Tagen" (P12, done 10.11.2026; reserved copies without a due date show no number).
- **Renewals** (Johannes, 09.11.2026; exact rule and loan periods not checked on voebb.de): a borrower can renew a loan 2 or 3 times **if there is no Vormerkung on the copy**. So a due date without a Vormerkung is only the *earliest* return, not the expected one: each renewal adds another loan period. Consequences:
  - our "n Tage" overpromises for copies that get renewed. This may be a Trust-lane issue in its own right (people plan a trip on the date); check how often due dates move (needs stored status, I16).
  - a reminder on the due date (option 1 below) hits less often than it looks.
- **Vormerkung** (reservation, needs the VÖBB login): blocks renewals, and a returned copy goes to the person who reserved it, not back to the shelf. So:
  - for a copy with Vormerkungen, "returned" does not mean "on the shelf for you"; an alert would be wrong unless we know the queue.
  - for someone who really wants one title, VÖBB's own Vormerkung is the strongest lever: it stops the borrower renewing and holds the copy, at the cost of a login, a pickup branch and possibly a fee (not checked). BibBlitz cannot place it, but it can point to it.
  - the detail page has a "Vormerkungen" field (seen 01.11.2026 while checking I20); we do not scrape it yet. Whether it is per record or per copy is not checked.
- **Sorting back**: a returned copy takes time to get from the return desk to the shelf; how long is not known.
- **Race**: an alert says "on the shelf now"; someone else may borrow it before the visitor arrives. Only "Verfügbar" is a reliable trigger; the due date is only useful to decide when to look.

## Options

Cheapest first. Effort in the Friction scale (1 = about an hour, 2 = up to a day, 4 = more or a decision first).

| # | Option | How it works | Effort | Fit with "free, no account, no tracking" | Main risk |
|---|---|---|---|---|---|
| 0 | **Make the re-check fast** | Badges of the top rows load first (today they queue behind the rest), plus a "Stand: 14:32" line so a reloaded tab says how fresh it is | 1 | Perfect, no stored data | Does not remove a single check |
| 1 | **Calendar reminder (.ics)** | "Erinnern" next to a "Fällig am" branch downloads a calendar event on the due date with the BibBlitz link; event `remind-click` | 1 | Perfect: no server, no identity | Due date is not shelf date (renewals, Vormerkungen); still a pull |
| 2 | **Link to VÖBB Vormerkung** | On a record with nothing free, a "Bei VÖBB vormerken" link to the record (the "↗ VÖBB" link already exists, so this may be wording) | 1 | Perfect | Sends people away; fee and login on VÖBB's side |
| 3 | **Local watch list ("Beobachtet", the bell)** | Bell per record (or per search), IDs in `localStorage`; the home page shows "2 deiner Titel sind jetzt verfügbar" with current badges. Absorbs "Zuletzt gesucht" (I10) and "Zuletzt angesehen" | 2 | Good, nothing leaves the device | Same shape as the watchlist removed for disuse; one list per device |
| 4 | **List in the URL + matrix** (drongo's job) | `/liste?ids=…` as a bookmark on both devices (or a QR code to move it to the phone); matrix titles × usual libraries (I27's Stammbibs as columns), and "aus deiner Liste hier verfügbar" with Signatur on the library page | 2-4 | Good, the URL is the storage | One detail scrape per title (VÖBB load, time to fill the matrix); import is manual unless VÖBB's Merkliste can be exported |
| 5 | **Push via ntfy or Telegram** | User subscribes to a random topic; a checker on our side sends the alert | 2-4 | Good, no personal data with us | Niche, needs an extra app |
| 6 | **Web Push** | Browser push subscription + record ID stored on a server, a checker polls VÖBB | 4 | OK, pseudonymous | On iPhone only after "Zum Home-Bildschirm" (iOS 16.4+), and most returning visitors are on iOS; service worker and storage |
| 7 | **E-mail** | Address + record ID stored, checker sends the mail | 4 | Weakest: personal data, double opt-in, unsubscribe, privacy text | Most build, deliverability, legal |
| 8 | **VÖBB Merkliste via login** (I17 part a) | Read the user's Merkliste with their VÖBB credentials | 4 | Breaks the no-login position (see I19 and "Competitors → Not to copy") | Credentials through our server, breaks on every VÖBB change |

The old note on the bell (Johannes, before 09.11.): "add a bell to an exemplar. If you load the page all bells are loaded. You get a popup with the bells that are green." Also "bell for a search?". That is option 3; a bell on a search would cover the `/?q=` re-checkers, a bell on a record the `/media` ones.

"Zuletzt gesucht" as evaluated for I10 on 29.10. (not built): chips (max 5, only queries with hits, query text without filters) in the empty home state next to the suggestions, "Verlauf löschen", event `search-recent`, a short privacy note (the privacy page does not mention our own `localStorage` yet, not even the ZIP). Alternatives: native `<datalist>` (no delete control), combobox dropdown (larger).

### Where a checker would run (options 5-7)

Since 10.11.2026 the site runs on one always-on Fly.io machine (I26; no 10 s function limit and no CPU quota any more, but 256 MB memory, ~100 MB idle). A checker could run there as a scheduled task, or on the Pi, which already runs a monthly job with ntfy (`docs/library-data.md`). The Pi keeps the load off the web machine. Storage: Supabase is still a dependency, or SQLite on the Pi; the records table of I16 would hold the last known status. Keep the load on voebb.de small: use the due date to schedule, e.g. daily until shortly before it, then every 1-2 h; stop after a successful alert or after a few weeks. A Vormerkung count of 0 means the due date may move (renewal), so keep checking at a low rate after it passes.

## Upside

- **For visitors**: it removes the 1-2-hourly manual re-check of the core job. As far as known, neither VÖBB (only its own Vormerkung) nor VÖPP or VideLibri (both about own loans) offer "tell me when any branch has it", so it is a differentiator and an easy marketing line.
- **For the product**: push and e-mail are the only channels that bring people back without a bookmark, which matters with small, bursty traffic. A paid "Pro" alert was listed under I28 as one of the few things people might pay for.
- **Limits**: 25-55 re-checking people a month (4-8% of visitors), of whom only about 1 in 10 is waiting for a title that is out; a removed watchlist. Most of the group needs "still there", not "back again".

## Related items

- **I16** records table: holds the last known status a checker or "jetzt verfügbar" needs, and would show how often due dates move.
- **I20** new Blu-rays in my library: same delivery channel (an alert), other trigger (new title). Build the channel once.
- **I27** favourite libraries: defines what "available" means in an alert ("at one of my libraries") and gives the matrix its columns.
- **I26** hosting (done 10.11.: Fly.io, 256 MB) and **I29** (obsolete): where a checker can run.
- **I19** loans and renewal: a different job (own account, needs the login); only related through option 8.
- **P12** "Verfügbar in 2 Tagen" wording (done 10.11.2026): the renewal fact above means the number is the earliest possible day, not a promise.

## Open questions

1. ~~How many of the re-checked records were unavailable at the time?~~ Answered 10.11.: 6 of 62 (see Audience). Not answered for searches (`search-started` carries only the row count, not availability).
2. Do re-checkers want to be told, kept a list, or reminded, or only want a fast answer? The fake door test below.
2a. Are the "available" re-checks on the default ZIP people waiting for a copy near them? The fake door logs `zip_default` and `nearest_available_km` with each tap.
3. VÖBB rules: how many renewals, loan period per media type, Vormerkung fee, and whether the "Vormerkungen" field is per record or per copy.
4. drongo: is pasting VÖBB links once acceptable, or only the automatic Merkliste? Can the Merkliste be exported (e-mail, print view) as a login-free import? How many titles?
5. Whether the Merkliste is reachable via aDISWeb without a login (probably not).

## Fake door test (planned 10.11.2026, not built)

Goal: find out whether people want this at all, and which form, without building it and without collecting personal data.

- **Door**: a bell button "Beobachten" on **every** detail page, available or not. Showing it only when nothing is free would miss 9 of 10 re-checkers. A second door on the results ("Diese Suche beobachten", for the `/?q=` re-checkers, 41 of 94) only later: two doors halve the counts.
- **On tap**: one honest sheet, no input field, no e-mail. Copy along the lines of "Gibt es noch nicht. Wir schauen, ob es gebraucht wird. Was hättest du gern?" with one tap on one of:
  - "Sag mir, wenn es wieder verfügbar ist" (waiting → alert, options 5-7)
  - "Auf einer Liste sammeln, mit aktuellem Stand" (keeping → options 3-4)
  - "Erinner mich am Rückgabedatum" (→ option 1)
  - optional second row for the channel: Push, E-Mail, Kalender.
- **Event**: `watch-interest` with `choice`, `channel`, `available_now`, `nearest_available_km`, `zip_default` and `recheck` (1 when the visit landed directly on this record). Denominator: `detail-view` (already tracked). Add the event to `FEATURES` in `scripts/umami/digest.mjs` and to `docs/analytics.md`. No privacy text change: no new stored data.
- **Timebox**: 4 weeks, about 150-250 visits with a detail view at today's traffic. Remove the door at the end either way; every tap is one disappointed person, so keep it to one sheet.
- **Thresholds, fixed before launch** (reference: 14.7% of detail visits click "↗ VÖBB"):
  - **build**: taps in 5% or more of detail visits, from at least 8 different visitors, a few of them re-check visits. The most frequent `choice` decides what gets built.
  - **drop**: under 2%. Close the bell and the watchlist question for good.
  - **in between**: build the cheapest form first, option 1 (calendar reminder).
- **Cost**: build 1 (a button, a sheet, one event), carry `-`.

## Suggested order

1. Option 0 (fast first badges, "Stand" time); no new feature, no stored data. Can run alongside the test.
2. The fake door test above, 4 weeks.
3. Depending on its result: option 3 (local watch list, covers the keeping group and recent searches) and option 4 for list users; or option 1 if only reminders are wanted.
4. Push (option 5 or 6) only if "Sag mir, wenn es wieder verfügbar ist" wins clearly; e-mail last.
