// Shelf watch sheet: the library picker with its ZIP-based default, validation, and the mocked submit.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody, createError } from 'h3'
import { flushPromises } from '@vue/test-utils'
import WatchSheet from '~/components/WatchSheet.vue'
import { groupWatchLibraries } from '../../utils/watch'
import type { AvailabilityInfo } from '../../types/types'

const mock = vi.hoisted(() => ({ on: true }))
mockNuxtImport('useWatchMock', () => () => mock.on)

// The API, faked: the address picks the answer. The requests are kept to check what the sheet sends
const requests: Array<Record<string, unknown>> = []
registerEndpoint('/api/watch', {
  method: 'POST',
  handler: async (event) => {
    const body = await readBody(event)
    requests.push(body)
    if (String(body.email).endsWith('@fail.test')) throw createError({ statusCode: 502 })
    if (String(body.email).endsWith('@rate.test')) throw createError({ statusCode: 429 })
    return { ok: true }
  }
})

const copy = (libraryId: string, daysToWait: number, distance: number, status = 'Ausgeliehen'): AvailabilityInfo => ({
  libraryId, libraryName: `Bezirk: Bibliothek ${libraryId}`, status, daysToWait, distance
})

// near1, near2 within 3 km, far 5 km away: all on loan (the page leaves out libraries with a free copy)
const libraries = groupWatchLibraries([
  copy('near1', 3, 0.7),
  copy('near2', 9, 2),
  copy('far', 5, 5)
])

type Props = { open: boolean, mediaId: string, title: string, libraries: typeof libraries, zipDefault: boolean }
const baseProps = (over: Partial<Props> = {}): Props => ({
  open: true, mediaId: '1', title: 'Die Wartenden : Roman', libraries, zipDefault: false, ...over
})

const mounted: Awaited<ReturnType<typeof mount>>[] = []
async function mount(props: Props) {
  const wrapper = await mountSuspended(WatchSheet, { props })
  mounted.push(wrapper)
  return wrapper
}
afterEach(() => {
  mounted.splice(0).forEach(wrapper => wrapper.unmount())
  document.body.style.overflow = ''
})

beforeEach(() => {
  requests.length = 0
  mock.on = true
  localStorage.clear()
  vi.stubGlobal('umami', { track: vi.fn() })
})

const box = (wrapper: Awaited<ReturnType<typeof mount>>, id: string) =>
  wrapper.find<HTMLInputElement>(`input[type="checkbox"][value="${id}"]`)
const checkedIds = (wrapper: Awaited<ReturnType<typeof mount>>) =>
  wrapper.findAll<HTMLInputElement>('fieldset input[type="checkbox"]').filter(i => i.element.checked).map(i => i.element.value)
const button = (wrapper: Awaited<ReturnType<typeof mount>>, text: string) =>
  wrapper.findAll('button').find(b => b.text() === text)

async function fillAndSubmit(wrapper: Awaited<ReturnType<typeof mount>>, email: string, consent = true) {
  await wrapper.find('#watch-email').setValue(email)
  if (consent) await wrapper.find('form input[type="checkbox"]:not([value])').setValue(true)
  await wrapper.find('form').trigger('submit')
}

