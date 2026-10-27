// The detail page names the language(s) of a record, so "Englisch" in the search filter and the record agree.
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import MediaPage from '~/pages/media/[id].vue'
import { useItemCacheStore } from '~/stores/itemCacheStore'

let detail: Record<string, unknown>
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
  vi.stubGlobal('umami', { track: vi.fn() })
})

const base = { id: '1', title: 'Dune', author: 'Herbert, Frank', mediaType: 'Buch', availability: [] }

// Own id per test: the page's useAsyncData key (detail-<id>) would otherwise return the first test's data
async function languageLine(id: string) {
  const wrapper = await mountSuspended(MediaPage, { route: `/media/${id}` })
  await vi.waitFor(() => expect(wrapper.text()).toContain('Dune'))
  return wrapper.find('[data-testid="language-line"]')
}

describe('Detail page language', () => {
  it('shows the language of a record, without the original of a translation', async () => {
    detail = { ...base, id: '1', languages: ['Deutsch'] }

    expect((await languageLine('1')).text()).toBe('Sprache Deutsch')
  })

  it('lists several languages', async () => {
    detail = { ...base, id: '2', languages: ['Deutsch', 'Englisch'] }

    expect((await languageLine('2')).text()).toBe('Sprache Deutsch · Englisch')
  })

  it('shows nothing when the record has no language', async () => {
    detail = { ...base, id: '3', languages: [] }

    expect((await languageLine('3')).exists()).toBe(false)
  })
})
