// While VÖBB is switched off for maintenance the app must say so instead of showing
// "Keine Treffer" or a retry button that cannot work.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import App from '~/app.vue'
import AvailabilityBadge from '~/components/AvailabilityBadge.vue'
import { useItemCacheStore } from '~/stores/itemCacheStore'
import { useVoebbStatusStore } from '~/stores/voebbStatusStore'

const maintenance = { success: false, maintenance: true, until: '19.10.2026, 08:00 Uhr' }

registerEndpoint('/api/status', () => ({ maintenance: false }))
registerEndpoint('/api/search', () => maintenance)
registerEndpoint('/api/detail', () => maintenance)

let intersect: () => void

beforeEach(() => {
  useItemCacheStore().$reset()
  useVoebbStatusStore().$reset()
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb: (entries: any[]) => void) {
      intersect = () => cb([{ isIntersecting: true }])
    }
    observe() {}
    disconnect() {}
  })
})

describe('VÖBB maintenance', () => {
  it('explains a failed search instead of reporting zero hits', async () => {
    const wrapper = await mountSuspended(App, { route: '/?q=Dune' })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Der VÖBB-Katalog ist gerade in Wartung'))

    expect(wrapper.text()).toContain('bis 19.10.2026, 08:00 Uhr')
    expect(wrapper.text()).toContain('Die Suche ist gerade nicht möglich')
    expect(wrapper.text()).not.toContain('Keine Treffer')
  })

  it('does not cache the maintenance page as a record and shows no retry button', async () => {
    useItemCacheStore().setBasicData({ id: '1', title: 'Dune', mediaType: 'Buch' })
    const wrapper = await mountSuspended(AvailabilityBadge, { props: { mediaId: '1' } })

    intersect()
    await vi.waitFor(() => expect(wrapper.text()).toContain('VÖBB-Wartung'))
    await flushPromises()

    expect(wrapper.find('button').exists()).toBe(false)
    expect(useItemCacheStore().items['1'].availability).toBeUndefined()
    expect(useVoebbStatusStore().maintenance).toBe(true)
  })
})
