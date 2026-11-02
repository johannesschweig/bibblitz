# Library data (`app/assets/libraries.json`)

88 libraries with address, coordinates, contacts, `website`, `opening_hours` and `service_hours`. It is edited by hand, and the libraries change their pages and hours without telling anyone, so it goes stale (checked 02.11.2026: 3 of 10 sampled libraries had wrong hours, 8 of 85 links were dead; see TODO.md I4 and I22).

## How the hours are stored

- `opening_hours`: when the building is open, per weekday, `"HH:MM-HH:MM"` or `null` (closed). Times with restricted or no staff ("eingeschränkter Service", "servicefrei", "ohne Service") count as open: Egon-Erwin-Kisch is open Sunday 09:00-19:00 although nobody is at the desk. A missing day means closed.
- `service_hours`: when staff are there, same format, only for libraries that have service-free times, and always inside `opening_hours` (a test checks it). Only 5 libraries have it so far; 19 more pages mention service-free times (TODO.md I23). The library page shows "Jetzt geöffnet" from `opening_hours` and a "Servicezeiten" block from `service_hours`.
- Mobile libraries (Fahrbibliothek, Bücherbus, BiBoBike) have stops, not hours; their `opening_hours` is empty or all `null` and the check skips them.
- Spelling and format are enforced by `test/unit/libraries.test.ts`.

## The check: `npm run libraries:check`

`scripts/libraries/check.mjs` reads every library's `website`, finds the opening hours on the page and compares them with `libraries.json`. It only reports, it never edits the data. About 3 minutes for all libraries.

```bash
npm run libraries:check                                  # all libraries
npm run libraries:check -- --only hansabibliothek        # one or more ids, comma separated
npm run libraries:check -- --cache <dir> --json out.json # keep fetched pages / write the report
```

Per library the report shows the link (`ok`, `moved` = works only through a redirect, `dead (404)`), and the hours (`ok`, `DIFFERS` with the days, `MISSING` = page has hours but none are stored, `unreadable`, `no stored hours`). The exit code is 1 when a link is dead or hours differ or are missing, so a job can alert on it.

How it reads a page (`scripts/libraries/parseHours.mjs`, tests in `test/unit/libraryHours.test.ts` with texts copied from the real pages):
- It takes the first block after the heading "Öffnungszeiten" that has times (the menu also has that word) and parses day groups such as `Mo., Fr.:`, `Di – Fr`, `Montag und Donnerstag`, `Dienstag, Mittwoch, Freitag`, one day per line, `Sonnabend` (Pankow), `mittwochs geschlossen`, `13 bis 19 Uhr`, `13.00 – 19.00`.
- A bracketed service note that touches the range ("12 – 19 Uhr (10 – 12 Uhr eingeschränkter Service)") extends the open span, see above.
- Pages that list several libraries or load the hours with JavaScript have an entry in `SOURCES` in `check.mjs` (Friedrichshain-Kreuzberg: the district page "aktuelle Öffnungszeiten"; ZLB: `zlb.de/standorte/`; Adlershof: two blocks, merged).
- berlin.de answers a run of requests with 429, 403 or dropped connections, and answers Node's `fetch` with 403 where `curl` is served. The script therefore calls `curl`, waits 0.9 s between requests and retries after 8 s. Do not parallelise it.

Limits: a temporary schedule on the page (holidays, summer closures, "Schließzeiten") looks like a difference or is invisible; a person reads the page before editing. Nine libraries are `unreadable` (the bookmobiles, two pick-up points and Wasserturm, whose hours are a sentence; checked by hand on 02.11., they match). Ten have no stored hours and no readable page (mobile libraries, Blindenbibliothek, Hakenfelde, and Schöneberg-Nord, which has no premises at the moment).

## Keeping it up to date: the Pi job (set up 02.11.2026)

