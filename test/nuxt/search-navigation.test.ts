// Search -> detail -> library -> back must not leak the ?q= param onto /media and /library.
// Regression: the home page is kept alive (app.vue), so its route.query.q watcher kept firing
// on other pages and router.replace put the last search onto them (/media/123?q=Dune).
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import App from '~/app.vue'

const searchHandler = vi.fn(() => ({
  success: true,
  results: [{ id: '34819510', title: 'Dune / Frank Herbert', author: 'Herbert, Frank', mediaType: 'Buch' }],
  hasMore: false,
  token: null
}))

registerEndpoint('/api/search', searchHandler)
registerEndpoint('/api/detail', () => ({
  success: true,
  data: { id: '34819510', title: 'Dune / Frank Herbert', author: 'Herbert, Frank', mediaType: 'Buch', availability: [] }
}))

beforeAll(() => {
  // happy-dom has no IntersectionObserver (AvailabilityBadge)
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
  })
})

// The leaked router.replace lands a few ticks after the navigation, flushPromises alone is too early
const settle = async () => {
  await flushPromises()
  await new Promise(resolve => setTimeout(resolve, 100))
}

describe('Navigating away from the search results', () => {
  it('keeps ?q= off /media and /library and restores the results on the way back', async () => {
    const router = useRouter()
    const wrapper = await mountSuspended(App, { route: '/?q=Dune' })
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Dune / Frank Herbert'))

    await router.push('/media/34819510')
    await settle()
    expect(router.currentRoute.value.fullPath).toBe('/media/34819510')

    await router.push('/library/bibliothek-buch')
    await settle()
    expect(router.currentRoute.value.fullPath).toBe('/library/bibliothek-buch')

    // Back to the results the way the navbar's "Suche" link does: the search is restored
    // from the store without a second scrape.
    await router.push('/?q=Dune')
    await settle()
    expect(router.currentRoute.value.fullPath).toBe('/?q=Dune')
    expect(wrapper.text()).toContain('Dune / Frank Herbert')
    expect(searchHandler).toHaveBeenCalledTimes(1)
  })
})
