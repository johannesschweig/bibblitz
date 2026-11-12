// The visit from an alert mail of the Wecker (link /media/<id>?ref=wecker) is a feature event, `watch-return`,
// not a campaign: see docs/analytics.md.
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import MediaPage from '~/pages/media/[id].vue'
import { useItemCacheStore } from '~/stores/itemCacheStore'

registerEndpoint('/api/detail', () => ({
  success: true,
  data: {
    id: '1',
    title: 'Dune',
    mediaType: 'Buch',
    availability: [
      { libraryName: 'Mitte: Bruno-Loesche-Bibliothek', libraryId: 'bruno-loesche-bibliothek', status: 'Verfügbar', shelfmark: 'Sf', daysToWait: -999 },
      { libraryName: 'Pankow: Bibliothek am Wasserturm', libraryId: 'bibliothek-am-wasserturm', status: 'Entliehen, Fällig am 01.12.2026', shelfmark: 'Sf', daysToWait: 18 }
    ]
  }
}))

const track = vi.fn()

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

beforeEach(() => {
  track.mockClear()
  useItemCacheStore().$reset()
  vi.stubGlobal('umami', { track })
})

// Own id per test: the page's useAsyncData key (detail-<id>) would otherwise return the first test's data
describe('Detail page opened from a Wecker alert mail', () => {
  it('logs watch-return once, with the number of free copies, next to detail-view', async () => {
    await mountSuspended(MediaPage, { route: '/media/21?ref=wecker' })
    await vi.waitFor(() => expect(track).toHaveBeenCalledWith('watch-return', { status: 'ok', available_now: 1 }))

    expect(track.mock.calls.filter(([event]) => event === 'watch-return')).toHaveLength(1)
    expect(track).toHaveBeenCalledWith('detail-view', expect.objectContaining({ status: 'ok' }))
  })

  it('logs no watch-return for an ordinary visit or another ref', async () => {
    await mountSuspended(MediaPage, { route: '/media/22' })
    await vi.waitFor(() => expect(track).toHaveBeenCalledWith('detail-view', expect.objectContaining({ status: 'ok' })))

    track.mockClear()
    await mountSuspended(MediaPage, { route: '/media/23?ref=reddit' })
    await vi.waitFor(() => expect(track).toHaveBeenCalledWith('detail-view', expect.objectContaining({ status: 'ok' })))

    expect(track.mock.calls.map(([event]) => event)).not.toContain('watch-return')
  })
})
