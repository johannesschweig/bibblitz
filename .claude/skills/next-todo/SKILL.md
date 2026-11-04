---
name: next-todo
description: Take the next item from the BibBlitz TODO.md priorities (lanes Trust, Friction, Bets), report why it is next, its reach, severity and cost, investigate it, propose options, let the user pick one, build it, show it on the dev server, get an OK and commit. Use when the user says "next issue", "next todo", "tackle the backlog" or names a TODO id (P3, I10, ...).
---

# Tackle the next TODO

One item per run. The user decides at three points: which option, whether it gets its own branch (only for bigger items), and whether the result is OK. Never skip one of them, and never build before the option is picked.

## 1. Pick the item

Read `TODO.md`. `# Priorities` is the queue: three lanes (Trust, Friction, Bets), each with its own legend, which is the source of truth for the wording below.

- If the user named an id, take that one.
- Otherwise follow the order of work in `# Priorities`: (1) the top row of **Trust** that is not blocked (an `unverified` row means the step is to verify or instrument, not to fix); (2) then alternate between the next step of the **active bet** and the highest-scoring **Friction** row (scores within about 30% are a tie, then the smaller build; a reach tier of 1 from "no data" means no evidence, say so). Look at the last commits and `# DONE` to see which of the two came last. Bets other than the active one are never picked unasked; skip rows marked not scored.
- Items below the table (details under "## Problems" and "# Contemplating / Ideas") hold evidence, cause, plan and open questions. Read the item's detail block and anything it links to.

## 2. Report it

Lead with the user problem and who is affected (Johannes works in B2B/UX: problem and stakeholder impact first, implementation later). Then a compact block:

- id and title, status (what is already done, what is open)
- the lane and why it is next (Trust: what is wrong or stale and since when; Friction: reach with the sample, "34 of 109 sessions", severity, build, carry, score and rank; Bet: the hypothesis and metric)
- evidence and the cause as the TODO states it, marked as **unverified** until step 3 has checked it

## 3. Investigate

Verify before you claim. The TODO's cause is a hypothesis; a diagnosis in an earlier review was wrong (P1 first read as "false empty", it was failed fetches), so reproduce or measure it.

- Read the code paths involved. Reproduce in the browser pane on the dev server (`preview_start` `dev`, port 3210) or with a script in the session scratchpad. VÖBB is flaky under parallel requests, so measure sequentially and repeat.
- For usage questions run `npm run umami` and read `data/umami/latest/digest.json`, or the raw journeys (`npm run umami -- --from <date> --out <dir outside data/umami>`).
- Correct the TODO text in your report where the investigation disagrees with it, and say so plainly.
- Stay read-only here: no edits to app code, and do not start the build.

## 4. Options and pick

Give 2-4 options, each with: what changes, build (1 / 2 / 4, see the legend) and carry, risk and downside, effect on the item's lane position (score for Friction) and on neighbouring items (e.g. I10 overlaps P3). One of them may be "measure first" (add an event). Recommend one in a sentence, with the reason. Include "do nothing / drop it" when the evidence is thin.

Then ask with `AskUserQuestion` (options as choices, recommended first). Wait for the answer. A message like "what about X?" is a new option to evaluate, not a pick.

## 5. Branch question (only for bigger items)

Ask once, with `AskUserQuestion`, if the picked option is bigger: build 4, or build 2 touching several areas (store + page + scraper), a product decision still open, or more than about half a day. Options: "Own branch" (recommended) / "Straight on main". Small items (S, one area) go straight to main without asking.

Branches are regular branches in this checkout: `git switch -c <short-name>`. Never git worktrees (no `EnterWorktree`, no `use_worktree: true`).

## 6. Build

- Keep to the picked option. Follow `CLAUDE.md`: German UI copy, English code comments and test names, WCAG AA text contrast (run `scripts/contrast-audit.js` for UI changes, see `docs/accessibility.md`), a test for the behaviour (real records go into the existing unit test files), no change to the tracking script's `data-domains`.
- A new tracking event: use `useUmami().track(...)`, add it to `FEATURES` in `scripts/umami/digest.mjs` and the feature table in `docs/analytics.md`.
- Run `npm test`; all must pass.
- Do not commit yet.

## 7. Show it

If the change is observable in a browser: `preview_start` `{name: "dev"}` (never Bash for servers), open the page that shows it with the browser pane (`navigate`). Set `resize_window` colour scheme to light (the app has no dark theme and looks grey otherwise), check the phone width (375) and desktop, check the console for errors, take a screenshot, then reset the viewport to desktop. Walk through the flow that was broken. Tell the user the URL (http://localhost:3210/...) and what to try. Say what you could not check.

## 8. Get the OK

Ask whether it is OK to commit (`wrap_up` question, or `AskUserQuestion` when there are real alternatives such as "adjust X"). Changes requested: make them, re-run tests, show again. Only a clear yes commits.

## 9. Update TODO.md, then commit

- In `TODO.md`: mark the item done in its detail block (what was done, date as dd.mm.), remove it from its lane table, add one line under `# DONE`. A Trust item is only done with a **decay check** (something that notices it rotting again); if there is none, keep the row and say what is missing. After a Bet ships, write the measurement date and baseline into its block and keep it as the active bet until the metric is read; then ask Johannes which bet is next. Re-score Friction rows whose reach or build changed because of this work. Put new findings in as new items in the right lane (same legends).
- Commit rules from `CLAUDE.md`: one short lowercase subject line, no body unless the why is not obvious (max 2-3 lines), plus any attribution line the session asks for. Commit on `main`. For an own branch: commit on the branch, then ask nothing more, switch to `main`, merge it, delete the branch.
- Never push unless asked. Report the commit hash.
- Update the memory note `umami-session-review-progress` if the item came from a review finding.

## Don'ts

- Do not do two items in one run, and do not start the next one unasked. End by naming the next item in the queue (lane, and the score for Friction).
- Do not build while options are open, and do not treat a clarifying question as a pick.
- Do not change `libraries.json`, scraping behaviour or deleted-feature decisions with fixed dates (06.11., 22.12.) outside the picked item.
