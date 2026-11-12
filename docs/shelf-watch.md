# Shelf watch: re-checking, watching and notifying

Everything about one user job: **"Is the title I want on the shelf now, and where?"** Today visitors answer it by re-opening the same record or search again and again. This file holds the evidence, the VÖBB facts that limit what we can promise, the options (from "make the re-check fast" to push and e-mail) and the open questions. Read it before working on returning visitors, a watch or bell feature, notifications, recent searches, a Merkliste or list view, or anything that stores record IDs for the user.

The backlog item is **I18** in `TODO.md` (lane 2, Friction). On 09.11.2026 the ideas I8 (notifications), I10 (recent searches) and I17 (Merkliste matrix) were merged into it, because they are answers to the same problem; their old IDs point here.

## The user problem

People who want a specific title keep a standing "is it on the shelf now?" view open and re-check it by hand, sometimes every 1-2 hours. Two kinds of people, probably:

- **Waiting**: the title is out, they want to know when it comes back (the manual version of "tell me when it is available").
- **Keeping**: the title is available, they want to know it is still there before they go (record 35408557 was "Verfügbar" on every one of its six re-opens), or they keep the tab open as a reminder until they get to the library.

Johannes' reading (09.11.2026): visitors who enter on a `/media/<id>` URL are most likely refreshing to see whether it is available, or have the tab still open (iOS reloads an old tab when the browser comes back to it). The `0 s` visits without any event fit the open tab.

A third group with a list instead of one title: drongo (I17) keeps a VÖBB Merkliste and an Excel sheet of titles × usual libraries, and picks the library where a trip pays off. Same question, many titles at once.

**Measured 11.11.2026 (see Audience)**: the two groups are about the same size. Of the record re-checkers that can be classified, about a third keep a title that is on the shelf near them, and about a third wait, mostly **for a copy near them** while copies elsewhere in Berlin are free; the last third cannot be told apart (default ZIP). "Waiting" therefore means "free at a library I would go to", not "free anywhere". **Still open**: whether anyone wants to be *told* at all, or which form they want (list, reminder, alert). The fake door test below is meant to answer that.

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

**Was the title available at the time?** The `detail-view` events (`branches`, `available_now`, `nearest_available_km`, `zip_default`) of every visit in each record series, fetched one by one from `/event-data/<id>`. A first pass on 10.11. counted "at least one copy free anywhere in Berlin" (56 of 62 views) and concluded 90% keep, 10% wait. **That was wrong** (corrected 11.11.): a title with 2 of 91 copies free, 9 km away, counts as "available" but is exactly what someone waits on. Classified by the state at the last re-check, `NEAR_KM` = 3 km:

| Record re-checkers (31 people, 53 re-checks) | People | Re-checks |
|---|---|---|
| **Keeping**: every copy is free (often a single-copy title: 35408557, 12019738 are 1 of 1) | 5 | 12 |
| **Keeping**: saved ZIP, a free copy within 3 km | 5 | 5 |
| **Waiting**: nothing free anywhere | 2 | 2 |
| **Waiting for a near copy**: saved ZIP, nearest free copy more than 3 km away (35540903 "Die Lücken": 2 of 91 free, 9.3 km, four re-checks) | 8 | 12 |
| **Waiting, resolved**: 07214737, saved ZIP, nearest free copy 21 → 17 → 1.4 km over three re-checks | 1 | 3 |
| **Cannot tell**: default ZIP and some copies out, so the distance is from Mitte (01351601: 17 of 37 free, six re-checks, 7 library pages opened in Spandau and Reinickendorf in the same visits) | 9 | 18 |
| Detail failed | 1 | 1 |

- So about **10 keep and 11 wait** among the 21 that can be classified, and the waiting is mostly for a copy *near them*. 4 series saw the availability change between re-checks.
- Searches (23 people, 41 re-checks) cannot be classified: a list has no single availability. "Xylaphon" (7) is probably the same iPhone as record 35408557 (one copy, 7.7 km), so one person accounts for 13 re-checks.
- **Retention**: only 27 of 643 browsers (4%) came back on another day in the window (a floor, see above), so most visitors never return after finding BibBlitz.

**What it means**: both jobs are real and about equally common: 25-55 re-checking people a month, roughly half waiting for a copy at a library they would go to, half keeping a title that is there. An alert or a list must therefore be **per near library** ("frei in deiner Nähe" / at the Stammbibs of I27), not "free anywhere". And only something that reaches people outside the site (calendar, push, e-mail) brings them back; a list on the site only helps those who already return.

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
- **VÖBB already notifies, but only the people with a loan or an order** (research 11.11.2026, from district library pages, details may differ per library, one page is old; not checked on voebb.de itself):
  - A borrower with an e-mail address in "Mein Konto" (E-Mail / SMS verwalten) gets an automatic reminder **two days before** the loan ends.
  - A **Vormerkung or Bestellung** (online at voebb.de or in the library) notifies by e-mail or SMS when the item is returned and ready. A completed one costs **€1**; ordering a copy from another branch to the chosen library is possible network-wide, and the fastest copy may add transport costs (amount not stated).
  - Loans can usually be renewed **three times online** unless someone has reserved the item (confirms the renewal rule above).
  - Consequence: for the group waiting for a *near* copy while others are free, "bestellen" at about €1 plus transport may serve better than an alert. Worth a fourth answer in the fake door sheet, or a plain link.

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