State on 02.11.2026: files copied, first run on the Pi done (3 min 8 s, same result as on the dev machine: 69 hours ok, 0 differ, 9 unreadable, 85 links ok), cron entry installed (the old crontab is saved as `~/crontab.backup-2026-11-02` on the Pi). ntfy is configured and tested end to end on the Pi (a copy with one changed hour sent a message that arrived on the phone). The first scheduled run is 01.12.2026 09:00.

Goal: nobody finds out from a visitor that a library's hours or link changed. The data stays under human control (temporary schedules, ambiguous service notes), so the job reports and a person edits.

**What runs where.** On the Raspberry Pi (host `raspberrypi`, user `nash`, over Tailscale), in `~/bibblitz-check`, separate from `~/fungio-data`: `check.mjs`, `parseHours.mjs`, `libraries.json` and `run.sh`. The Pi is the better home than a GitHub Actions runner, because berlin.de blocks parts of the traffic that does not look like a browser and a data-centre IP is more likely to be blocked than a home line. It needs only `curl` and Node 18+ (the Pi has v18.20.4; the script has no dependency because the HTML text is extracted with a few regular expressions, `cheerio` needs a newer Node) and sends about 90 requests per run. It uses none of the Gemini quota that the fungio jobs share.

**Schedule.** Cron, 1st of every month at 09:00 (the fungio photo job runs daily at 10:00). The entry uses the same PID-lockfile guard as the fungio jobs, so a slow run (about 3 minutes, longer after a 429) is never overlapped, and appends to `~/bibblitz-check/run.log`:

```
0 9 1 * * [ -f /home/nash/bibblitz-check/check.pid ] && kill -0 $(cat /home/nash/bibblitz-check/check.pid) 2>/dev/null || (nohup sh /home/nash/bibblitz-check/run.sh >> /home/nash/bibblitz-check/run.log 2>&1 < /dev/null & echo $! > /home/nash/bibblitz-check/check.pid)
```

**What you get.** `run.sh` (`scripts/libraries/run.sh`) is silent when every hours block matches and every link answers. It sends a message when
- hours differ, hours are missing or a link is dead (the message lists those libraries with the days),
- the number of `unreadable` pages changed (berlin.de changed a template and the parser needs a look; the last count is kept in `unreadable.count`),
- the check itself crashed or produced no summary.

Channel: ntfy. Write `NTFY_TOPIC=<a long random name>` into `~/bibblitz-check/.env` and subscribe to that topic in the ntfy app (iOS/Android) or at `https://ntfy.sh/<topic>`; the topic name is the only secret, anyone who knows it can read and post, and the text leaves the Pi through ntfy.sh (it contains only public library names and hours). Without a topic nothing is sent, the result is in `last-run.txt` and the line in `run.log` ("exit=… message or no message"). Every run logs one line, so `tail ~/bibblitz-check/run.log` shows that the job ran. `DRY_RUN=1 sh run.sh` prints the message instead of sending it.

**Deploy.** No git on the Pi (the fungio checkout has diverged and has no remote). Copy the files; re-copy `libraries.json` after every edit, otherwise the job compares against stale data:

```bash
scp scripts/libraries/check.mjs scripts/libraries/parseHours.mjs scripts/libraries/run.sh app/assets/libraries.json nash@raspberrypi:~/bibblitz-check/
ssh nash@raspberrypi 'cd ~/bibblitz-check && sh run.sh'      # run by hand, about 3 minutes
```

**When a message comes.** Read the page, edit `libraries.json`, run `npm run libraries:check -- --only <id>` and `npm test`, deploy `libraries.json` again. A pull request drafted by the job is a possible step later, not now: a wrong automatic edit would show wrong hours to visitors, which is the problem this solves.

**Later, if it pays off:** check `service_hours` the same way (needs the service-free parse, TODO.md I23), show "zuletzt geprüft am …" on the library page, add the closing days that the district pages list (`Schließtage`), and a heartbeat message if no run was logged for 40 days (today a dead cron job is silent, see below).

**Known weak spot:** the job reports changes, not its own death. If the Pi is off or the cron entry is lost, nothing arrives. A look at `run.log` before campaigns catches it; a heartbeat is the fix if that is not enough.
