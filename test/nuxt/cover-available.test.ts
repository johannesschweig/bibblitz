// coverAvailable decides before the detail header renders whether a cover exists. Browsers load images
// asynchronously, so the check preloads the image and reports load / error (or gives up after a timeout).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { coverAvailable } from '~/composables/coverAvailable'

const loaded: string[] = []

beforeEach(() => {
  loaded.length = 0
  // Answers by id: ...0002 has no image, ...9999 never answers, everything else loads
  vi.stubGlobal('Image', class {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(url: string) {
      loaded.push(url)
      if (url.includes('9780000000002')) setTimeout(() => this.onerror?.(), 0)
      else if (!url.includes('9999999999999')) setTimeout(() => this.onload?.(), 0)
    }
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('coverAvailable', () => {
  it('is true when the image loads, and loads it through our own route in the requested size', async () => {
    expect(await coverAvailable('9783257056082', 'm')).toBe(true)
    expect(loaded).toEqual(['/api/cover/9783257056082?size=m'])
  })

  it('is false when the image fails (VÖBB has none)', async () => {
    expect(await coverAvailable('9780000000002', 'm')).toBe(false)
  })

  it('is true when VÖBB is too slow to say, so the slot is kept and the image loads later', async () => {
    expect(await coverAvailable('9999999999999', 'm', 20)).toBe(true)
  })

  it('is false without an id, without loading anything', async () => {
    expect(await coverAvailable(undefined, 'm')).toBe(false)
    expect(loaded).toEqual([])
  })
})
