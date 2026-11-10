# BibBlitz

BibBlitz ([bibblitz.de](https://bibblitz.de)) is a web app for the Berlin public library network VÖBB. Find a book, DVD or game and see right away which library has it on the shelf. It searches the catalogue, shows per branch whether a copy is on the shelf or when it is due back, and sorts the branches by distance to your ZIP code. No account, no app to install, no tracking beyond privacy-friendly page statistics.

This is an independent project. It is not affiliated with the VÖBB, the ZLB or any library. All catalogue data belongs to the VÖBB.

## What it does

- Search the VÖBB catalogue, filter by language and media type.
- Availability per branch with distance to your ZIP (stored only in your browser).
- Cleaned titles, authors and media types, book covers where available.
- Library pages with address, opening hours and map.
- A notice when the VÖBB is in maintenance.

It does not log in to the VÖBB, so it cannot reserve, renew or show your loans.

## How it works

The VÖBB has no public API. The server routes in `server/api/` read the HTML of `voebb.de` (aDISWeb) with [cheerio](https://cheerio.js.org/): the search emulates a browser session, the detail route reads one record and its copies. The front end is Nuxt 4 / Vue 3 with Tailwind 4 and Pinia. Library data (addresses, hours) is a static file, `app/assets/libraries.json`, checked against the library websites with `npm run libraries:check`.

Because the scraping depends on the VÖBB's markup, it can break when they change their pages. The tests fake the API responses and never call voebb.de.

## Run it locally

You need a current Node.js LTS and npm.

```bash
npm install
npm run dev
```

Optional settings go into a `.env` file (gitignored):

| Variable | Purpose |
|---|---|
| `CARTO_API_KEY` | key for the CARTO map tiles on library pages |
| `MOCK_VOEBB=1` | dev only: `/api/detail` returns fixtures, useful while the VÖBB is in maintenance |
| `UMAMI_SHARE_URL` | only for the analytics scripts under `scripts/umami/` |

```bash
npm test
```

## Project layout

- `app/`: pages, components, Pinia stores, assets
- `server/api/`, `server/utils/`: the scrapers and their helpers
- `utils/`, `types/`: shared logic used by server and client (availability, distance, catalogue text cleaning)
- `test/`: Vitest unit tests and Nuxt component/page tests
- `docs/`: notes on search and filters, accessibility, analytics and library data
- `TODO.md`: backlog and ideas

Contributors and AI coding tools should read [CLAUDE.md](CLAUDE.md) first; it describes the architecture and the conventions in more detail.

## Deployment

Runs on [Fly.io](https://fly.io) in Frankfurt as a plain Node server (`Dockerfile`, `fly.toml`): one always-on 256 MB machine. A push to `main` runs the tests and deploys through GitHub Actions (`.github/workflows/deploy.yml`); by hand: `fly deploy`.

## Feedback

Ideas, bug reports and questions are welcome: info@bibblitz.de or an issue on GitHub.
