// The result count must not suggest completeness: while "Weitere Treffer laden" is offered, the
// unfiltered count says "geladen". The count follows the filter and the loaded pages.
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { getQuery } from 'h3'
import IndexPage from '~/pages/index.vue'
import { useMediaStore } from '~/stores/mediaStore'
import { useItemCacheStore } from '~/stores/itemCacheStore'

const pageOne = {
  success: true,
  results: [
    { id: '1', title: 'Dune', mediaType: 'Buch' },
    { id: '2', title: 'Dune Messiah', mediaType: 'Buch' },
    { id: '3', title: 'Dune (Film)', mediaType: 'DVD' }
  ],
  hasMore: true,
  token: 'next'
}
const pageTwo = {
  success: true,
  results: [{ id: '4', title: 'Children of Dune', mediaType: 'Buch' }],
  hasMore: false,
  token: null
}

registerEndpoint('/api/search', (event) => (getQuery(event).token ? pageTwo : pageOne))
registerEndpoint('/api/detail', () => ({ success: false }))

beforeAll(() => {
  // happy-dom has no IntersectionObserver (AvailabilityBadge)
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

beforeEach(() => {
  useMediaStore().$reset()
  useItemCacheStore().$reset()
})

async function mountResults() {
  const wrapper = await mountSuspended(IndexPage, { route: '/?q=Dune' })
  await vi.waitFor(() => expect(wrapper.find('[data-testid="result-count"]').exists()).toBe(true))
  return wrapper
}

const count = (wrapper: Awaited<ReturnType<typeof mountResults>>) =>
  wrapper.find('[data-testid="result-count"]').text()

const chip = (wrapper: Awaited<ReturnType<typeof mountResults>>, label: string) =>
  wrapper.findAll('button').find(b => b.text().startsWith(label))!

describe('Result count', () => {
  it('says "geladen" while more results can be loaded', async () => {
    const wrapper = await mountResults()

    expect(count(wrapper)).toBe('3 Treffer geladen')
  })

  it('follows the media-type filter', async () => {
    const wrapper = await mountResults()

    await chip(wrapper, 'Buch').trigger('click')
    expect(count(wrapper)).toBe('2 von 3 Treffern')

    await chip(wrapper, 'DVD').trigger('click')
    expect(count(wrapper)).toBe('1 von 3 Treffern')

    await chip(wrapper, 'Alle').trigger('click')
    expect(count(wrapper)).toBe('3 Treffer geladen')
  })

  it('updates after loading more and drops "geladen" once everything is loaded', async () => {
    const wrapper = await mountResults()

    await chip(wrapper, 'Buch').trigger('click')
    await wrapper.findAll('button').find(b => b.text() === 'Weitere Treffer laden')!.trigger('click')
    await flushPromises()

    expect(count(wrapper)).toBe('3 von 4 Treffern')

    await chip(wrapper, 'Alle').trigger('click')
    expect(count(wrapper)).toBe('4 Treffer')
  })

  it('announces count changes to screen readers', async () => {
    const wrapper = await mountResults()

    expect(wrapper.find('[data-testid="result-count"]').attributes('aria-live')).toBe('polite')
  })
})
