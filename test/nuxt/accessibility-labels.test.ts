// Core controls need an accessible name and, where they toggle, a state a screen reader can announce.
// Regression: search field, ZIP field and the ZIP toggle were unnamed, filter chips had no pressed
// state, FAQ buttons no expanded state and no visible focus.
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import IndexPage from '~/pages/index.vue'
import Faq from '~/components/Faq.vue'
import ZipCode from '~/components/ZipCode.vue'
import FilterPage from '~/components/FilterPage.vue'

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

describe('FilterPage', () => {
  const props = {
    open: true,
    selectedLanguages: ['Englisch'],
    selectedMediaTypes: ['Buch']
  }

  it('is a labelled modal dialog', async () => {
    const wrapper = await mountSuspended(FilterPage, { props })
    const dialog = wrapper.find('[role="dialog"]')

    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.find(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('Filter')
  })

  it('marks the selected chips as pressed', async () => {
    const wrapper = await mountSuspended(FilterPage, { props })
    const pressed = wrapper.findAll('button[aria-pressed]').map(b => [b.text().split(' ')[0], b.attributes('aria-pressed')])

    expect(pressed.slice(0, 2)).toEqual([['Deutsch', 'false'], ['Englisch', 'true']])
    expect(pressed.find(([label]) => label === 'Buch')).toEqual(['Buch', 'true'])
    expect(pressed.find(([label]) => label === 'DVD')).toEqual(['DVD', 'false'])
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
