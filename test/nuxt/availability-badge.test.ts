// Result row badge: placeholder while loading, an explicit message with retry when the detail
// fetch fails (VÖBB timeouts under parallel scrapes), the status pill once loaded.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import AvailabilityBadge from '~/components/AvailabilityBadge.vue'
import { useItemCacheStore } from '~/stores/itemCacheStore'
import { useUserStore } from '~/stores/userStore'

let detailResponse: any
const detailHandler = vi.fn(() => detailResponse)
registerEndpoint('/api/detail', detailHandler)

const ok = {
  success: true,
  data: {
    id: '1',
    title: 'Dune',
    mediaType: 'Buch',
    availability: [{ libraryName: 'Pankow: Bibliothek Buch', status: 'Verfügbar', daysToWait: -999 }]
  }
}

let intersect: () => void

beforeEach(() => {
  detailHandler.mockClear()
  useItemCacheStore().$reset()
  useUserStore().$reset()
  // happy-dom has no IntersectionObserver; the test decides when the row "scrolls into view"
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb: (entries: any[]) => void) {
      intersect = () => cb([{ isIntersecting: true }])
    }
    observe() {}
    disconnect() {}
  })
  useItemCacheStore().setBasicData({ id: '1', title: 'Dune', mediaType: 'Buch' })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AvailabilityBadge', () => {
  it('shows a text-free placeholder before the row is visible and does not fetch', async () => {
    const wrapper = await mountSuspended(AvailabilityBadge, { props: { mediaId: '1' } })

    expect(wrapper.find('.animate-pulse').exists()).toBe(true)
    expect(wrapper.text()).toBe('')
    expect(detailHandler).not.toHaveBeenCalled()
  })

  it('shows the status pill once the details are loaded', async () => {
    detailResponse = ok
    const wrapper = await mountSuspended(AvailabilityBadge, { props: { mediaId: '1' } })

    intersect()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Verfügbar'))
    expect(wrapper.find('.animate-pulse').exists()).toBe(false)
  })

  it('says so when the fetch fails and loads the details on retry', async () => {
    detailResponse = { success: false, error: 'Timeout' }
    const wrapper = await mountSuspended(AvailabilityBadge, { props: { mediaId: '1' } })

    intersect()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Verfügbarkeit nicht abrufbar'))
    expect(detailHandler).toHaveBeenCalledTimes(1)

    detailResponse = ok
    await wrapper.find('button').trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Verfügbar'))
    expect(wrapper.text()).not.toContain('nicht abrufbar')
    expect(detailHandler).toHaveBeenCalledTimes(2)
  })

  it('does not navigate when the retry button sits inside a result link', async () => {
    detailResponse = { success: false }
    const wrapper = await mountSuspended(AvailabilityBadge, { props: { mediaId: '1' } })
    intersect()
    await vi.waitFor(() => expect(wrapper.find('button').exists()).toBe(true))

    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    wrapper.find('button').element.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })
})
