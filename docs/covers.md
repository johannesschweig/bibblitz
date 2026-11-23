# Covers (I2, live since 04.11.2026)

Book covers in the result rows, on the detail page and in the showcase on the home page. Built 04.11.2026 (commits `b6726c9`, `dfab457`, `9834de7`; release 13:45Z), checked against the code and production on 16.11.2026. The spike (sources, hit rates, the Referer finding) and the bet's read-outs per review are in `TODO.md` under I2.

## How it works

**1. Where the cover id comes from.** VÖBB has no cover API for us, but every result row already carries the URL: a sibling `.rList_cover` holds `<img data-src="https://www.voebb.de/vlb/cover/<id>/s">` (VÖBB lazy-loads it with its own script; rows without a cover point at a local `cover-bg.svg`). `server/api/search.get.ts` reads it with `coverIdOfRow` (`server/utils/cover.ts`, which looks at the sibling *before* the row container) and `parseCoverId` (`utils/cover.ts`) and sends it as `coverId` with every result. The id is an ISBN-13 for books and an EAN for some DVDs, CDs, games and Tonies. It says "VÖBB names an id", not "the image exists" (see the hit rates below). The record's `coverId` travels through `mediaStore` into `itemCacheStore` like the other row fields.

**2. The detail page and the showcase have no result row**, so they use the ISBN of the record: `coverIdFor(item)` returns the row's `coverId` or else the ISBN normalised to ISBN-13 (`utils/isbn.ts`). A direct visit only learns the ISBN from the detail scrape.

**3. The browser never talks to voebb.de.** `coverSrc(id, size)` always points at our own route `GET /api/cover/<id>?size=s|m` (`server/api/cover/[id].get.ts`). Two reasons: VÖBB's image service answers 403 unless the request has an aDISWeb page as `Referer` (hotlink protection; a browser cannot send that from bibblitz.de), and the visitor's IP must not reach voebb.de (GDPR, so no IP transfer to a second party and nothing to add to the privacy text).

**4. The proxy (`fetchCover` in `server/utils/cover.ts`).** Fetches `https://www.voebb.de/vlb/cover/<id>/<size>` with `Referer: https://www.voebb.de/aDISWeb/app/prod00` and a 4 s timeout (VÖBB answers in about 0.2 s). No cookies, no special User-Agent. Validation first: the id must be 13 digits or 9 digits plus a digit or `X`, the size `s` (about 5 kB, result rows) or `m` (about 18 kB, detail page), otherwise 400 and VÖBB is not called, so nothing else can end up in the URL. Outcomes:

| Result | Meaning | Answer | `Cache-Control` |
|---|---|---|---|
| `ok` | VÖBB sent an image | 200 with the image | `public, max-age=7d, s-maxage=30d, stale-while-revalidate=30d` |
| `missing` | VÖBB answered 404 (id in the row, no image behind it) | 404 | `public, max-age=1d, s-maxage=1d` (shorter, so a cover VÖBB adds later shows up) |
| `error` | timeout, refusal, a 200 that is not an image (the maintenance page) | 502 | `no-store` (a failure says nothing about the cover) |
| `invalid` | bad id or size | 400 | none |

VÖBB itself sends `no-store`, so the caching is ours. On Vercel the `s-maxage` let the CDN answer repeats; **on Fly there is no CDN**, so only the browser's `max-age` of 7 days helps and every other first request goes to VÖBB (TODO I31). Verified 16.11.2026 on production: the first `ok` headers above, a 404 for an id VÖBB does not hold.

**5. The UI.**
- `app/components/CoverImage.vue`: an `<img>` with empty `alt` (decorative), `loading="lazy"` (only visible rows request their cover), `bg-gray-100` while it loads. If the image fails it switches to a tile with the media-type icon. `fallback=false` renders nothing instead (detail page). The parent sets width and height (about 2:3) so a row keeps its size either way. A server-rendered page can have failed the image before Vue listened, so it checks `complete` / `naturalWidth` once on mount.
- Result rows (`MediaItem.vue`, also the showcase): size `s`, 56x80 px (`w-14 h-20`), 64x96 px from `md`. Rows without a cover id show the tile.
- Detail page (`app/pages/media/[id].vue`): size `m`, beside the title, and **no tile and no empty slot** when there is none. `coverAvailable(id, 'm')` (`app/composables/coverAvailable.ts`) asks whether the image exists *before* the header renders, with a 1.5 s limit, so the text never jumps left after a failed image (on the server through our own route in-process, in the browser through a preloading `Image`; on timeout the slot stays and the image arrives later). For a record that came from a search the check starts at once, in parallel with the slow detail scrape; a direct visit has to wait for the ISBN. The skeletons (`ResultSkeleton`, `DetailSkeleton`) reserve the slot, except when the cached record already shows there is nothing to look up.
- The cover on the detail page is not clickable, but looks it: the event `cover-click` measures how many try (P15, `docs/analytics.md`).

**6. Tests.** `test/unit/cover.test.ts` (id parsing, validation, `coverIdFor`, `coverSrc`, `coverIdOfRow`), `test/unit/coverFetch.test.ts` (Referer, content type, 404, non-image 200, timeout, invalid input, cache headers), `test/nuxt/cover.test.ts` (component, row, store, detail page, skeletons), `test/nuxt/cover-available.test.ts`. They fake VÖBB; nothing hits the network.

## What exists, what does not (spike 04.11.2026, 120 unique ids)

- Rows with a cover id: 64% of 242 rows. Real images behind them: 45% of rows, almost only books. By media type: Buch 50 of 83, Band 36 of 43, E-Book 12 of 16, CD 4 of 13, **DVD 0 of 15, Tonies 0 of 23, Konsolenspiel 0 of 7** (ids exist, images do not), so those rows show the media-type tile.
- **There is no fallback source (dropped 23.11.2026, stays that way).** The chain from the spike (VÖBB, then Google Books, then Open Library, 88% of ISBNs together) was not built; only VÖBB is used. Open Library alone covers 20-27%, Google Books needs a key or answers with a grey placeholder, DNB (`portal.dnb.de/opac/mvb/cover?isbn=<isbn13>`) holds the same 73% as VÖBB and needs no Referer.

## Decided (23.11.2026, Johannes) and open

- **Legal: decided, closed.** Sending the aDISWeb Referer deliberately gets around VÖBB's hotlink protection. We will not ask VÖBB for permission; the feature stays as it is and the risk is accepted. DNB as the primary source (no Referer needed, terms never read) is not pursued. Revisit only if income (I28) is picked up, see TODO "VÖBB terms and the cover sources".
- **The bet (I2) is closed without a read-out**: people asked for covers and the list looks better, which is reason enough. The before/after numbers were confounded anyway (see the I2 block).
- **Dropped (23.11.2026, Johannes), accepted as they are:** no server-side cover cache on Fly (I31, VÖBB gets every first request), no fallback source (see above), no counter for proxy failures (a missing id is cached for one day, a failed one never; if VÖBB changes the Referer rule every cover turns into the tile at once and nothing logs it).
- **Still open:** P15, the cover looks tappable and is not.
