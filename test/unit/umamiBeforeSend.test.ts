import { describe, it, expect } from 'vitest'
// @ts-expect-error plain .mjs without types
import { umamiBeforeSend } from '../../utils/umamiBeforeSend.mjs'
// @ts-expect-error plain .mjs script without types
import { hasTokenInUrl } from '../../scripts/umami/tokenLeak.mjs'

const TOKEN = 'a1b2c3d4-0000-4000-8000-000000000000.abcDEF_-123'

describe('umamiBeforeSend', () => {
  it('removes the token from the page URL and keeps the other parameters', () => {
    const out = umamiBeforeSend('event', { url: `https://www.bibblitz.de/watch/confirm?token=${TOKEN}&id=34752608&n=2`, referrer: '' })
    expect(out.url).toBe('https://www.bibblitz.de/watch/confirm?id=34752608&n=2')
    expect(JSON.stringify(out)).not.toContain(TOKEN)
  })

  it('removes the token from a relative referrer (the stop page after the confirm page)', () => {
    const out = umamiBeforeSend('event', { url: 'https://www.bibblitz.de/media/34752608', referrer: `/watch/stop?token=${TOKEN}&id=34752608` })
    expect(out.referrer).toBe('/watch/stop?id=34752608')
  })

  it('leaves a token-free payload untouched, ?ref= and ?q= included', () => {
    const payload = { url: 'https://www.bibblitz.de/?q=harry%20potter&ref=loky', referrer: 'https://www.google.com/', title: 'BibBlitz' }
    expect(umamiBeforeSend('event', { ...payload })).toEqual(payload)
  })

  it('removes a token that is the only parameter without leaving a "?"', () => {
    const out = umamiBeforeSend('event', { url: `https://www.bibblitz.de/watch/stop?token=${TOKEN}` })
    expect(out.url).toBe('https://www.bibblitz.de/watch/stop')
  })

  it('still returns the payload when url and referrer are missing', () => {
    expect(umamiBeforeSend('event', { name: 'x' })).toEqual({ name: 'x', url: undefined, referrer: undefined })
  })

  it('works when serialised into an inline script, as nuxt.config does', () => {
    const fn = new Function(`return ${umamiBeforeSend.toString()}`)()
    const out = fn('event', { url: `https://www.bibblitz.de/watch/stop?token=${TOKEN}&id=1`, referrer: '' })
    expect(out.url).toBe('https://www.bibblitz.de/watch/stop?id=1')
  })
})

describe('hasTokenInUrl (decay check for the Umami export)', () => {
  it('flags a token in the page query or in the referrer', () => {
    expect(hasTokenInUrl({ urlQuery: `token=${TOKEN}&id=1` })).toBe(true)
    expect(hasTokenInUrl({ urlQuery: `id=1&token=${TOKEN}` })).toBe(true)
    expect(hasTokenInUrl({ urlQuery: '', referrerPath: `/watch/stop?token=${TOKEN}` })).toBe(true)
    expect(hasTokenInUrl({ urlQuery: '', referrerQuery: `token=${TOKEN}` })).toBe(true)
  })

  it('ignores normal visits and parameters that merely end in "token"', () => {
    expect(hasTokenInUrl({ urlQuery: 'q=harry&ref=loky' })).toBe(false)
    expect(hasTokenInUrl({ urlQuery: 'csrftoken=1' })).toBe(false)
    expect(hasTokenInUrl({})).toBe(false)
  })
})
