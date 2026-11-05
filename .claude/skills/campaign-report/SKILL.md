---
name: campaign-report
description: Refresh the BibBlitz marketing campaign report (docs/campaigns.md) from Umami, compare the `?ref=` campaigns with each other and with untagged traffic, and rewrite the findings. Use when the user asks for the campaign report, "how did the campaigns do", "update the marketing report" or has started a new campaign. Not for UX problems in visits (use umami-session-review).
---

# Campaign report: `?ref=` tags -> which marketing worked

Johannes is a UX/UI designer moving into product: lead with the answer (which campaign is worth repeating and why), then the numbers. Plain, short prose.

## 1. Refresh

```bash
npm run umami:campaigns
```

It fetches the events since 15.06. from Umami (share link in `.env`, ~1 min), attributes each visit to the `ref` on its entry page and rewrites the generated block of `docs/campaigns.md` (between the `campaigns:` markers). Never edit that block by hand.

Read the "Data notes" at the end of the block:
- **unregistered ref**: a new campaign. Ask Johannes what it is (channel, start date, cost) and add it to `scripts/umami/campaigns.json` (`label`, `channel`, optional `since`, `cost`, `note`), then run the script again. Test links and dropped campaigns go into `ignore`.
- **merged spellings**: a typo in a link. Report it; add a permanent fix to `aliases` only if it is not handled by the lowercase / trailing-punctuation normalisation.

## 2. Read it

- Compare campaigns on the **Searched** rate (visits with at least one search, tracked since 03.07.) and on volume (Visits, Peak day). A rate marked † has under 20 visits: say it is anecdotal, never rank on it. Differences of a few points are noise at these volumes.
- Check overlaps (Peak day, other campaigns active in the same days) before crediting a spike to one channel (26.–28.10. had three campaigns and an untagged forum at once). Use Umami directly for finer questions; the report deliberately has no referrer or per-week tables.
- Do not invent facts about what a campaign was (post, date, audience); take them from `campaigns.json` or ask.

## 3. Write the findings

Replace the `## Findings` section of `docs/campaigns.md` (below the generated block) with the current state: dated, a one-line answer, the per-campaign verdict table and the limits of the data. No recommendations section. Keep what is still true from the last version, change what the new numbers contradict, and say what changed since the last run.

## 4. Finish

Show the user the answer and the recommendations in the reply (not the whole file). Commit only if asked (one short lowercase subject line, see CLAUDE.md); `data/umami/` is gitignored, `docs/campaigns.md` and `scripts/umami/campaigns.json` are tracked.
