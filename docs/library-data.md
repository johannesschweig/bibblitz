# Library data (`app/assets/libraries.json`)

88 libraries with address, coordinates, contacts, `website`, `opening_hours` and `service_hours`. It is edited by hand, and the libraries change their pages and hours without telling anyone, so it goes stale (checked 02.11.2026: 3 of 10 sampled libraries had wrong hours, 8 of 85 links were dead; see TODO.md I4 and I22).

## How the hours are stored

- `opening_hours`: when the building is open, per weekday, `"HH:MM-HH:MM"` or `null` (closed). Times with restricted or no staff ("eingeschränkter Service", "servicefrei", "ohne Service") count as open: Egon-Erwin-Kisch is open Sunday 09:00-19:00 although nobody is at the desk. A missing day means closed.
- `service_hours`: when staff are there, same format, only for libraries that have service-free times, and always inside `opening_hours` (a test checks it). One range per day (`null` = no staff that day, a closed day is left out). 23 libraries have it since 23.11.2026 (I23); it is read by Gemini and checked by guards, see "Service hours" below. "Eingeschränkter Service" counts as no staff: the library pages say so themselves ("Im eingeschränkten Service ist kein Fachpersonal vor Ort", only the machines work). The library page shows "Jetzt geöffnet" from `opening_hours` and a "Servicezeiten" block from `service_hours`.
- `closures`: temporary closures (move, renovation, staff meeting, holidays), a list of `{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "note": "…" }`, dates inclusive, Berlin time, in order and without overlap (a test checks it). A single day has `to` equal to `from`; **no `to` means open-ended** (Schäfersee from 14.12.2026), so never leave it out for one day. It does not change `opening_hours` (the regular week, which the monthly check compares with the page): during a closure the library page says "Vorübergehend geschlossen" and lists the closures that run or start within 45 days under "Schließtage". Ended closures do nothing and can stay or be deleted. Filled by hand on 24.11.2026 from the district pages (a keyword scan of the cached page texts): Schäfersee, Wilhelm Liebknecht, Korczak, Kladow, Adlershof, Marzahn-Hellersdorf, Pankow (7 of 8; Kurt-Tucholsky Pankow's own page does not list the district-wide days), Treptow-Köpenick, ZLB (both sites). Not covered: districts whose pages showed no notice (Charlottenburg-Wilmersdorf, Lichtenberg, Mitte, Neukölln, Steglitz-Zehlendorf, Tempelhof-Schöneberg, Spandau except Kladow), the check does not read closures, so new ones come in by hand (idea: read them with Gemini like the service hours).
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

## Service hours: Gemini reads, guards decide (I23, 23.11.2026)

The pages word the service-free times in many ways (a sentence for all days, a bracket after each day, a second table "Servicefreie Zeiten", the list of staffed times), so no parser. `check.mjs --texts texts.json` writes the hours text of every library with a service note (and of the libraries that already have `service_hours`), `service_extract.py` has Gemini read each text **twice, on two models**, and `service.mjs` judges the answers. Gemini only reads; the code decides.

```bash
node scripts/libraries/check.mjs --texts texts.json --cache <dir>                         # texts of the 24 libraries
python3 scripts/libraries/service_extract.py texts.json extractions.json
node scripts/libraries/service.mjs --texts texts.json --extractions extractions.json         # report (add --apply to write the new ones)
```

An answer is accepted only when every guard holds (`serviceHours.mjs`, tests in `test/unit/serviceHours.test.ts`): each day with a service-free time has a quoted sentence that appears word for word in the page text (one valid quote across the two runs is enough, a model sometimes leaves one out); the opening hours the model read equal the stored `opening_hours`; service-free times lie inside the opening time; the staffed time of a day is one range or none; both runs give the same staffed times. Otherwise the library is `suspicious` with the reason, and only those need a person. Statuses: `new` (no `service_hours` yet, safe to write, `--apply` writes it), `same`, `changed` (all guards hold but differs from the stored data: a person updates it, `--apply` never overwrites), `suspicious`, `error` (a Gemini call failed, e.g. "503 high demand": the extractor retries with growing pauses and makes one more pass after 120 s; what is left is reported as "Gemini-Lauf unvollständig", not as bad data), `unchecked` (stored hours but the page text says nothing about service: the three ZLB sites keep it in a separate paragraph, and Wasserturm / Museum Pankow are checked from their "Servicezeiten" list), `none` (no service-free time).

**First fill 23.11.2026:** 24 texts, 18 libraries written (17 on the first pass, Bonhoeffer after a prompt rule about a bracket range that extends the opening time), 2 reproduced their stored data (Wasserturm, Museum Pankow), 3 unchecked (ZLB), 1 `none` (Familienbibliothek Else Ury, a Pop-Up with no service note of its own). A later run on the written data gave 20 same, 0 changed, 0 suspicious. Kisch, Saefkow, Bachmann, Böll and Schulz were compared with the page by hand.

**Key and model pool:** self-contained in `service_extract.py` (the two models are copied from fungio's `gemini_rotation.py`, with the reason in a comment). The keys are fungio's three free-tier keys, copied into `.env` as `GOOGLE_API_KEY`, `GOOGLE_API_KEY2`, `GOOGLE_API_KEY3` (locally in the repo's `.env`, on the Pi in `~/bibblitz-check/.env`, taken there from `~/fungio-data/.env`; the script also reads a `.env` next to itself). The quota is per key and model, so it is shared with fungio's daily job (500 requests a day each for the two lite models; this check needs about 48 a month). Python needs `pip install -r scripts/libraries/requirements.txt` (`google-genai`, `pydantic`); locally the system Python works.

**When Gemini is unavailable** (seen on 23.11.2026: `gemini-3.1-flash-lite` answered "503 high demand" for hours): a call is retried with growing pauses (up to about 3.5 minutes); a model that fails all retries is skipped for the rest of the run (so an outage costs minutes, not an hour); a library is read by the **first two models that answer**, with `gemini-3.6-flash` and `gemini-3.5-flash` as fallbacks (named in `FALLBACK_MODELS`, they cap at 20 requests a day per key, 8 per key and model are needed); after the first pass the failed libraries get one more pass after 120 s. The model names of each library are stored in `extractions.json`. What still fails is reported as "Gemini-Lauf unvollständig". Two different fallback models gave the same answers as the lite pair for Saefkow and Hansabibliothek.

**On the Pi (set up and dry-run 23./24.11.2026, Python 3.11.2, Node 18):** the whole job takes about 25 minutes (4 for the hours check, about 1 minute per library for Gemini). `run.sh` runs the service step after the hours check with `SERVICE_PYTHON` (default `./venv/bin/python3` in `~/bibblitz-check`); without that Python it skips the step. Setup there: `cd ~/bibblitz-check && python3 -m venv venv && venv/bin/pip install -r requirements.txt`, then add the `GOOGLE_API_KEY*` lines to `.env`. It is silent when everything is `same`, and sends an ntfy message "Bibliotheksdaten: Servicezeiten" when a library is `changed` or `suspicious`, or "Servicezeiten-Check fehlgeschlagen" when Gemini or the script itself failed. The Pi cannot update the app: a `changed` message means "read the page, update `libraries.json` here, deploy". Limits: a temporary schedule is ignored on purpose (the prompt says so); a day with two staffed ranges is refused (`suspicious`); the ZLB libraries are not compared.

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
scp scripts/libraries/check.mjs scripts/libraries/parseHours.mjs scripts/libraries/serviceHours.mjs scripts/libraries/service.mjs scripts/libraries/service_extract.py scripts/libraries/requirements.txt scripts/libraries/run.sh app/assets/libraries.json nash@raspberrypi:~/bibblitz-check/
ssh nash@raspberrypi 'cd ~/bibblitz-check && sh run.sh'      # run by hand, about 3 minutes
```

**When a message comes.** Read the page, edit `libraries.json`, run `npm run libraries:check -- --only <id>` and `npm test`, deploy `libraries.json` again. A pull request drafted by the job is a possible step later, not now: a wrong automatic edit would show wrong hours to visitors, which is the problem this solves.

**Later, if it pays off:** show "zuletzt geprüft am …" on the library page, read the closing days that the district pages list (`Schließtage`) into `closures` automatically, and a heartbeat message if no run was logged for 40 days (today a dead cron job is silent, see below).

**Known weak spot:** the job reports changes, not its own death. If the Pi is off or the cron entry is lost, nothing arrives. A look at `run.log` before campaigns catches it; a heartbeat is the fix if that is not enough.
