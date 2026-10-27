// Language and media type are filters of the VÖBB search: choosing one is a new search with ?lang= / ?type=,
// applied by VÖBB, never a filter over the loaded rows.
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { getQuery, createError } from 'h3'
import IndexPage from '~/pages/index.vue'
import { useMediaStore } from '~/stores/mediaStore'
import { useItemCacheStore } from '~/stores/itemCacheStore'
import { LANGUAGE_OPTIONS, MEDIA_TYPE_OPTIONS } from '../../utils/filterOptions'

const row = (id: string, title: string, mediaType: string) => ({ id, title, mediaType })
const dune = row('1', 'Dune', 'Buch')
const messiah = row('2', 'Dune Messiah (English)', 'Buch')
const imperium = row('3', 'Dune Imperium', 'Spiel')

const response = (results: unknown[], appliedLanguages: string[] = [], appliedMediaTypes: string[] = []) => ({
  success: true, results, hasMore: false, token: null, appliedLanguages, appliedMediaTypes
})

// Which results a filter combination returns, like VÖBB would
function answer(lang?: unknown, type?: unknown) {
  if (lang === 'Französisch') return response([], ['Französisch'])
  if (lang === 'Englisch' && type === 'Buch') return response([messiah], ['Englisch'], ['Buch'])
  if (lang === 'Englisch') return response([messiah, imperium], ['Englisch'])
  if (type === 'Buch') return response([dune, messiah], [], ['Buch'])
  return response([dune, messiah, imperium])
}

// $fetch retries a failed GET once, so a single failure would be hidden: keep failing until switched off
let failing = false
const searchHandler = vi.fn((event: any) => {
  if (failing) throw createError({ statusCode: 500 })
  const { lang, type } = getQuery(event)
  return answer(lang, type)
})
registerEndpoint('/api/search', searchHandler)
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
  searchHandler.mockClear()
  failing = false
})

type Wrapper = Awaited<ReturnType<typeof mountResults>>

// A page that stays mounted keeps reacting to route changes and would search again in the next test
const mounted: Wrapper[] = []
afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
})

async function mountResults(route = '/?q=Dune') {
  const wrapper = await mountSuspended(IndexPage, { route })
  mounted.push(wrapper)
  await vi.waitFor(() => expect(wrapper.find('[data-testid="result-count"]').exists() || wrapper.text().includes('Keine Treffer') || wrapper.text().includes('nicht geklappt')).toBe(true))
  return wrapper
}

const button = (wrapper: Wrapper, label: string) =>
  wrapper.findAll('button').find(b => b.text().startsWith(label))!
const searches = () => searchHandler.mock.calls.map(([event]) => getQuery(event))

async function choose(wrapper: Wrapper, ...labels: string[]) {
  await button(wrapper, 'Filter').trigger('click')
  for (const label of labels) await button(wrapper, label).trigger('click')
  await button(wrapper, 'Anwenden').trigger('click')
  await flushPromises()
}

describe('Filter page', () => {
  it('shows no number on the button without an active filter', async () => {
    const wrapper = await mountResults()

    expect(button(wrapper, 'Filter').text()).toBe('Filter')
  })

  // VÖBB's counts include rows BibBlitz hides and merged types, so they never match the list
  it('offers the fixed lists without counts', async () => {
    const wrapper = await mountResults()
    await button(wrapper, 'Filter').trigger('click')

    const chips = wrapper.findAll('button[aria-pressed]').map(b => b.text())
    expect(chips).toEqual([...LANGUAGE_OPTIONS, ...MEDIA_TYPE_OPTIONS])
  })

  // Regression: the chips came from the results, so they changed with the search term and a chosen filter vanished
  it('offers the same chips after the search term changed', async () => {
    const wrapper = await mountResults()
    await choose(wrapper, 'Englisch')
    await wrapper.find('input[type="search"]').setValue('Catan')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await button(wrapper, 'Filter').trigger('click')

    expect(wrapper.findAll('button[aria-pressed]').map(b => b.text())).toEqual([...LANGUAGE_OPTIONS, ...MEDIA_TYPE_OPTIONS])
    expect(button(wrapper, 'Englisch').attributes('aria-pressed')).toBe('true')
  })
})

