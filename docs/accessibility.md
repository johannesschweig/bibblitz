# Accessibility: text contrast

Read it before changing text colours or UI states, and when running the contrast audit.

All text must meet **WCAG 2.2 AA**: contrast of at least **4.5:1**, or **3:1** for large text (>= 24px, or >= 18.66px and bold). This includes input placeholders, eyebrow labels and the small 10–12px text. Disabled controls are exempt. Non-text graphics (icons, borders) should reach 3:1 when they carry meaning on their own.

Rules of thumb for Tailwind 4 colours (all measured, not guessed):
- Muted text: `text-gray-500` is the lightest allowed on white and page background (about 4.8:1). On tinted backgrounds (`bg-gray-100`, `bg-*-50`) use `text-gray-600` or darker. `text-gray-400` (2.5:1) is never OK for text, placeholders included (`placeholder:text-gray-500`).
- Coloured text: use the `-700`/`-800` step (`text-blue-700`, `text-red-700`, `text-emerald-800`, `text-green-700`). `-400`/`-500` and `text-emerald-600`, `text-red-500`, `text-green-600` fail. `text-blue-600` (links, `.link`) passes on white and `slate-50`.
- No `opacity-*` on text (it lowers contrast silently), no light-grey text on translucent or gradient backgrounds without measuring.
- `StatusPill` tones pair `-800/-900` text with `-50/-100` backgrounds; keep that pairing when adding a tone.

How to check: `scripts/contrast-audit.js` defines `window.__audit(label)` for the running app. Paste it into the browser console (or the Claude browser pane's javascript tool), call `__audit('page name')` and fix everything it lists. It reads the computed colours (oklch, translucent backgrounds, opacity), so it is exact, unlike a visual check. Run it on every page **and** every state that shows different text: home with FAQ items opened, results (scrolled so all badges loaded), filtered results, no results, detail page with a saved ZIP and with the ZIP editor open, library pages with and without a saved ZIP (the distance block only shows with a saved ZIP), `/dev` in both states. Navigate client-side (`$router.push`) so `window.__audit` survives. After a state change wait ~300 ms, otherwise buttons mid-transition (`transition-all`) show up as false positives. Last full audit: 16.10.2026, no failures; the filter button and filter page (open, chips selected) were audited on 27.10.2026, no failures.
