// The two links that leave a library page are tracked, with the library id and whether the
// visitor still uses the default ZIP.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LibraryPage from '~/pages/library/[id].vue'
import libraries from '~/assets/libraries.json'
import { useUserStore } from '~/stores/userStore'

const library = libraries[0]
const track = vi.fn()

beforeEach(() => {
  track.mockClear()
  useUserStore().$reset()
  vi.stubGlobal('umami', { track })
  // happy-dom does not navigate on link clicks, but keep the test independent of that
  vi.stubGlobal('open', vi.fn())
})

async function mountLibrary() {
  return mountSuspended(LibraryPage, { route: `/library/${library.id}`, global: { stubs: { LibraryMap: true } } })
}

describe('Library page outbound links', () => {
  it('tracks the Google Maps link', async () => {
    const wrapper = await mountLibrary()
    await wrapper.find('a[href*="maps.google.com"]').trigger('click')

    expect(track).toHaveBeenCalledWith('library-maps-click', { id: library.id, zip_default: 1 })
  })

  it('tracks the library website link and a saved ZIP', async () => {
    useUserStore().saveLocation('10115')
    const wrapper = await mountLibrary()
    await wrapper.find(`a[href="${library.website}"]`).trigger('click')

    expect(track).toHaveBeenCalledWith('library-website-click', { id: library.id, zip_default: 0 })
  })
})
