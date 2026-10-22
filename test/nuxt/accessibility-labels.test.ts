// Core controls need an accessible name and, where they toggle, a state a screen reader can announce.
// Regression: search field, ZIP field and the ZIP toggle were unnamed, filter chips had no pressed
// state, FAQ buttons no expanded state and no visible focus.
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import IndexPage from '~/pages/index.vue'
import Faq from '~/components/Faq.vue'
import ZipCode from '~/components/ZipCode.vue'
import MediaTypeFilter from '~/components/MediaTypeFilter.vue'

registerEndpoint('/api/search', () => ({ success: true, results: [], hasMore: false, token: null }))

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

describe('Search field', () => {
  it('has an accessible name', async () => {
    // Showcase keeps fetching sequentially after the test ends; in CI that outlives the test environment
    const wrapper = await mountSuspended(IndexPage, { route: '/', global: { stubs: { Showcase: true } } })

    expect(wrapper.find('input[type="search"]').attributes('aria-label')).toBeTruthy()
  })
})

describe('ZipCode', () => {
  it('names the input and exposes the open/closed state of the editor', async () => {
    const wrapper = await mountSuspended(ZipCode)
    const toggle = wrapper.find('button')

    expect(toggle.attributes('aria-expanded')).toBe('false')

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    // In the open state the button only shows a chevron, so the name has to come from aria-label
    expect(toggle.attributes('aria-label')).toBeTruthy()
    expect(wrapper.find('input').attributes('aria-label')).toBeTruthy()
  })
})

describe('MediaTypeFilter', () => {
  it('marks the selected chip as pressed', async () => {
    const wrapper = await mountSuspended(MediaTypeFilter, {
      props: { types: [{ type: 'Buch', count: 2 }, { type: 'DVD', count: 1 }], modelValue: 'Buch', totalCount: 3 }
    })
    const pressed = wrapper.findAll('button').map(b => [b.text().split(' ')[0], b.attributes('aria-pressed')])

    expect(pressed).toEqual([['Alle', 'false'], ['Buch', 'true'], ['DVD', 'false']])
  })

  it('marks "Alle" as pressed without a selection', async () => {
    const wrapper = await mountSuspended(MediaTypeFilter, {
      props: { types: [{ type: 'Buch', count: 2 }], modelValue: null, totalCount: 2 }
    })

    expect(wrapper.findAll('button')[0]!.attributes('aria-pressed')).toBe('true')
  })
})

describe('Faq', () => {
  it('exposes expanded state, links the button to its panel and keeps a visible focus style', async () => {
    const wrapper = await mountSuspended(Faq)
    const buttons = wrapper.findAll('button')

    expect(buttons.every(b => b.attributes('aria-expanded') === 'false')).toBe(true)

    await buttons[0]!.trigger('click')
    expect(buttons[0]!.attributes('aria-expanded')).toBe('true')
    expect(buttons[1]!.attributes('aria-expanded')).toBe('false')

    const panelId = buttons[0]!.attributes('aria-controls')!
    expect(panelId).toBeTruthy()
    expect(wrapper.find(`#${panelId}`).exists()).toBe(true)

    for (const b of buttons) {
      expect(b.classes()).not.toContain('focus:outline-none')
      expect(b.classes().some(c => c.startsWith('focus-visible:'))).toBe(true)
    }
  })
})