describe('Applying a filter', () => {
  it('searches again with ?lang and shows the number of active filters', async () => {
    const wrapper = await mountResults()
    await choose(wrapper, 'Englisch')

    expect(searches().map(q => q.lang)).toEqual([undefined, 'Englisch'])
    await vi.waitFor(() => expect(wrapper.find('[data-testid="result-count"]').text()).toBe('2 Treffer'))
    expect(button(wrapper, 'Filter').text()).toContain('1')
    await vi.waitFor(() => expect(useRouter().currentRoute.value.query).toEqual({ q: 'Dune', lang: 'Englisch' }))
  })

  it('searches again with ?type instead of filtering the loaded rows', async () => {
    const wrapper = await mountResults()
    await choose(wrapper, 'Buch')

    expect(searches().map(q => q.type)).toEqual([undefined, 'Buch'])
    expect(wrapper.text()).not.toContain('Dune Imperium')
    await vi.waitFor(() => expect(useRouter().currentRoute.value.query).toEqual({ q: 'Dune', type: 'Buch' }))
  })

  it('sends both filters in one search and counts both', async () => {
    const wrapper = await mountResults()
    await choose(wrapper, 'Englisch', 'Buch')

    expect(searches()).toHaveLength(2)
    expect(searches()[1]).toMatchObject({ q: 'Dune', lang: 'Englisch', type: 'Buch' })
    expect(button(wrapper, 'Filter').text()).toContain('2')
    expect(wrapper.text()).toContain('Dune Messiah (English)')
    expect(wrapper.text()).not.toContain('Dune Imperium')
  })

  it('does not search when nothing changed', async () => {
    const wrapper = await mountResults()
    await choose(wrapper, 'Englisch')
    searchHandler.mockClear()
    await button(wrapper, 'Filter').trigger('click')
    await button(wrapper, 'Anwenden').trigger('click')
    await flushPromises()

    expect(searchHandler).not.toHaveBeenCalled()
  })

  it('keeps the filters when the text search changes', async () => {
    const wrapper = await mountResults()
    await choose(wrapper, 'Englisch')
    await wrapper.find('input[type="search"]').setValue('Catan')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(searches().at(-1)).toMatchObject({ q: 'Catan', lang: 'Englisch' })
  })

  it('reads the filters from a shared link', async () => {
    const wrapper = await mountResults('/?q=Dune&lang=Englisch&type=Buch')

    expect(searches()).toHaveLength(1)
    expect(searches()[0]).toMatchObject({ lang: 'Englisch', type: 'Buch' })
    expect(button(wrapper, 'Filter').text()).toContain('2')
  })
})

describe('Single select', () => {
  it('lets a second chip replace the first and a second click clear it', async () => {
    const wrapper = await mountResults()
    await button(wrapper, 'Filter').trigger('click')

    await button(wrapper, 'Englisch').trigger('click')
    await button(wrapper, 'Deutsch').trigger('click')
    expect(button(wrapper, 'Englisch').attributes('aria-pressed')).toBe('false')
    expect(button(wrapper, 'Deutsch').attributes('aria-pressed')).toBe('true')

    await button(wrapper, 'Deutsch').trigger('click')
    expect(button(wrapper, 'Deutsch').attributes('aria-pressed')).toBe('false')

    await button(wrapper, 'Buch').trigger('click')
    await button(wrapper, 'Spiel').trigger('click')
    expect(button(wrapper, 'Buch').attributes('aria-pressed')).toBe('false')
  })
})

describe('Nothing found with a filter', () => {
  it('names the filter and offers a way out', async () => {
    const wrapper = await mountResults()
    await choose(wrapper, 'Französisch')

    expect(wrapper.text()).toContain('Keine Treffer für „Dune“ mit dem Filter Französisch.')
    expect(button(wrapper, 'Filter').text()).toContain('1')

    await button(wrapper, 'Filter zurücksetzen').trigger('click')
    await flushPromises()

    expect(searches().at(-1)).toEqual({ q: 'Dune' })
    expect(wrapper.text()).toContain('Dune Messiah (English)')
    expect(button(wrapper, 'Filter').text()).toBe('Filter')
  })

  it('opens the filter page again with "Filter ändern"', async () => {
    const wrapper = await mountResults()
    await choose(wrapper, 'Französisch')
    await button(wrapper, 'Filter ändern').trigger('click')

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(button(wrapper, 'Französisch').attributes('aria-pressed')).toBe('true')
  })
})

describe('A failed search', () => {
  it('keeps the filter and searches with it again on "Erneut versuchen"', async () => {
    const wrapper = await mountResults()
    failing = true
    await choose(wrapper, 'Englisch')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Die Suche hat nicht geklappt'), { timeout: 3000 })
    expect(button(wrapper, 'Filter').text()).toContain('1')

    failing = false
    await button(wrapper, 'Erneut versuchen').trigger('click')
    await flushPromises()

    expect(searches().at(-1)).toMatchObject({ q: 'Dune', lang: 'Englisch' })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Dune Messiah (English)'))
  })
})

