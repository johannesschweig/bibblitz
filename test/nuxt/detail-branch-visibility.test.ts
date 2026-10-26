// The default ZIP (10178) is not the user's location, so it must not decide which branches are
// hidden on the detail page. Far branches are only folded away once the user saved a ZIP.
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import MediaPage from '~/pages/media/[id].vue'
import { useItemCacheStore } from '~/stores/itemCacheStore'
import { useUserStore } from '~/stores/userStore'

const branch = (libraryName: string, libraryId: string) =>
  ({ libraryName, libraryId, status: 'Verfügbar', shelfmark: 'SF HERB', daysToWait: -999 })

const detail = {
  id: '1',
  title: 'Dune : Der Wüstenplanet',
  author: 'Herbert, Frank',
  mediaType: 'Buch',
  availability: [
    branch('Mitte: Hansabibliothek', 'hansabibliothek'),
    branch('ZLB: Amerika-Gedenkbibliothek (AGB)', 'amerika-gedenkbibliothek-agb'),
    branch('Pankow: Kurt-Tucholsky-Bibliothek (Pankow)', 'kurt-tucholsky-bibliothek-pankow'),
    // About 14 km from 10178
    branch('Spandau: Hauptbibliothek Spandau', 'hauptbibliothek-spandau')
  ]
}

registerEndpoint('/api/detail', () => ({ success: true, data: detail }))

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

beforeEach(() => {
  localStorage.clear()
  useItemCacheStore().$reset()
  useUserStore().$reset()
  vi.stubGlobal('umami', { track: vi.fn() })
})

describe('Detail page branch list', () => {
  it('shows every branch while the default ZIP is in use', async () => {
    const wrapper = await mountSuspended(MediaPage, { route: '/media/1' })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Hansabibliothek'))

    expect(wrapper.text()).toContain('Hauptbibliothek Spandau')
    expect(wrapper.text()).not.toContain('entferntere')
  })

  it('folds away far branches once a ZIP is saved', async () => {
    const store = useUserStore()
    expect(store.saveLocation('10178')).toBe(true)
    const wrapper = await mountSuspended(MediaPage, { route: '/media/1' })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Hansabibliothek'))

    expect(wrapper.text()).not.toContain('Hauptbibliothek Spandau')
    expect(wrapper.text()).toContain('1 entferntere Bibliothek anzeigen')
  })
})
