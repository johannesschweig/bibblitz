// Ein geteilter Link wie /?q=Dune muss beim Öffnen sofort suchen.
// Regression: 61a4426 hat `inFlightQuery` unter dem `immediate`-Watcher deklariert,
// der Watcher lief beim Mounten in die TDZ und die Suche startete nie.
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import IndexPage from '~/pages/index.vue'

const searchHandler = vi.fn(() => ({
  success: true,
  results: [{ id: '34819510', title: 'Dune / Frank Herbert', author: 'Herbert, Frank', mediaType: 'Buch' }],
  hasMore: false,
  token: null
}))

registerEndpoint('/api/search', searchHandler)
registerEndpoint('/api/detail', () => ({}))

beforeAll(() => {
  // happy-dom kennt keinen IntersectionObserver (AvailabilityBadge)
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
  })
})

describe('Suche per Deep-Link', () => {
  it('startet die Suche aus ?q= und zeigt die Treffer', async () => {
    const wrapper = await mountSuspended(IndexPage, { route: '/?q=Dune' })
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Dune / Frank Herbert'))

    expect(searchHandler).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).not.toContain('Keine Treffer')
  })
})
