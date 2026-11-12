// Where the detail page offers the shelf watch: a button when something is on loan, a prominent prompt
// when a saved ZIP shows nothing free nearby, nothing when every copy is free or the feature is off.
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { mountSuspended, registerEndpoint, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#imports'
import MediaPage from '~/pages/media/[id].vue'
import { useItemCacheStore } from '~/stores/itemCacheStore'
import { useUserStore } from '~/stores/userStore'

const state = vi.hoisted(() => ({ enabled: true }))
mockNuxtImport('useWatchEnabled', () => () => state.enabled)

const copy = (libraryName: string, libraryId: string, free: boolean) =>
  free
    ? { libraryName, libraryId, status: 'Verfügbar', daysToWait: -999 }
    : { libraryName, libraryId, status: 'Ausgeliehen - Fällig am: 01.01.2099', daysToWait: 20 }

let availability: ReturnType<typeof copy>[] = []
registerEndpoint('/api/detail', () => ({
  success: true,
  data: { id: '1', title: 'Die Wartenden', mediaType: 'Buch', availability }
}))

// From 10178: the Berliner Stadtbibliothek is well under 3 km away, Spandau about 14 km
const near = (free: boolean) => copy('Mitte: Berliner Stadtbibliothek (BStB)', 'berliner-stadtbibliothek-bstb', free)
const far = (free: boolean) => copy('Spandau: Hauptbibliothek Spandau', 'hauptbibliothek-spandau', free)

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

beforeEach(() => {
  // useAsyncData keeps the page's data per key across tests
  clearNuxtData('detail-1')
  localStorage.clear()
  useItemCacheStore().$reset()
  useUserStore().$reset()
  vi.stubGlobal('umami', { track: vi.fn() })
  state.enabled = true
})

async function open() {
  const wrapper = await mountSuspended(MediaPage, { route: '/media/1' })
  await vi.waitFor(() => expect(wrapper.text()).toContain('Standorte'))
  return wrapper
}

const buttons = (wrapper: Awaited<ReturnType<typeof open>>) => wrapper.findAll('[data-testid="watch-open"]')

describe('Shelf watch on the detail page', () => {
  it('shows the small button while the default ZIP is in use and a copy is on loan', async () => {
    availability = [near(false), far(true)]
    const wrapper = await open()
    expect(buttons(wrapper)).toHaveLength(1)
    expect(buttons(wrapper)[0]!.text()).toBe('Wecker stellen')
    expect(wrapper.find('[data-testid="watch-prompt"]').exists()).toBe(false)
  })

  it('opens the sheet from the button', async () => {
    availability = [near(false), far(true)]
    const wrapper = await open()
    await buttons(wrapper)[0]!.trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.find('#watch-title').text()).toBe('Wecker stellen')
  })

  it('offers only the libraries without a free copy in the sheet', async () => {
    availability = [near(false), far(true)]
    const wrapper = await open()
    await buttons(wrapper)[0]!.trigger('click')
    const values = wrapper.findAll<HTMLInputElement>('[role="dialog"] fieldset input[type="checkbox"]').map(i => i.element.value)
    expect(values).toEqual(['berliner-stadtbibliothek-bstb'])
  })

  it('shows the prompt instead of the button when a saved ZIP has nothing free nearby', async () => {
    useUserStore().saveLocation('10178')
    availability = [near(false), far(true)]
    const wrapper = await open()
    expect(wrapper.find('[data-testid="watch-prompt"]').text()).toContain('Nichts frei in deiner Nähe.')
    // One control only: the prompt's button replaces the small one
    expect(buttons(wrapper)).toHaveLength(1)
    expect(buttons(wrapper)[0]!.classes()).toContain('btn-accent')
  })

  it('shows the small button when a saved ZIP has a free copy nearby', async () => {
    useUserStore().saveLocation('10178')
    availability = [near(true), far(false)]
    const wrapper = await open()
    expect(wrapper.find('[data-testid="watch-prompt"]').exists()).toBe(false)
    expect(buttons(wrapper)).toHaveLength(1)
    expect(buttons(wrapper)[0]!.classes()).toContain('btn-secondary')
  })

  it('offers nothing when every copy is free', async () => {
    availability = [near(true), far(true)]
    const wrapper = await open()
    expect(buttons(wrapper)).toHaveLength(0)
  })

  it('offers nothing when the feature is off', async () => {
    state.enabled = false
    useUserStore().saveLocation('10178')
    availability = [near(false), far(false)]
    const wrapper = await open()
    expect(buttons(wrapper)).toHaveLength(0)
    expect(wrapper.find('[data-testid="watch-prompt"]').exists()).toBe(false)
  })
})
