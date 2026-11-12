// The pages behind the links of the shelf watch mails, and the dev mail preview. The visit itself confirms or
// switches off, the call comes from the page's script on the client, so a mail scanner that only requests the
// link does nothing. The API is faked with registerEndpoint; the tokens pick the answer.
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { mountSuspended, registerEndpoint, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { readBody, getQuery, createError } from 'h3'
import ConfirmPage from '~/pages/watch/confirm.vue'
import StopPage from '~/pages/watch/stop.vue'
import MailPage from '~/pages/watch/mail.vue'
import { useItemCacheStore } from '~/stores/itemCacheStore'

// import.meta.dev is off in tests: switch the dev mail preview on
mockNuxtImport('useWatchMock', () => () => true)

registerEndpoint('/api/detail', () => ({
  success: true,
  data: { id: '1', title: 'Die Wartenden : Roman', mediaType: 'Buch', availability: [] }
}))

const calls: string[] = []

registerEndpoint('/api/watch/confirm', {
  method: 'POST',
  handler: async (event) => {
    const { token } = await readBody(event)
    calls.push(`confirm:${token}`)
    if (token === 'broken') throw createError({ statusCode: 500 })
    return { ok: true, status: token === 'active' ? 'active' : token === 'expired' ? 'expired' : 'ok' }
  }
})

registerEndpoint('/api/watch/stop', {
  method: 'POST',
  handler: async (event) => {
    const { token } = await readBody(event)
    calls.push(`stop:${token}`)
    if (token === 'broken') throw createError({ statusCode: 500 })
    return { ok: true, status: token === 'gone' ? 'gone' : 'ok' }
  }
})

registerEndpoint('/api/watch/dev-mail', (event) => {
  if (getQuery(event).to === 'nobody@beispiel.de') throw createError({ statusCode: 404 })
  return {
    to: 'name@beispiel.de',
    subject: 'Bitte bestätigen: Wecker für „Die Wartenden“',
    html: '<!doctype html><html><head><title>x</title></head><body><a href="https://www.bibblitz.de/watch/confirm?token=t&id=1">Wecker bestätigen</a></body></html>',
    unsubscribeUrl: 'https://www.bibblitz.de/api/watch/stop?token=t'
  }
})

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

beforeEach(() => {
  calls.length = 0
  useItemCacheStore().$reset()
  vi.stubGlobal('umami', { track: vi.fn() })
})

describe('Confirm page', () => {
  it('confirms by itself when it opens, with no extra click', async () => {
    const wrapper = await mountSuspended(ConfirmPage, { route: '/watch/confirm?token=abc&id=1&n=3' })
    expect(wrapper.find('[role="status"]').text()).toBe('Einen Moment …')
    expect(wrapper.findAll('button')).toHaveLength(0)

    await vi.waitFor(() => expect(wrapper.find('h1').text()).toBe('Wecker läuft'), { timeout: 3000 })
    expect(calls).toEqual(['confirm:abc'])
    expect(wrapper.text()).toContain('Die Wartenden')
    expect(wrapper.text()).toContain('in einer deiner 3 Bibliotheken')
    // No technical details: neither the 24 hours of the link nor the 180 days of the Wecker
    expect(wrapper.text()).not.toMatch(/\b(24|30|180)\b/)
  })

  it('has a way to switch the Wecker off again, which needs no click on a second page', async () => {
    const wrapper = await mountSuspended(ConfirmPage, { route: '/watch/confirm?token=abc&id=1&n=3' })
    await vi.waitFor(() => expect(wrapper.find('h1').text()).toBe('Wecker läuft'), { timeout: 3000 })
    const off = wrapper.findAll('a').find(a => a.text() === 'Ausschalten')!
    expect(off.attributes('href')).toContain('/watch/stop')
    expect(off.attributes('href')).toContain('token=abc')
  })

  it.each([
    ['active', 'Dieser Wecker läuft schon'],
    ['expired', 'Der Link ist abgelaufen'],
    ['broken', 'Hat nicht geklappt']
  ])('shows what the server answers for a %s token', async (token, heading) => {
    const wrapper = await mountSuspended(ConfirmPage, { route: `/watch/confirm?token=${token}&id=1` })
    await vi.waitFor(() => expect(wrapper.find('h1').text()).toBe(heading), { timeout: 3000 })
    expect(wrapper.text()).not.toMatch(/\b(24|30|180)\b/)
  })

  it.each([
    ['active', 'Dieser Wecker läuft schon'],
    ['expired', 'Der Link ist abgelaufen'],
    ['error', 'Hat nicht geklappt']
  ])('can show the %s state as a preview without calling the server', async (state, heading) => {
    const wrapper = await mountSuspended(ConfirmPage, { route: `/watch/confirm?token=abc&id=1&state=${state}` })
    expect(wrapper.find('h1').text()).toBe(heading)
    expect(calls).toEqual([])
  })
})

describe('Stop page', () => {
  it('switches the Wecker off by itself when it opens, then says the address is deleted', async () => {
    const wrapper = await mountSuspended(StopPage, { route: '/watch/stop?token=abc&id=1' })
    expect(wrapper.find('[role="status"]').text()).toBe('Einen Moment …')

    await vi.waitFor(() => expect(wrapper.find('h1').text()).toBe('Wecker aus'), { timeout: 3000 })
    expect(calls).toEqual(['stop:abc'])
    expect(wrapper.text()).toContain('gelöscht')
  })

  it.each([
    ['gone', 'Diesen Wecker gibt es nicht mehr'],
    ['broken', 'Hat nicht geklappt']
  ])('shows what the server answers for a %s token', async (token, heading) => {
    const wrapper = await mountSuspended(StopPage, { route: `/watch/stop?token=${token}&id=1` })
    await vi.waitFor(() => expect(wrapper.find('h1').text()).toBe(heading), { timeout: 3000 })
  })
})

describe('Mail preview', () => {
  const frame = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) => wrapper.find('[data-testid="mail-frame"]').attributes('srcdoc') ?? ''

  it('shows the confirmation mail the server sent, in a frame whose links open the whole page', async () => {
    const wrapper = await mountSuspended(MailPage, { route: '/watch/mail?type=confirm&id=1&email=name@beispiel.de' })
    await vi.waitFor(() => expect(wrapper.find('[data-testid="mail-subject"]').exists()).toBe(true))

    expect(wrapper.find('[data-testid="mail-to"]').text()).toBe('name@beispiel.de')
    expect(wrapper.find('[data-testid="mail-subject"]').text()).toContain('Bitte bestätigen')
    expect(frame(wrapper)).toContain('Wecker bestätigen')
    expect(frame(wrapper)).toContain('<base target="_top">')
    // The mail program's "Abbestellen" goes to the stop page, not to the API
    expect(wrapper.find('[data-testid="mail-client-unsubscribe"]').attributes('href')).toBe('https://www.bibblitz.de/watch/stop?token=t')
  })

  it('says so when no mail was sent yet', async () => {
    const wrapper = await mountSuspended(MailPage, { route: '/watch/mail?type=confirm&id=1&email=nobody@beispiel.de' })
    await vi.waitFor(() => expect(wrapper.find('[data-testid="mail-missing"]').exists()).toBe(true))
    expect(wrapper.find('[data-testid="mail-frame"]').exists()).toBe(false)
  })

  it('shows the alert mail from sample data, with a link back to the title that carries ref=wecker', async () => {
    const wrapper = await mountSuspended(MailPage, { route: '/watch/mail?type=alert&id=1' })
    expect(wrapper.find('[data-testid="mail-subject"]').text()).toContain('ist verfügbar')
    expect(frame(wrapper)).toContain('/media/1?ref=wecker')
    expect(frame(wrapper)).toContain('Wecker ausschalten')
    // Like after a real alert the stop link has no watch behind it
    expect(wrapper.find('[data-testid="mail-client-unsubscribe"]').attributes('href')).toBe('/watch/stop?token=sample&id=1')
  })
})