describe('Library picker', () => {
  it('preselects the waitable libraries within 3 km once a ZIP is saved', async () => {
    const wrapper = await mount(baseProps())
    expect(checkedIds(wrapper)).toEqual(['near1', 'near2'])
    expect(wrapper.find('[data-testid="watch-zip-hint"]').exists()).toBe(false)
  })

  it('preselects nothing while the default ZIP is in use, and has no ZIP entry of its own', async () => {
    const wrapper = await mount(baseProps({ zipDefault: true }))
    expect(checkedIds(wrapper)).toEqual([])
    expect(wrapper.find('[data-testid="watch-zip-hint"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Stammbezirk')
    // "nearby" means nothing without a ZIP, so the choice is not offered
    expect(button(wrapper, 'In meiner Nähe')).toBeUndefined()
  })

  it('lists exactly the libraries it is given, every one selectable', async () => {
    const wrapper = await mount(baseProps())
    const boxes = wrapper.findAll<HTMLInputElement>('fieldset input[type="checkbox"]')
    expect(boxes.map(i => i.element.value)).toEqual(['near1', 'near2', 'far'])
    expect(boxes.every(i => !i.element.disabled)).toBe(true)
  })

  it('has quick choices for nearby, all and none, and a count', async () => {
    const wrapper = await mount(baseProps())
    await button(wrapper, 'Alle')!.trigger('click')
    expect(checkedIds(wrapper)).toEqual(['near1', 'near2', 'far'])
    expect(wrapper.find('[data-testid="watch-count"]').text()).toBe('3 gewählt')

    await button(wrapper, 'Keine')!.trigger('click')
    expect(checkedIds(wrapper)).toEqual([])
    expect(wrapper.find('[data-testid="watch-count"]').text()).toBe('Keine gewählt')

    await button(wrapper, 'In meiner Nähe')!.trigger('click')
    expect(checkedIds(wrapper)).toEqual(['near1', 'near2'])

    await box(wrapper, 'near2').setValue(false)
    expect(wrapper.find('[data-testid="watch-count"]').text()).toBe('1 gewählt')
  })

  it('starts fresh every time the sheet opens', async () => {
    const wrapper = await mount(baseProps({ open: false }))
    await wrapper.setProps({ open: true })
    await button(wrapper, 'Keine')!.trigger('click')
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    expect(checkedIds(wrapper)).toEqual(['near1', 'near2'])
  })
})

describe('Form', () => {
  it('shows what is missing and does not send', async () => {
    const wrapper = await mount(baseProps())
    await button(wrapper, 'Keine')!.trigger('click')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Wähle mindestens eine Bibliothek.')
    expect(wrapper.text()).toContain('Das ist keine gültige Adresse.')
    expect(wrapper.text()).toContain('Bitte stimme zu.')
    expect(wrapper.find('[data-testid="watch-sent"]').exists()).toBe(false)
    expect(wrapper.find('#watch-email').attributes('aria-invalid')).toBe('true')
  })

  it('clears the library error as soon as a library is selected', async () => {
    const wrapper = await mount(baseProps({ zipDefault: true }))
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Wähle mindestens eine Bibliothek.')

    await box(wrapper, 'far').setValue(true)
    expect(wrapper.text()).not.toContain('Wähle mindestens eine Bibliothek.')
  })

  it('rejects an invalid address', async () => {
    const wrapper = await mount(baseProps())
    await fillAndSubmit(wrapper, 'kein-mail')
    expect(wrapper.text()).toContain('Das ist keine gültige Adresse.')
    expect(wrapper.text()).not.toContain('Wähle mindestens eine Bibliothek.')
  })

  it('sends and then shows the confirmation screen with the chosen libraries', async () => {
    const wrapper = await mount(baseProps())
    await fillAndSubmit(wrapper, 'name@beispiel.de')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="watch-sent"]').exists()).toBe(true), { timeout: 3000 })

    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({ mediaId: '1', libraryIds: ['near1', 'near2'], email: 'name@beispiel.de', website: '' })
    expect(wrapper.text()).toContain('name@beispiel.de')
    expect(wrapper.text()).toContain('Fast da')
    expect(wrapper.text()).toContain('Bibliothek near1')
    expect(wrapper.text()).toContain('Bibliothek near2')
    expect(wrapper.text()).not.toContain('Bibliothek far')
    // No technical details: neither how long the link is valid nor how long the Wecker runs
    expect(wrapper.text()).not.toMatch(/\b(24|30)\b/)
  })

  it('leads to the mocked mail while the mails are mocked', async () => {
    const wrapper = await mount(baseProps())
    await fillAndSubmit(wrapper, 'name@beispiel.de')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="watch-sent"]').exists()).toBe(true), { timeout: 3000 })

    const link = wrapper.find('[data-testid="watch-mail-preview"] a')
    expect(link.text()).toBe('Mail öffnen')
    expect(link.attributes('href')).toContain('/watch/mail')
    expect(link.attributes('href')).toContain('type=confirm')
    expect(link.attributes('href')).toContain('email=name@beispiel.de')
  })

  it('has a hidden field for bots: out of the tab order, and a filled one is sent along', async () => {
    const wrapper = await mount(baseProps())
    const trap = wrapper.find('input[name="website"]')
    expect(trap.attributes('tabindex')).toBe('-1')
    expect(trap.element.closest('[aria-hidden="true"]')).not.toBeNull()

    await trap.setValue('http://spam.example')
    await fillAndSubmit(wrapper, 'name@beispiel.de')
    await vi.waitFor(() => expect(requests).toHaveLength(1), { timeout: 3000 })
    expect(requests[0]).toMatchObject({ website: 'http://spam.example' })
  })

  it('has no mail step once the mails are real', async () => {
    mock.on = false
    const wrapper = await mount(baseProps())
    await fillAndSubmit(wrapper, 'name@beispiel.de')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="watch-sent"]').exists()).toBe(true), { timeout: 3000 })
    expect(wrapper.find('[data-testid="watch-mail-preview"]').exists()).toBe(false)
  })

  it('keeps the consent line free of numbers: the retention period lives on the privacy page', async () => {
    const wrapper = await mount(baseProps())
    const consent = wrapper.find('form input[type="checkbox"]:not([value])').element.closest('label')!.textContent!
    expect(consent).toContain('einmalig per E-Mail benachrichtigt werden')
    expect(consent).not.toMatch(/\d/)
  })

  it('shows a retryable error when the server fails, and a rate limit message', async () => {
    const wrapper = await mount(baseProps())
    await fillAndSubmit(wrapper, 'x@fail.test')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="watch-form-error"]').exists()).toBe(true), { timeout: 3000 })
    expect(wrapper.find('[data-testid="watch-form-error"]').text()).toContain('Hat nicht geklappt')
    expect(wrapper.find('[data-testid="watch-sent"]').exists()).toBe(false)

    await wrapper.find('#watch-email').setValue('x@rate.test')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.find('[data-testid="watch-form-error"]').text()).toContain('Zu viele Versuche'), { timeout: 3000 })
  })
})

describe('Dialog behaviour', () => {
  it('closes with the button and with Escape', async () => {
    const wrapper = await mount(baseProps())
    await button(wrapper, 'Schließen')!.trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)

    await wrapper.find('[role="dialog"]').trigger('keydown.esc')
    expect(wrapper.emitted('close')).toHaveLength(2)
  })

  it('locks the page scroll while open and releases it on close', async () => {
    const wrapper = await mount(baseProps({ open: false }))
    expect(document.body.style.overflow).toBe('')
    await wrapper.setProps({ open: true })
    expect(document.body.style.overflow).toBe('hidden')
    await wrapper.setProps({ open: false })
    expect(document.body.style.overflow).toBe('')
    await flushPromises()
  })
})