describe('Closing the filter page', () => {
  it('drops the draft without searching', async () => {
    const wrapper = await mountResults()
    await button(wrapper, 'Filter').trigger('click')
    await button(wrapper, 'Englisch').trigger('click')
    await button(wrapper, 'Schließen').trigger('click')
    await flushPromises()

    expect(searches()).toHaveLength(1)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await button(wrapper, 'Filter').trigger('click')
    expect(button(wrapper, 'Englisch').attributes('aria-pressed')).toBe('false')
  })

  it('disables "Zurücksetzen" while nothing is selected', async () => {
    const wrapper = await mountResults()
    await button(wrapper, 'Filter').trigger('click')

    expect(button(wrapper, 'Zurücksetzen').attributes('disabled')).toBeDefined()
  })
})

// What the Umami digest needs: filter-language / filter-media-type are counted per session, filter-apply carries the details
describe('Tracking', () => {
  const track = vi.fn()
  beforeEach(() => {
    track.mockClear()
    vi.stubGlobal('umami', { track })
  })
  const events = () => track.mock.calls.map(([name, data]) => [name, data])

  it('tracks opening the filter page by its source', async () => {
    const wrapper = await mountResults()
    await button(wrapper, 'Filter').trigger('click')

    expect(events()).toContainEqual(['filter-open', { source: 'button' }])
  })

  it('tracks "Filter ändern" under an empty result as its own source', async () => {
    const wrapper = await mountResults()
    await choose(wrapper, 'Französisch')
    track.mockClear()
    await button(wrapper, 'Filter ändern').trigger('click')

    expect(events()).toEqual([['filter-open', { source: 'empty-state' }]])
  })

  it('tracks an applied language with its result count, and as a countable event', async () => {
    const wrapper = await mountResults()
    track.mockClear()
    await choose(wrapper, 'Englisch')

    expect(events()).toContainEqual(['filter-apply', { results: 2, language: 'Englisch' }])
    expect(events()).toContainEqual(['filter-language', { language: 'Englisch', results: 2 }])
    expect(events().map(([name]) => name)).not.toContain('filter-media-type')
  })

  it('tracks an applied media type, and both when both are chosen', async () => {
    const wrapper = await mountResults()
    track.mockClear()
    await choose(wrapper, 'Englisch', 'Buch')

    expect(events()).toContainEqual(['filter-apply', { results: 1, language: 'Englisch', media_type: 'Buch' }])
    expect(events()).toContainEqual(['filter-language', { language: 'Englisch', results: 1 }])
    expect(events()).toContainEqual(['filter-media-type', { media_type: 'Buch', results: 1 }])
  })

  it('tracks a filter that found nothing with results 0, so dead ends are measurable', async () => {
    const wrapper = await mountResults()
    track.mockClear()
    await choose(wrapper, 'Französisch')

    expect(events()).toContainEqual(['filter-apply', { results: 0, language: 'Französisch' }])
  })

  it('tracks clearing the filter as a reset, without counting it as a language', async () => {
    const wrapper = await mountResults()
    await choose(wrapper, 'Französisch')
    track.mockClear()
    await button(wrapper, 'Filter zurücksetzen').trigger('click')
    await flushPromises()

    expect(events()).toContainEqual(['filter-apply', { results: 3, reset: 1 }])
    expect(events().map(([name]) => name)).not.toContain('filter-language')
  })

  it('tracks "Zurücksetzen" inside the dialog', async () => {
    const wrapper = await mountResults()
    await choose(wrapper, 'Englisch')
    await button(wrapper, 'Filter').trigger('click')
    track.mockClear()
    await button(wrapper, 'Zurücksetzen').trigger('click')

    expect(events()).toEqual([['filter-reset', undefined]])
  })

  it('does not count a failed filter search as a language, but marks the error', async () => {
    const wrapper = await mountResults()
    track.mockClear()
    failing = true
    await choose(wrapper, 'Englisch')
    await vi.waitFor(() => expect(events().map(([name]) => name)).toContain('filter-apply'), { timeout: 3000 })

    expect(events()).toContainEqual(['filter-apply', { results: 0, language: 'Englisch', error: 1 }])
    expect(events().map(([name]) => name)).not.toContain('filter-language')
  })

  it('sends the active filter along with a text search', async () => {
    const wrapper = await mountResults()
    await choose(wrapper, 'Englisch', 'Buch')
    track.mockClear()
    await wrapper.find('input[type="search"]').setValue('Catan')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(events()).toContainEqual(['search-started', expect.objectContaining({ query: 'Catan', language: 'Englisch', media_type: 'Buch' })])
  })
})
