// Umami `data-before-send` hook (I33): removes the secret `token` parameter of the Wecker links
// (/watch/confirm, /watch/stop) from the page URL and the referrer before Umami Cloud receives them.
// Plain JS on purpose: nuxt.config.ts writes this function into an inline <head> script via toString(), so it
// must not use imports or anything outside itself. Umami calls it with (type, payload) for page views and
// events; returning the payload sends it, a falsy value would cancel the send.
export function umamiBeforeSend(type, payload) {
  const strip = (value) => {
    if (typeof value !== 'string' || value.indexOf('token=') === -1) return value
    try {
      const absolute = /^[a-z][a-z0-9+.-]*:/i.test(value)
      const url = new URL(value, 'https://placeholder.invalid')
      url.searchParams.delete('token')
      return absolute ? url.toString() : url.pathname + url.search + url.hash
    } catch (e) {
      // Cannot parse: cut off the whole query rather than risk sending the token
      return value.split('?')[0]
    }
  }
  try {
    if (payload && typeof payload === 'object') {
      payload.url = strip(payload.url)
      payload.referrer = strip(payload.referrer)
    }
  } catch (e) {
    // never block tracking because of this hook
  }
  return payload
}
