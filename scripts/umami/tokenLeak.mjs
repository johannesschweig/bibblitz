// Decay check for I33: true when an exported Umami event carries the secret Wecker `token` in its page URL or
// referrer. The browser strips it before sending (utils/umamiBeforeSend.mjs); this notices if that stops working.
const hasToken = (s) => typeof s === 'string' && /(^|[?&])token=/.test(s)

export function hasTokenInUrl(e) {
  return hasToken(e.urlQuery) || hasToken(e.referrerQuery) || hasToken(e.referrerPath)
}
