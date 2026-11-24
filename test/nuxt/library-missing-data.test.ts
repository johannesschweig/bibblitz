// Libraries without published hours (bookmobiles etc.) must not show seven days of "Geschlossen",
// and libraries without a website must not show a dead website button.
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
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

describe('Library with closures', () => {
  const adlershof = libraries.find(l => l.id === 'stadtteilbibliothek-adlershof-stefan-heym')!

  afterEach(() => { vi.useRealTimers() })

  // Only Date is faked: faking timers would stall mountSuspended
  const at = (iso: string) => vi.useFakeTimers({ toFake: ['Date'], now: new Date(iso) })

  it('says "Vorübergehend geschlossen" during a closure, with the dates and the reason', async () => {
    at('2026-11-24T12:00:00Z') // Tuesday, inside the weekly hours but inside the move
    const wrapper = await mountLibrary(adlershof.id)

    expect(wrapper.text()).toContain('Vorübergehend geschlossen')
    expect(wrapper.text()).not.toContain('Jetzt geöffnet')
    expect(wrapper.text()).not.toMatch(/Heute\s+12:00/)
    const closures = wrapper.find('[data-testid="closures"]').text()
    expect(closures).toContain('09.11.–07.12.2026')
    expect(closures).toContain('Umzug in neue Räume')
    expect(closures).toContain('24.12.–01.01.2027')
  })

  it('is open again after the closure and shows no list when nothing is near', async () => {
    at('2026-12-08T12:00:00Z') // Tuesday after the move; the Christmas closure is 16 days away, still listed
    const wrapper = await mountLibrary(adlershof.id)
    expect(wrapper.text()).toContain('Jetzt geöffnet')
    expect(wrapper.find('[data-testid="closures"]').text()).not.toContain('09.11.')

    at('2026-06-10T12:00:00Z')
    const summer = await mountLibrary(adlershof.id)
    expect(summer.find('[data-testid="closures"]').exists()).toBe(false)
  })
})
