// WCAG AA text-contrast audit for a rendered page. Run in the browser (DevTools console or the
// Claude browser pane's javascript tool), then call `window.__audit('label')`.
// It reads the real computed colours (Tailwind 4 uses oklch, translucent backgrounds and opacity),
// composites them like the browser does and returns every visible text node below 4.5:1
// (3:1 for large text: >= 24px, or >= 18.66px and bold). Input values and placeholders are included.
// Skipped: disabled controls (exempt in WCAG), sr-only text, hidden elements, non-text graphics.
// Not covered: gradients (flagged with `gradient: true`), hover/focus states, text over images/maps.
window.__audit = (label) => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1
  const cx = cv.getContext('2d', { willReadFrequently: true })
  // The canvas converts any CSS colour (oklch, color-mix, ...) to sRGB
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255] }
  const over = (fg, bg) => { const a = fg[3]; return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1] }
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
  const effBg = (el) => {
    const chain = []; let gradient = false
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e)
      if (cs.backgroundImage.includes('gradient')) gradient = true
      const c = rgba(cs.backgroundColor); if (c[3] > 0) chain.push(c)
      if (c[3] >= 1) break
    }
    let bg = [255, 255, 255, 1]
    for (let i = chain.length - 1; i >= 0; i--) bg = over(chain[i], bg)
    return { bg, gradient }
  }
  const opacityOf = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o }
  const out = new Map(); let checked = 0
  const check = (el, text, cs, color) => {
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return
    if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('.sr-only')) return
    if (el.disabled || el.closest('button:disabled,[disabled]')) return
    const { bg, gradient } = effBg(el)
    let fg = over(rgba(color), bg)
    const op = opacityOf(el); if (op < 1) fg = over([fg[0], fg[1], fg[2], op], bg)
    const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight)
    const need = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5
    const cr = ratio(fg, bg); checked++
    if (cr < need) {
      const key = text.trim().slice(0, 40) + '|' + fg.map(Math.round) + '|' + bg.map(Math.round)
      if (!out.has(key)) out.set(key, { text: text.trim().slice(0, 45), ratio: +cr.toFixed(2), need, fg: fg.slice(0, 3).map(Math.round).join(','), bg: bg.slice(0, 3).map(Math.round).join(','), px: size, weight, cls: String(el.className?.baseVal === undefined ? el.className : '').slice(0, 70), gradient })
    }
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n; (n = walker.nextNode());) {
    if (!n.nodeValue.trim()) continue
    const el = n.parentElement
    if (!el || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName) || el.closest('[id*=devtools], nuxt-devtools-frame')) continue
    const cs = getComputedStyle(el); check(el, n.nodeValue, cs, cs.color)
  }
  document.querySelectorAll('input, textarea').forEach((el) => {
    const cs = getComputedStyle(el)
    if (el.value) check(el, el.value, cs, cs.color)
    if (el.placeholder) check(el, 'placeholder: ' + el.placeholder, cs, getComputedStyle(el, '::placeholder').color)
  })
  return { label, checked, failures: [...out.values()] }
}
