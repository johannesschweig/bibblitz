// A record whose only copies are in school libraries (not in libraries.json) must not say
// "Keine Exemplare gefunden." (SAK35297029 and SAK00100325, VÖBB rows read on 23.11.2026)
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import MediaPage from '~/pages/media/[id].vue'
import { useItemCacheStore } from '~/stores/itemCacheStore'

registerEndpoint('/api/detail', (event) => {
  const id = new URL(event.path, 'http://localhost').searchParams.get('id')
  const nonPublicCopies = id === '35297029' ? { count: 1, orderable: 1 } : id === '00100325' ? { count: 1, orderable: 0 } : undefined
  return { success: true, data: { id, title: 'Deadpool', mediaType: 'DVD', availability: [], ...(nonPublicCopies && { nonPublicCopies }) } }
})

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

beforeEach(() => {
  useItemCacheStore().$reset()
  vi.stubGlobal('umami', { track: vi.fn() })
})

describe('Detail page with copies only in non-public libraries', () => {
  it('says a copy exists and that VÖBB offers an order', async () => {
    const wrapper = await mountSuspended(MediaPage, { route: '/media/35297029' })
    await vi.waitFor(() => expect(wrapper.find('[data-testid="no-copies"]').exists()).toBe(true))
    expect(wrapper.find('[data-testid="no-copies"]').text()).toBe('Nur in einer Schulbibliothek ohne öffentlichen Zugang. Laut VÖBB bestellbar, bitte im VÖBB-Katalog prüfen.')
  })

  it('says the copy cannot be ordered when VÖBB does not offer it', async () => {
    const wrapper = await mountSuspended(MediaPage, { route: '/media/00100325' })
    await vi.waitFor(() => expect(wrapper.find('[data-testid="no-copies"]').exists()).toBe(true))
    expect(wrapper.find('[data-testid="no-copies"]').text()).toBe('Nur in einer Schulbibliothek ohne öffentlichen Zugang. Nicht bestellbar.')
  })

  it('keeps "Keine Exemplare gefunden." for a record without any copy', async () => {
    const wrapper = await mountSuspended(MediaPage, { route: '/media/00000001' })
    await vi.waitFor(() => expect(wrapper.find('[data-testid="no-copies"]').exists()).toBe(true))
    expect(wrapper.find('[data-testid="no-copies"]').text()).toBe('Keine Exemplare gefunden.')
  })
})
