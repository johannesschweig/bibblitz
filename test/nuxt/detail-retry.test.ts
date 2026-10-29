// VÖBB sometimes times out. The detail page must say so, offer a retry that fetches again, and log
// the visit as `failed` (not `empty`, which means VÖBB answered with no copies).
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import MediaPage from '~/pages/media/[id].vue'
import { useItemCacheStore } from '~/stores/itemCacheStore'

let failures: number
let calls: number
registerEndpoint('/api/detail', () => {
  calls++
  if (failures-- > 0) return { success: false, error: 'VÖBB Fetch Failed: timeout', statusCode: 500 }
  return { success: true, data: { id: '1', title: 'Dune', mediaType: 'Buch', availability: [] } }
})

const track = vi.fn()

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

beforeEach(() => {
  failures = 1
  calls = 0
  track.mockClear()
  useItemCacheStore().$reset()
  vi.stubGlobal('umami', { track })
})

// Own id per test: the page's useAsyncData key (detail-<id>) would otherwise return the first test's data
describe('Detail page after a failed fetch', () => {
  it('offers a retry when the record came from a search row and only its copies are missing', async () => {
    useItemCacheStore().setBasicData({ id: '11', title: 'Dune', mediaType: 'Buch' })
    const wrapper = await mountSuspended(MediaPage, { route: '/media/11' })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Standorte konnten nicht geladen werden.'))

    await wrapper.find('button.btn-secondary').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Keine Exemplare gefunden.'))

    expect(calls).toBe(2)
  })

  it('offers a retry on a direct visit where nothing is known yet', async () => {
    const wrapper = await mountSuspended(MediaPage, { route: '/media/12' })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Fehler beim Laden der Daten'))

    await wrapper.find('button.btn-secondary').trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Keine Exemplare gefunden.'))

    expect(calls).toBe(2)
  })

  it('logs the visit as failed, and as empty only when VÖBB reports no copies', async () => {
    useItemCacheStore().setBasicData({ id: '13', title: 'Dune', mediaType: 'Buch' })
    await mountSuspended(MediaPage, { route: '/media/13' })
    await vi.waitFor(() => expect(track).toHaveBeenCalledWith('detail-view', expect.objectContaining({ status: 'failed', branches: 0 })))

    failures = 0
    track.mockClear()
    await mountSuspended(MediaPage, { route: '/media/14' })
    await vi.waitFor(() => expect(track).toHaveBeenCalledWith('detail-view', expect.objectContaining({ status: 'empty' })))
  })
})
