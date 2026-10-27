// The medium the user came for stays visible on the library page: the branch list links with
// ?media=<id>, and the library page shows title, status and shelfmark of that copy.
// The selected-copy box has a white background.
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import LibraryPage from '~/pages/library/[id].vue'
import MediaPage from '~/pages/media/[id].vue'
import libraries from '~/assets/libraries.json'
import { useItemCacheStore } from '~/stores/itemCacheStore'
import { useUserStore } from '~/stores/userStore'

const library = libraries.find(l => l.id === 'bruno-loesche-bibliothek')!
const detail = {
  id: '1',
  title: 'Dune : Der Wüstenplanet',
  author: 'Herbert, Frank',
  mediaType: 'Buch',
  availability: [
    { libraryName: 'Mitte: Bruno-Loesche-Bibliothek', libraryId: library.id, status: 'Verfügbar', shelfmark: 'SF HERB', daysToWait: -999 },
    { libraryName: 'Pankow: Anderswo', libraryId: 'anderswo', status: 'Verfügbar', shelfmark: 'XX', daysToWait: -999 }
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
  useItemCacheStore().$reset()
  useUserStore().$reset()
  vi.stubGlobal('umami', { track: vi.fn() })
})

// LibraryMap is stubbed: Leaflet initialises after the test ended and throws "Map container not found"
describe('Media page branch links', () => {
  it('carry the media id to the library page', async () => {
    const wrapper = await mountSuspended(MediaPage, { route: '/media/1' })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Bruno-Loesche-Bibliothek'))

    const hrefs = wrapper.findAll('a').map(a => a.attributes('href'))
    expect(hrefs).toContain(`/library/${library.id}?media=1`)
  })

  it('notes copies that are reading-room-only or have to be ordered, and only those', async () => {
    // Own id: useAsyncData caches the page data per key across tests
    useItemCacheStore().items['2'] = {
      ...detail,
      id: '2',
      availability: [
        { ...detail.availability[0], access: 'reading-room' },
        { ...detail.availability[1], access: 'order-only' },
        { ...detail.availability[1], libraryId: 'hansabibliothek', libraryName: 'Mitte: Hansabibliothek' }
      ]
    } as any
    const wrapper = await mountSuspended(MediaPage, { route: '/media/2' })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Bruno-Loesche-Bibliothek'))

    const notes = wrapper.findAll('[data-testid="access-note"]').map(n => n.text())
    expect(notes).toEqual(['Nur im Lesesaal einsehbar, nicht ausleihbar', 'Lagert im Magazin und muss vorab bestellt werden'])
  })
})

describe('Library page with a selected medium', () => {
  it('shows title, status and shelfmark of the copy from the cache', async () => {
    useItemCacheStore().items['1'] = detail as any
    const wrapper = await mountSuspended(LibraryPage, { route: `/library/${library.id}?media=1`, global: { stubs: { LibraryMap: true } } })

    const summary = wrapper.find('[data-testid="selected-copy"]')
    expect(summary.exists()).toBe(true)
    expect(summary.classes()).toContain('bg-white')
    expect(summary.text()).toContain('Dune')
    expect(summary.text()).toContain('Verfügbar')
    expect(summary.text()).toContain('SF HERB')
    expect(summary.text()).not.toContain('XX')
    expect(summary.find('a').attributes('href')).toBe('/media/1')
  })

  it('fetches the medium when it is not cached yet (shared link, reload)', async () => {
    const wrapper = await mountSuspended(LibraryPage, { route: `/library/${library.id}?media=1`, global: { stubs: { LibraryMap: true } } })
    await flushPromises()

    await vi.waitFor(() => expect(wrapper.find('[data-testid="selected-copy"]').text()).toContain('SF HERB'))
  })

  it('shows the access restriction of the copy', async () => {
    const restricted = { ...detail, availability: [{ ...detail.availability[0], access: 'reading-room' }] }
    useItemCacheStore().items['1'] = restricted as any
    const wrapper = await mountSuspended(LibraryPage, { route: `/library/${library.id}?media=1`, global: { stubs: { LibraryMap: true } } })

    expect(wrapper.find('[data-testid="selected-copy"] [data-testid="access-note"]').text()).toContain('Lesesaal')
  })

  it('shows nothing without ?media', async () => {
    useItemCacheStore().items['1'] = detail as any
    const wrapper = await mountSuspended(LibraryPage, { route: `/library/${library.id}`, global: { stubs: { LibraryMap: true } } })

    expect(wrapper.find('[data-testid="selected-copy"]').exists()).toBe(false)
  })

  it('shows nothing when the medium has no copy in this library', async () => {
    useItemCacheStore().items['1'] = { ...detail, availability: [detail.availability[1]] } as any
    const wrapper = await mountSuspended(LibraryPage, { route: `/library/${library.id}?media=1`, global: { stubs: { LibraryMap: true } } })

    expect(wrapper.find('[data-testid="selected-copy"]').exists()).toBe(false)
  })
})