### Other channels (research 11.11.2026, product view)

Beyond options 0-8. Sources are vendor docs and district library pages, so read the figures as indications.

| Option | What the visitor gets | Pro | Con |
|---|---|---|---|
| **VÖBB's own order or reservation** (link out) | Orders the title to their library; VÖBB emails or texts when it is ready | A real hold on a copy that works today, incl. a free copy from another branch. VÖBB sends the notice, so we store nothing | €1 per completed order plus transport costs; needs a VÖBB login; sends the visitor away, no return visit |
| **WhatsApp message** | A message in the app they already use | Most-used messenger, no new app | Business interface is paid per message (about €0.05 for utility messages in Germany per vendor price lists; the free service window ends 01.10.2026), business verification, explicit opt-in, phone number stored. Channels is a broadcast feature, not per title (unverified) |
| **SMS** | A text message | Works on every phone, no app; VÖBB already sends SMS | Per-message cost (not researched); a phone number is the most sensitive datum, worst fit with "no account, no tracking" |
| **Wallet pass** (Apple/Google) | A pass whose lock-screen note appears near a library | Right moment and place (up to 10 locations per pass); no app | Apple developer account and signing; iPhone-centric; users can switch lock-screen suggestions off; a tap opens the pass, not our page; passes are built for tickets and cards. Heavy build for few users |
| **Live tab** (the page re-checks itself, tab title "✓ verfügbar") | The open tab keeps itself current | Matches today's behaviour, no data stored, no consent | Only while the tab is open; iOS suspends background tabs and most re-checkers are on iPhones; no return visit |
| **Weekly e-mail digest** ("Deine Titel diese Woche") | One mail for all watched titles | A regular reason to return; fits list users like drongo | Not instant; reads like marketing, needs clear consent and an unsubscribe |
| **RSS/Atom feed** | A feed for a reader app | No personal data, no consent | Almost no library visitors use feed readers; no phone alert |

Reading: none of these beats e-mail or push on reach against effort; WhatsApp and SMS cost per message and need phone numbers; the wallet pass is the one creative idea (it works at the right place) but the build is large. Web Push on iPhone works only for sites added to the home screen, and no clean 2026 opt-in comparison with e-mail was found (vendor figures conflict).

