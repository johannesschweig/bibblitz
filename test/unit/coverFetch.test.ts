// The server side of covers: fetch from VÖBB (hotlink protection wants an aDISWeb Referer) and
// sort the answer into "image", "no cover" and "failed", because only the first two may be cached.
import { describe, it, expect, vi } from 'vitest'
import { fetchCover, coverCacheHeaders } from '../../server/utils/cover'

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer

function answer(status: number, contentType: string | null, body: ArrayBuffer = new ArrayBuffer(0)) {
  const headers = new Headers()
  if (contentType) headers.set('content-type', contentType)
  return { status, headers, _data: body }
}

describe('fetchCover', () => {
  it('asks VÖBB for the cover with an aDISWeb page as Referer', async () => {
    const get = vi.fn().mockResolvedValue(answer(200, 'image/jpeg', jpeg))

    await fetchCover('9783257056082', 'm', get)

    const [url, options] = get.mock.calls[0]
    expect(url).toBe('https://www.voebb.de/vlb/cover/9783257056082/m')
    expect(options.headers.Referer).toMatch(/^https:\/\/www\.voebb\.de\/aDISWeb\//)
  })

  it('returns the image with its content type', async () => {
    const get = vi.fn().mockResolvedValue(answer(200, 'image/jpeg', jpeg))

    const result = await fetchCover('9783257056082', 's', get)

    expect(result).toEqual({ status: 'ok', contentType: 'image/jpeg', body: jpeg })
  })

  it('reports "missing" when VÖBB has no cover for the id (404)', async () => {
    const get = vi.fn().mockResolvedValue(answer(404, 'application/json'))

    expect(await fetchCover('9780000000002', 's', get)).toEqual({ status: 'missing' })
  })

  it.each([403, 500, 503])('reports an error for HTTP %i, which must not be cached as "no cover"', async (code) => {
    const get = vi.fn().mockResolvedValue(answer(code, 'text/html'))

    expect(await fetchCover('9783257056082', 's', get)).toEqual({ status: 'error' })
  })

  it('reports an error when a 200 is not an image (e.g. the maintenance page)', async () => {
    const get = vi.fn().mockResolvedValue(answer(200, 'text/html;charset=UTF-8'))

    expect(await fetchCover('9783257056082', 's', get)).toEqual({ status: 'error' })
  })

  it('reports an error when the request fails or times out', async () => {
    const get = vi.fn().mockRejectedValue(new Error('timeout'))

    expect(await fetchCover('9783257056082', 's', get)).toEqual({ status: 'error' })
  })

  it('gives up on a slow VÖBB after a few seconds', async () => {
    const get = vi.fn().mockResolvedValue(answer(200, 'image/jpeg', jpeg))

    await fetchCover('9783257056082', 's', get)

    expect(get.mock.calls[0][1].timeout).toBeLessThanOrEqual(4500)
  })

  it('does not call VÖBB for an invalid id or size', async () => {
    const get = vi.fn()

    expect(await fetchCover('../../x', 's', get)).toEqual({ status: 'invalid' })
    expect(await fetchCover('9783257056082', 'xxl', get)).toEqual({ status: 'invalid' })
    expect(get).not.toHaveBeenCalled()
  })
})

describe('coverCacheHeaders', () => {
  it('lets the CDN keep an image for a long time (VÖBB itself sends no-store)', () => {
    expect(coverCacheHeaders('ok')['Cache-Control']).toMatch(/s-maxage=\d{6,}/)
  })

  it('caches "no cover" for a shorter time, so a cover VÖBB adds later shows up', () => {
    const missing = Number(coverCacheHeaders('missing')['Cache-Control'].match(/s-maxage=(\d+)/)![1])
    const ok = Number(coverCacheHeaders('ok')['Cache-Control'].match(/s-maxage=(\d+)/)![1])

    expect(missing).toBeGreaterThan(0)
    expect(missing).toBeLessThan(ok)
  })

  it('never caches a failure', () => {
    expect(coverCacheHeaders('error')['Cache-Control']).toBe('no-store')
  })
})
