// Libraries without published hours (bookmobiles etc.) must not show seven days of "Geschlossen",
// and libraries without a website must not show a dead website button.
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LibraryPage from '~/pages/library/[id].vue'
import libraries from '~/assets/libraries.json'
import { useUserStore } from '~/stores/userStore'

const noHoursWithSite = libraries.find(l => !l.opening_hours && l.website)!
const noHoursNoSite = libraries.find(l => !l.opening_hours && !l.website)!
const withHours = libraries.find(l => l.opening_hours && l.website)!

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

beforeEach(() => {
  useUserStore().$reset()
  vi.stubGlobal('umami', { track: vi.fn() })
})

// LibraryMap is stubbed: Leaflet initialises after the test ended and throws "Map container not found"
const mountLibrary = (id: string) =>
  mountSuspended(LibraryPage, { route: `/library/${id}`, global: { stubs: { LibraryMap: true } } })

describe('Library without opening hours', () => {
  it('shows a notice instead of seven days of "Geschlossen"', async () => {
    const wrapper = await mountLibrary(noHoursWithSite.id)

    expect(wrapper.text()).not.toContain('Geschlossen')
    expect(wrapper.text()).toContain('Keine Öffnungszeiten hinterlegt')
  })

  it('points to the library website when there is one', async () => {
    const wrapper = await mountLibrary(noHoursWithSite.id)

    expect(wrapper.find('[data-testid="no-hours"] a').attributes('href')).toBe(noHoursWithSite.website)
  })

  it('keeps the notice without a link when there is no website either', async () => {
    const wrapper = await mountLibrary(noHoursNoSite.id)

    expect(wrapper.text()).toContain('Keine Öffnungszeiten hinterlegt')
    expect(wrapper.find('[data-testid="no-hours"] a').exists()).toBe(false)
  })
})

describe('Library with opening hours', () => {
  it('still lists the week and no notice', async () => {
    const wrapper = await mountLibrary(withHours.id)

    expect(wrapper.text()).toContain('Montag')
    expect(wrapper.text()).not.toContain('Keine Öffnungszeiten hinterlegt')
  })
})

describe('Library website button', () => {
  it('is not rendered without a website', async () => {
    const wrapper = await mountLibrary(noHoursNoSite.id)

    expect(wrapper.text()).not.toContain('Bibliothekswebsite')
  })

  it('is rendered with a website', async () => {
    const wrapper = await mountLibrary(withHours.id)

    expect(wrapper.find(`a[href="${withHours.website}"]`).exists()).toBe(true)
  })
})