Sources: [PassKit, wallet location alerts](https://help.passkit.com/en/articles/2010114-how-many-locations-will-trigger-a-lock-screen-message) · [Airship, location-based pass alerts](https://www.airship.com/docs/guides/wallet/user-guide/notifications/triggers/) · [WhatsApp API pricing Germany](https://chatmaxima.com/whatsapp-api-pricing/germany/) · [WhatsApp Business costs 2026](https://chatarmin.com/en/blog/whatsapp-business-costs) · [Stadtbibliothek Neukölln, Bestellungen und Vormerkungen](https://www.berlin.de/stadtbibliothek-neukoelln/katalog-service/benutzerinformationen/artikel.176863.php) · [Stadtbibliothek Neukölln, Ausleihzeiten und Verlängerungen](https://www.berlin.de/stadtbibliothek-neukoelln/katalog-service/benutzerinformationen/artikel.176774.php) · [Stadtbibliothek Marzahn-Hellersdorf, VÖBB](https://www.berlin.de/bibliotheken-mh/service/voebb/)

### Where a checker would run (options 5-7)

Since 10.11.2026 the site runs on one always-on Fly.io machine (I26; no 10 s function limit and no CPU quota any more, but 256 MB memory, ~100 MB idle). A checker could run there as a scheduled task, or on the Pi, which already runs a monthly job with ntfy (`docs/library-data.md`). The Pi keeps the load off the web machine. Storage: Supabase (decided 11.11.2026, see "Storage decision" below); the records table of I16 could later hold the last known status there. Keep the load on voebb.de small: use the due date to schedule, e.g. daily until shortly before it, then every 1-2 h; stop after a successful alert or after a few weeks. A Vormerkung count of 0 means the due date may move (renewal), so keep checking at a low rate after it passes.

## Upside

- **For visitors**: it removes the 1-2-hourly manual re-check of the core job. As far as known, neither VÖBB (only its own Vormerkung) nor VÖPP or VideLibri (both about own loans) offer "tell me when any branch has it", so it is a differentiator and an easy marketing line.
- **For the product**: push and e-mail are the only channels that bring people back without a bookmark, which matters with small, bursty traffic. A paid "Pro" alert was listed under I28 as one of the few things people might pay for.
- **Marketing (Johannes, 11.11.2026)**: a reason to come back is a marketing instrument in its own right. Today only 4% of browsers return on another day; a reminder or alert puts BibBlitz in front of someone who already found it, at the moment they want to go to the library. Only outbound channels (calendar, push, e-mail) do that; a list on the site does not.
- **Limits**: 25-55 re-checking people a month (4-8% of visitors), roughly half of them waiting for a near copy; a removed watchlist.

## Related items

- **I16** records table: holds the last known status a checker or "jetzt verfügbar" needs, and would show how often due dates move.
- **I20** new Blu-rays in my library: same delivery channel (an alert), other trigger (new title). Build the channel once.
- **I27** favourite libraries: defines what "available" means in an alert ("at one of my libraries") and gives the matrix its columns.
- **I26** hosting (done 10.11.: Fly.io, 256 MB) and **I29** (obsolete): where a checker can run.
- **I19** loans and renewal: a different job (own account, needs the login); only related through option 8.
- **P12** "Verfügbar in 2 Tagen" wording (done 10.11.2026): the renewal fact above means the number is the earliest possible day, not a promise.

## Open questions

1. ~~How many of the re-checked records were unavailable at the time?~~ Answered 11.11.: about half of the classifiable record re-checkers wait, mostly for a near copy (see Audience; the 10.11. answer "6 of 62" counted any free copy in Berlin and was wrong). Not answered for searches (`search-started` carries only the row count, not availability).
2. Do re-checkers want to be told, kept a list, or reminded, or only want a fast answer? The fake door test below.
2a. Are the "available" re-checks on the default ZIP people waiting for a copy near them? The fake door logs `zip_default` and `nearest_available_km` with each tap.
3. VÖBB rules: loan period per media type, whether the "Vormerkungen" field is per record or per copy, and the transport cost of a network-wide order (renewals: three online unless reserved; fee €1 per completed order, both from district pages, see the VÖBB facts).
4. drongo: is pasting VÖBB links once acceptable, or only the automatic Merkliste? Can the Merkliste be exported (e-mail, print view) as a login-free import? How many titles?
5. Whether the Merkliste is reachable via aDISWeb without a login (probably not).

## E-mail route (decision 11.11.2026)

Johannes chose e-mail as the channel and wants to design the **experience first**: the visitor picks which libraries to watch, with a default from the ZIP. Everything below is a plan, nothing is built. Not legal advice; the consent and privacy points need a check.

### Concept

A one-shot watch: "Benachrichtige mich per E-Mail, sobald dieser Titel in einer meiner Bibliotheken verfügbar ist." One alert, then the address is deleted (at the latest after 30 days). No account, no newsletter, no marketing in the mail. The alert links to `/media/<id>?ref=alert`, so the campaign report counts the return visit.

### Name and copy (decided 11.11.2026)

The feature is called **Wecker**: button "Wecker stellen", state "Wecker läuft", stop "Wecker ausschalten", icon `lucide:alarm-clock` (`alarm-clock-check` when active). Johannes wanted no brand tie. Considered: Blitzmeldung (brand wordplay, dropped), Blitzpost, Blitzalarm, Sag Bescheid, Im Blick behalten, Ping, Benachrichtigung (the plain alternative; it stays the wording in the consent line and the mails: "per E-Mail benachrichtigt"). Known weak spot of "Wecker": it suggests a time, so a line under the title says what it waits for ("Wir mailen dir einmal, sobald es in deinen Bibliotheken verfügbar ist.").

| Where | Copy |
|---|---|
| Button on the detail page | Wecker stellen |
| Prompt (saved ZIP, nothing free near) | **Nichts frei in deiner Nähe.** Stell dir einen Wecker: Wir mailen, sobald es da ist. |
| Sheet title and submit button | Wecker stellen |
| Sheet line | Wir mailen dir einmal, sobald es in deinen Bibliotheken verfügbar ist. |
| Count, e-mail label | 5 gewählt / Keine gewählt, E-Mail |
| Errors | Wähle mindestens eine Bibliothek. / Das ist keine gültige Adresse. / Bitte stimme zu. / Hat nicht geklappt. Nochmal? / Zu viele Versuche. Kurz warten. |
| Sent | **Fast da.** Bestätigungsmail an … ist raus. Link anklicken, dann läuft der Wecker. |
| Confirm page (the link in the mail lands here, no button) | **Wecker läuft.** Wir mailen dir, sobald … in einer deiner 5 Bibliotheken verfügbar ist. [Zum Titel] [Ausschalten] |
| Stop page (opens and switches off by itself) | **Wecker aus.** Deine Adresse ist gelöscht. Wir mailen dir nichts mehr zu … |
| Mail 1, confirmation (mocked) | Betreff "Bitte bestätigen: Wecker für „<Titel>“". Text: Du hast einen Wecker für <Titel> gestellt. Wir mailen dir einmal, sobald ein Exemplar in einer deiner 5 Bibliotheken verfügbar ist. Button **Wecker bestätigen**. "Nicht von dir? Dann ignoriere diese Mail." |
| Footer of both mails | "Nicht mehr nötig? **Wecker ausschalten**" (link to `/watch/stop`), plus the `List-Unsubscribe` headers (one-click), which mail programs show as "Abbestellen" next to the sender. In mail 2 the address is deleted already, so the stop page answers "Diesen Wecker gibt es nicht mehr". |
| Mail 2, Wecker klingelt (mocked) | Betreff "Wecker: „<Titel>“ ist verfügbar". Text: **Dein Wecker klingelt.** <Titel> ist jetzt verfügbar: the libraries with distance and Signatur. Button **Zum Titel** (`/media/<id>?ref=wecker`). "Das kann schnell weg sein. Das war's: Wir haben deine Adresse gelöscht." |

The section legend stays "Welche Bibliotheken?" ("Wo?" was proposed and left open). The consent line stays factual on purpose (one mail, deletion, privacy link).

**No technical details in the UI (decided 11.11.2026)**: not shown are the 24 hours the confirmation link is valid, the 30 days the Wecker runs, and a note for repeat subscriptions. The consent line reads "Ich möchte einmalig per E-Mail benachrichtigt werden. Danach wird meine Adresse gelöscht." The retention period (30 days at most) therefore has to be in the privacy text, to be checked legally. An expired link just says "Der Link ist abgelaufen. Stell den Wecker einfach neu."

### The experience (detail page)

(The quoted button and heading texts in this section are from before the naming decision, see the table above for the current ones.)

**Entry.** A button ("Wecker stellen", alarm clock icon) in the "Standorte" heading row of `app/pages/media/[id].vue`, shown when the record has at least one copy that is not free right now. When nothing is free near the visitor it also appears as a line above the list. Hidden when every copy is free, when there are no copies, and during VÖBB maintenance.

**Sheet** (a dialog like `FilterPage.vue`; one scrollable view on a phone):

1. Heading "Benachrichtigen, sobald verfügbar" and the title.
2. **"Welche Bibliotheken?"**: one checkbox row per library that holds a copy of this record and has **no free copy** (the `availability` list, so never all 88; libraries with a free copy are left out, there is nothing to wait for). Each row shows name, distance (only with a saved ZIP) and the current status pill. Quick choices: "In meiner Nähe", "Alle", "Keine".
3. **Default selection from the ZIP.** With a saved ZIP: every listed library within 3 km (`NEAR_KM`), or the 3 nearest if none is within 3 km. With the default ZIP (10178): nothing preselected and no "In meiner Nähe", because a distance from Mitte means nothing for most people. The sheet has **no ZIP entry of its own** (decided 11.11.2026): the ZIP is set on the detail page above the list.
4. E-mail field and one consent line: "Ich möchte einmalig per E-Mail benachrichtigt werden. Meine Adresse wird danach gelöscht, spätestens nach 30 Tagen." with a link to the privacy page. Button "Benachrichtigung einrichten".
5. After submit: "Fast da": the confirmation mail is on its way. Its button opens `/watch/confirm`, which confirms by itself and says "Wecker läuft" (no extra click; the call comes from the page script, not from the request for the link, so mail scanners that only open links do not confirm for the visitor).

**Trigger.** Any selected library goes from no free copy to at least one free copy ("Verfügbar", `daysToWait` of -999). A copy with a restriction (`access`: reading-room or order-only) counts but the mail says so. Reserved copies do not count.

**Alert mail.** Subject "Verfügbar: <Titel>"; lists the libraries that are now free with distance and Signatur; "Kann schnell weg sein, ein anderer kann sie vorher ausleihen." The link goes to the record. Plain text first, simple HTML second.

**States to design**: invalid address; the same address already watching this record (say "wir haben dir die Bestätigung erneut geschickt", never reveal who is subscribed); rate limited; offline or server error with retry; the record meanwhile became free (the sheet re-checks before sending); confirm link expired (24 h); stop link used twice.

**Open design questions**: remember the chosen libraries on the device (`localStorage`) and preselect them next time? That is also the first real use of the favourite-libraries idea (I27), so it should be decided together with it. Watching a whole search instead of one record is left out of the first versions.

**Events** (add to `FEATURES` in `scripts/umami/digest.mjs` and `docs/analytics.md`): `watch-open` (`branches`, `not_free`, `zip_default`, `nothing_free_near`), `watch-submit` (`libraries`, `preselected_unchanged`), `watch-confirm`, `watch-stop`, and the `ref=alert` return visit via the campaign report.

### First slice: two options

| | Option 1: fake door | Option 2: real flow, alerts sent by hand |
|---|---|---|
| What it is | Bell and sheet, nothing is delivered; the sheet asks which form and channel the visitor would want | Everything the visitor sees is real: picker, e-mail, confirmation mail, stop link. Only the *checking* is run by Johannes (a protected endpoint, dry run first) instead of a timer |
| Build | 1 | 2 to 3 sessions, plus accounts and DNS |
| Signal | A tap is cheap; it cannot tell "curious" from "gives an address" | A confirmed address is the real cost step; also shows which libraries people pick and whether the default selection fits |
| Volume | Few taps | Estimate 3-8 confirmed subscriptions a month (about a third of the 10-25 waiting re-checkers; an estimate, not data), so also small |
| Risk | Each tap is a disappointed visitor; nothing reusable is built | More work up front; a promise to keep; if nobody subscribes the work was for little (but the parts are reusable) |
| Reusable later | Nothing | Store, mail sender, confirm/stop, picker, privacy text, DNS |

The difference between "manual" and "automatic" checking is small: the function that scrapes a record and evaluates the rule is needed either way, the timer is a few lines. Manual mostly buys control: a dry run shows every alert before it goes out, which is wise for the first weeks (wrong alerts cost trust).

**Recommendation: option 2.** Proposed success rule for the first 4 weeks (to revisit, the numbers follow my estimate): 5 or more confirmed subscriptions: add the timer; 2 to 4: keep running it by hand and wait; fewer than 2: stop and remove the button. Also read the funnel (`watch-open` → `watch-submit` → `watch-confirm`) and how many alert mails lead to a return visit.

**In slice 1**: picker sheet with ZIP default, e-mail and consent, store, confirmation mail, `/watch/confirm` and `/watch/stop`, privacy text and FAQ, events, a feature flag (`NUXT_PUBLIC_WATCH_ENABLED`), and `POST /api/watch/run` (secret in a header; `?dry=1` lists what would be sent; otherwise sends). **Out**: timer, expiry mail, a status page, searches, digest, remembering the library choice (decide with I27).

### Building blocks

| Piece | What | Size |
|---|---|---|
| Scraper refactor | Move the fetch and parse code out of `server/api/detail.get.ts` into a shared function the checker can call | S |
| Storage | One table `watches` in Supabase (Postgres): address, record, library IDs, status, token hash, created, expires, next check. Row level security on with no policies; the server uses the service-role key through `@supabase/supabase-js`. No Fly volume, no SQLite | S-M |
| Mail sender | A function that calls the provider's HTTP API; German templates for confirmation and alert; `List-Unsubscribe` header | S-M |
| Endpoints | Subscribe (validation, honeypot, rate limit per IP and per address), confirm, stop; random tokens, only hashes stored | M |
| Checker | Group watches by record, one scrape per record, sequential, skip during maintenance, reuse `utils/availability.ts` | M |
| UI | Button, sheet with picker, confirm and stop pages | M |
| Copy and docs | Privacy section, FAQ `data-storage`, events, this doc, `CLAUDE.md` | S |
| Tests | Rule evaluation, default selection, token handling, templates | M |
| Johannes | Mail provider account, DNS records, the Supabase table and key as a Fly secret, a processing agreement with Supabase, legal check | S-M |

**Storage decision (Johannes, 11.11.2026): Supabase, no Fly volume.** A free project and local `SUPABASE_URL` / `SUPABASE_KEY` already exist from the removed watchlist and login (see git history). What follows from it:

- Use `@supabase/supabase-js` directly in a server util, with the **service-role key as a Fly secret** (`fly secrets set`). Do not use the `@nuxtjs/supabase` module (it is client-side auth plumbing nobody needs here); once the util exists, drop the unused module from `package.json`. Check which key `SUPABASE_KEY` is today: an anon key must never be the one that writes addresses.
- The table holds e-mail addresses, so **row level security is on with no policies**: the public anon key can read nothing, only our server can.
- Look at the existing project first. Old tables from the watchlist and login (profiles, bookmarks) may still hold personal data: delete what is not needed, and put the watches in their own table or schema.
- Region: an EU region (Frankfurt) for GDPR and for latency to the Fly machine in Frankfurt. If the project sits elsewhere, a new one is needed (third-party sources say the free plan allows two active projects).
- **Free projects are paused after about a week of too little database activity** (Supabase's FAQ; restoring is manual in the dashboard, the data stays). With slice 1 and a handful of subscribers that can happen, and the first visitor after a pause would hit an error. Keep it awake with a daily trivial query: the Pi cron job can call a `/api/watch/health` endpoint that runs `select 1` (the same endpoint is the watchdog for the checker). A plain HTTP ping may not count as database activity; whether a `pg_cron` job inside Supabase counts was not confirmed.
- Upsides: the table survives deploys, you can see and test it in the Supabase dashboard during the manual phase, and there is nothing new to host.
- Supabase becomes a processor: a processing agreement with Supabase, and its name and region on the privacy page. Check the transfer basis (Supabase is a US company hosting in an EU region).

### Mail provider and cost (research 11.11.2026)

Our volume is tiny: one confirmation plus at most one alert per subscription, so a few dozen mails a month. Every free tier below is enough. Figures come from vendor pages and third-party comparisons, **verify before signing up**.

| Provider | Free tier | Beyond free | Notes |
|---|---|---|---|
| **Brevo** (France) | 300 emails a day (about 9,000 a month), API and SMTP, no card needed per Brevo's pages | paid plans exist (prices not checked) | Whether sending first needs an account approval, and whether free-plan mails carry a Brevo logo, was not confirmed. EU company, check the processing agreement |
| **Scaleway TEM** (France) | first 300 a month free | about €0.25 per 1,000 after that, billed per recipient, no fixed fee | Pay as you go, needs an account with a payment method; EU-hosted |
| **Resend** (US) | 3,000 a month, 100 a day, 3 domains, 30-day log retention | Pro $20 a month for 50,000 | Not confirmed whether an EU region exists |
| **Mailjet** (France) | 6,000 a month, 200 a day | from about $15 a month (15,000) | Mailjet branding in the free plan |
| **MailerSend** | 500 or 3,000 a month, sources conflict | not checked | 1 domain on free |
| **Postmark** (US) | 100 a month | not checked | Too small |
| **Amazon SES** | 3,000 a month for 12 months for new accounts (sources differ) | about $0.10 to $0.16 per 1,000 | Starts in a sandbox (verified recipients, 200 a day) until approved; US provider, weakest fit for the EU-privacy story |

**Pick for slice 1: Brevo free** (EU, no card, plenty of room). Fallback: Scaleway TEM (practically €0 at our volume).

### Domain and DNS: no mailbox hosting needed

Current state of `bibblitz.de` (checked 11.11.2026 with `dig`): nameservers at Namecheap (`dns1/dns2.registrar-servers.com`); MX points to Namecheap's forwarding servers (`eforward1-5.registrar-servers.com`); SPF is `v=spf1 include:spf.efwd.registrar-servers.com ~all`; **no DMARC record**; one Google site-verification TXT.

Sending does **not** need a mailbox. The provider sends on behalf of `alerts@bibblitz.de`; replies go to `info@bibblitz.de`, which Namecheap forwards to Gmail as today. So the setup stays free:

1. At the provider, add the sending domain `bibblitz.de`. It shows the records to publish, usually a verification TXT and DKIM records (CNAME or TXT).
2. In Namecheap "Advanced DNS", add them. Do not touch the MX records.
3. **SPF**: there may only be one SPF record. If the provider asks for one, merge it into the existing line, e.g. `v=spf1 include:spf.efwd.registrar-servers.com include:<provider> ~all` (the exact include comes from the provider; some providers need none).
4. **DMARC**: add a TXT record at `_dmarc` with a monitoring policy first, e.g. `v=DMARC1; p=none; rua=mailto:info@bibblitz.de`. Reports arrive in Gmail through the forwarding, so drop `rua` if they annoy.
5. Set `Reply-To: info@bibblitz.de` in the mails. Optional: let Gmail send as `info@bibblitz.de` through the provider's SMTP relay, so a reply does not expose the private Gmail address.

Namecheap's forwarding does not do DKIM, but that only matters for mail *you* send through it, which we do not. Sources disagree on details, so confirm with the provider's verification tool after publishing the records.

Sources: [Resend pricing](https://resend.com/pricing) · [Brevo, free email API](https://www.brevo.com/features/email-api/) · [Brevo, DKIM at Namecheap](https://www.brevo.com/blog/namecheap-dkim/) · [Scaleway TEM limits](https://scaleway.com/en/docs/transactional-email/reference-content/tem-capabilities-and-limits) · [Scaleway TEM FAQ](https://www.scaleway.com/en/docs/transactional-email/faq/) · [free SMTP comparison (SendLayer)](https://sendlayer.com/blog/best-free-smtp-servers/) · [free email tiers 2026](https://freetier.co/articles/free-email-sending-tiers-2026) · [MXToolbox, Namecheap forwarding](https://mxtoolbox.com/outboundemailsources/Namecheap-Email-Forwarding) · [Redsift, Namecheap forwarding SPF](https://knowledge.ondmarc.redsift.com/en/articles/1961970-namecheap-email-forwarding-spf-set-up)

### Legal and privacy (to confirm)

Double opt-in by link; the alert carries no advertising; one-shot with deletion after the alert or after 30 days; unsubscribe link in every mail; a data processing agreement with the mail provider and with Supabase; a new section on `app/pages/data-privacy.vue` (what is stored: address, record, libraries, created date; legal basis; mail provider and Supabase named with region; retention) and an update to the FAQ `data-storage`. Store library IDs, not the ZIP: the choice of libraries is less personal than a location.

### Risks

- A dead checker or a failed send is silent: add a heartbeat ping to the ntfy topic the Pi already uses.
- Someone enters a stranger's address: double opt-in plus rate limits; no CAPTCHA at first.
- A "free" copy may be gone before the visitor arrives, or reserved: the alert says so.
- The 256 MB machine: the checker stays sequential and small.
- A paused free Supabase project makes subscribing fail until someone restores it: the daily health query above prevents it.
- The service-role key bypasses row level security: it lives only in Fly secrets and local `.env`, never in client code or the repository.
- Brevo may review a new account before it sends; do the signup early.

### Backend (built 12.11.2026, branch `shelf-watch`)

Slice 1 of the e-mail route: the real flow, alerts sent by hand. All server code is covered by tests without Supabase, Brevo or voebb.de (`test/unit/watchService.test.ts`, `watchMail.test.ts`).

**Pieces**
- `server/utils/recordFetch.ts`: the fetch and parse of a record, moved out of `detail.get.ts`; the subscribe and the checker use the same function (so `MOCK_VOEBB` works for them in dev too).
- `server/utils/watchService.ts`: `subscribe`, `confirmWatch`, `stopWatch`, `runWatches` over injected dependencies. `watchStore.ts` (Supabase and an in-memory store), `watchMailer.ts` (Brevo API; an outbox in dev), `watchToken.ts`, `watchRateLimit.ts`, `watchRuntime.ts` (wires the config in).
- `utils/watchMail.ts`: the two mails (subject, text, HTML), shared by the server and the dev preview, so what you preview is what is sent.
- `server/api/watch/`: `POST /api/watch` (subscribe), `POST confirm`, `POST stop`, `POST run`, `GET health`, `GET dev-mail` (dev only).
- `migrations/001_bibblitz_watches.sql`: the table, with row level security and no policies. **Claude cannot run DDL** (same rule as in the fungio project): it was pasted into the SQL editor of the Supabase project by Johannes (12.11.2026).
- **The Supabase project** is `tjciulpzrgwodmhymujs`, region **eu-west-2 (London, not the EU)**, on the free plan, **shared with the lecker3000 app** (the free plan allows two active projects and fungio has the other; the table is called `bibblitz_watches` so it cannot clash). The privacy text says London and names the UK adequacy decision (renewed by the Commission until 27.12.2031). Nothing else of BibBlitz is stored there. lecker3000 only holds a publishable key in its web app (checked 12.11.: the live bundle has no service key; note its env variable is called `VITE_SUPABASE_SERVICE_ROLE_KEY` but holds a publishable key), and its GitHub workflow `keep-alive.yml` pings the project on Fridays and Sundays, which also keeps the project from pausing.
- **Rights checked 12.11.2026** with the publishable key (supabase-js and plain REST): select, insert, update and delete on `bibblitz_watches` all fail with `42501 permission denied for table`, while a table that does not exist answers `PGRST205`, so the table is there and closed to the public key. Only a secret key (server) can use it.

**How it behaves**
- Links in the mails carry `<watch id>.<signature>`, an HMAC with `NUXT_WATCH_SECRET`. Nothing token-like is stored. Confirm and stop are `POST`s made by the landing pages, so a mail scanner that only opens links does nothing; stop also answers the one-click unsubscribe POST to `/api/watch/stop?token=…` (header `List-Unsubscribe`).
- Subscribe: validates the address, the record id and the libraries (they must hold a copy of the record; the title comes from VÖBB), a hidden field (honeypot) answers bots with a fake success, rate limits (per visitor 10 and per address 3 an hour, in memory), then a pending row (24 h) and the confirmation mail. If the mail cannot be sent the row is removed again. Subscribing again for the same address and record keeps one row and the same links.
- Confirm: pending → active for 30 days. Unknown, forged or expired tokens answer `expired`.
- The checker (`POST /api/watch/run`, header `x-watch-secret`): removes expired rows, groups the active watches by record (one VÖBB request per record, 1 s apart), and mails a watch once a chosen library has a free copy, then deletes the row (one-shot). During VÖBB maintenance it stops without sending. A failed record or a failed mail keeps the watch for the next run. `?dry=1` only reports (masked addresses) what would go out.
- Fails closed: without `NUXT_PUBLIC_WATCH_ENABLED=true` every watch route is a 404 in production; enabled but not configured answers 503; without `NUXT_WATCH_RUN_SECRET` the checker does not exist (404).
- In dev with no keys: an in-memory store and a mail outbox, so the whole flow runs on `localhost`. `/watch/mail` shows the confirmation mail the server "sent" (real links) and the alert from sample data. In production `/watch/mail` and `dev-mail` are 404.

**Secrets and settings (Fly)**

| Name | What |
|---|---|
| `NUXT_WATCH_SUPABASE_URL` | `https://tjciulpzrgwodmhymujs.supabase.co` |
| `NUXT_WATCH_SUPABASE_SERVICE_KEY` | a **secret** key of that project (`sb_secret_…`, created under "API Keys"; give it its own, e.g. "bibblitz", so it can be revoked on its own), never the publishable key, never in the browser |
| `NUXT_WATCH_BREVO_API_KEY` | Brevo API key (v3, "SMTP & API" in the Brevo account) |
| `NUXT_WATCH_SECRET` | random, signs the links in the mails (`openssl rand -base64 32`). Changing it invalidates links already sent |
| `NUXT_WATCH_RUN_SECRET` | random, protects the checker |
| `NUXT_WATCH_MAIL_FROM`, `NUXT_WATCH_MAIL_FROM_NAME` | optional, default `wecker@bibblitz.de` and `BibBlitz`; the sender must be verified in Brevo |
| `NUXT_WATCH_SITE_URL` | optional, default `https://www.bibblitz.de` (used for the links in the mails) |
| `NUXT_PUBLIC_WATCH_ENABLED` | `true` switches the feature on for everyone; set it last |

**State of the setup (12.11.2026)**: the Brevo domain `bibblitz.de` is authenticated (DNS records at Namecheap: TXT `@` brevo-code, CNAME `brevo1._domainkey` and `brevo2._domainkey`, TXT `_dmarc` with `p=none`; the existing SPF of the e-mail forwarding is untouched, Brevo needs none). The Brevo API key `bibblitz-wecker` is restricted to transactional e-mails and **expires on 12.11.2027 or after 90 days without use**, so renew it by then and keep it in use (the IP restriction is deliberately off, Fly's IPs change). All five `NUXT_WATCH_*` secrets are **staged** on Fly and take effect with the next deploy; `NUXT_PUBLIC_WATCH_ENABLED` is not set yet (set it last). The checker secret is also in the local `.env` as `NUXT_WATCH_RUN_SECRET` (so the curl lines below can read it: `set -a; . ./.env; set +a`).

**Running the checker by hand** (first weeks; the timer comes when there are about 5 confirmed watches):

```bash
curl -s -X POST -H "x-watch-secret: $NUXT_WATCH_RUN_SECRET" "https://www.bibblitz.de/api/watch/run?dry=1" | jq
curl -s -X POST -H "x-watch-secret: $NUXT_WATCH_RUN_SECRET" "https://www.bibblitz.de/api/watch/run" | jq
```

**Keep Supabase awake**: lecker3000's workflow pings the project twice a week, which is probably enough. As a second line (and to be told when the store is unreachable) a daily call of `GET /api/watch/health` (it runs a real query) from the Pi, e.g. `0 8 * * * curl -fsS https://www.bibblitz.de/api/watch/health || curl -d "bibblitz watch health failed" ntfy.sh/<your topic>`.

**Not built (on purpose)**: the timer, an expiry mail, a status page, watching a whole search, a digest. Known weak spots: `List-Unsubscribe` may be refused by Brevo's API (custom headers are documented as non-standard only; the sender retries without it, the link in the mail body is always there); the Wecker looks only at "Verfügbar" copies and cannot know about Vormerkungen; alerts carry no distance (the ZIP is not stored).

### UI prototype (branch `shelf-watch`, 11.11.2026)

The interaction is built in the app with a **mock API**, to try it before any server exists. Nothing is stored or sent.

- **Where**: the Wecker button on the detail page, `app/components/WatchSheet.vue` (the picker sheet), `app/pages/watch/confirm.vue` and `stop.vue` (landing pages of the mail links, they act on open), `app/pages/watch/mail.vue` (the two mocked mails, dev only, a 404 otherwise), the logic in `utils/watch.ts` (grouping per library, default selection), the client API in `app/composables/useWatchApi.ts` (calls `server/api/watch/`), the dev switch in `app/composables/useWatchMock.ts`.
- **Flag**: always on in dev; in production only with `NUXT_PUBLIC_WATCH_ENABLED=true`. `/watch/*` is `noindex` and disallowed in `robots.txt`.
- **Try it**: set `MOCK_VOEBB=1` in `.env`, restart the dev server, open `/media/00000003` ("Die Wartenden": nothing free near Prenzlauer Berg, on loan, overdue, ordered, a lost copy, free copies far away, one library with two copies). `/media/00000004` has every copy free, so no bell. Save the ZIP 10435 on the page to see the preselection; without a saved ZIP nothing is preselected.
- **Click-through** (dev, no accounts needed): Wecker button → sheet → submit → "Fast da" with **Mail öffnen** → the real confirmation mail from the dev outbox → its button → "Wecker läuft" (the call to the API happens on open) → the dev box links to the alert mail (sample data) → **Zum Titel** lands on `/media/<id>?ref=wecker`. "Ausschalten" goes to `/watch/stop`, which switches off by itself ("Wecker aus"). States: `/watch/confirm?state=active|expired|error`, `/watch/stop?state=gone|error`. Use `http://127.0.0.1:3210` if `localhost` answers 426 (another process on the IPv6 port).
- **Decisions made while building**: one row per library, not per copy; libraries with a free copy are not listed in the sheet (decided 11.11.2026); no ZIP entry inside the sheet (decided 11.11.2026); "In meiner Nähe" hidden without a saved ZIP; with a saved ZIP and nothing free within 3 km the page shows a prompt instead of the small button; the confirm and stop pages need no extra click (changed 11.11.2026: the mail link is the confirmation), the call is made by the page script; a repeat subscription shows the same screen as a new one.
- **Since 12.11.2026**: the real API, store, mail and checker exist (section "Backend"), as do the events (`watch-open`, `watch-submit`, `watch-confirm`, `watch-stop`), the privacy section and the FAQ line. Contrast audit run on 11.11.2026 for the detail page, the sheet (default ZIP, saved ZIP, ZIP editor open, validation errors, server error, sent) and both pages: no failures.

## Fake door test (planned 10.11.2026, not built; the fallback if the e-mail route is dropped)

Goal: find out whether people want this at all, and which form, without building it and without collecting personal data.

- **Door**: a bell button "Beobachten" on **every** detail page, available or not. Showing it only when nothing is free would miss the keepers and most waiters (they wait for a *near* copy while others are free). A second door on the results ("Diese Suche beobachten", for the `/?q=` re-checkers, 41 of 94) only later: two doors halve the counts.
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

## Suggested order (before the e-mail decision of 11.11.2026; the current plan is "E-mail route" above)

1. Option 0 (fast first badges, "Stand" time); no new feature, no stored data. Can run alongside the test.
2. The fake door test above, 4 weeks.
3. Depending on its result: option 3 (local watch list, covers the keeping group and recent searches) and option 4 for list users; or option 1 if only reminders are wanted.
4. Push (option 5 or 6) only if "Sag mir, wenn es wieder verfügbar ist" wins clearly; e-mail last.
