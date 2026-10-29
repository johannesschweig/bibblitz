// The navbar owns "Zurück" on every page but the home page. Regression: the detail page's back link did
// nothing after a direct landing (Google, shared link), and the logo clears the results without anyone
// knowing how often it is used as "back".
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import AppNavbar from '~/components/AppNavbar.vue'
import { useMediaStore } from '~/stores/mediaStore'

const track = vi.fn()

beforeEach(() => {
  track.mockClear()
  vi.stubGlobal('umami', { track })
  window.history.replaceState(null, '')
  useMediaStore().clearSearch()
})

const backButton = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) =>
  wrapper.findAll('button').find(b => b.text().includes('Zurück'))

describe('Navbar back button', () => {
  it('is not shown on the home page', async () => {
    const wrapper = await mountSuspended(AppNavbar, { route: '/' })

    expect(backButton(wrapper)).toBeUndefined()
    expect(wrapper.text()).toContain('BibBlitz')
  })

  it('goes to the home page after a direct landing, where there is no history', async () => {
    const wrapper = await mountSuspended(AppNavbar, { route: '/media/123' })
    const router = useRouter()
    const push = vi.spyOn(router, 'push')

    await backButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/')
    expect(track).toHaveBeenCalledWith('back-click', { from: 'detail', had_history: 0 })
  })

  it('goes to the book on a shared library link that names it', async () => {
    const wrapper = await mountSuspended(AppNavbar, { route: '/library/bibliothek-buch?media=123' })
    const push = vi.spyOn(useRouter(), 'push')

    await backButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/media/123')
    expect(track).toHaveBeenCalledWith('back-click', { from: 'library', had_history: 0 })
  })

  it('goes back in the history when the previous page is ours', async () => {
    const wrapper = await mountSuspended(AppNavbar, { route: '/media/123' })
    const router = useRouter()
    const back = vi.spyOn(router, 'back').mockImplementation(() => {})
    const push = vi.spyOn(router, 'push')
    push.mockClear()
    window.history.replaceState({ back: '/?q=Dune' }, '')

    await backButton(wrapper)!.trigger('click')

    expect(back).toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(track).toHaveBeenCalledWith('back-click', { from: 'detail', had_history: 1 })
  })
})

describe('Navbar logo', () => {
  it('still clears the results and says whether there were any', async () => {
    const store = useMediaStore()
    store.searchIds = ['1', '2']
    const wrapper = await mountSuspended(AppNavbar, { route: '/media/123' })

    await wrapper.find('a').trigger('click')

    expect(store.searchIds).toEqual([])
    expect(track).toHaveBeenCalledWith('logo-click', { from: 'detail', had_results: 1 })
  })
})
