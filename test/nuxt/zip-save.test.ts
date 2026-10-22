// Saving the ZIP: only Berlin ZIPs may be saved and tracked as `zip-save`.
// Regression: Enter bypassed the disabled "Speichern" button, so a ZIP like 99084
// showed "gespeichert" and was tracked, but never saved.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useUserStore } from '~/stores/userStore'
import ZipCode from '~/components/ZipCode.vue'

const umamiTrack = vi.fn()

beforeEach(() => {
  localStorage.clear()
  umamiTrack.mockClear()
  vi.stubGlobal('umami', { track: umamiTrack })
  useUserStore().$reset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('userStore.saveLocation', () => {
  it('saves a Berlin ZIP with its coordinates', () => {
    const store = useUserStore()

    expect(store.saveLocation('10559')).toBe(true)
    expect(store.userZip).toBe('10559')
    expect(store.userZipDefault).toBe(false)
    expect(store.userCoords.lat).toBeCloseTo(52.53, 1)
    expect(localStorage.getItem('bibblitz_zip')).toBe('10559')
  })

  it('ignores whitespace around the ZIP', () => {
    const store = useUserStore()

    expect(store.saveLocation(' 10559 ')).toBe(true)
    expect(store.userZip).toBe('10559')
  })

  it.each(['99084', '1055', '', 'abcde'])('rejects %j and changes nothing', (zip) => {
    const store = useUserStore()

    expect(store.saveLocation(zip)).toBe(false)
    expect(store.userZip).toBe('10178')
    expect(store.userZipDefault).toBe(true)
    expect(localStorage.getItem('bibblitz_zip')).toBeNull()
  })
})

describe('ZipCode', () => {
  async function mountEditing(zip: string) {
    const wrapper = await mountSuspended(ZipCode)
    await wrapper.find('button').trigger('click') // "Ändern"
    await wrapper.find('input').setValue(zip)
    return wrapper
  }

  function saveButton(wrapper: Awaited<ReturnType<typeof mountEditing>>) {
    return wrapper.findAll('button').find(b => b.text() === 'Speichern')!
  }

  it('disables "Speichern" for a ZIP outside Berlin', async () => {
    const wrapper = await mountEditing('99084')

    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('explains why a complete ZIP outside Berlin is rejected', async () => {
    const wrapper = await mountEditing('99084')

    expect(wrapper.find('[role="status"]').text()).toContain('Keine Berliner PLZ')
  })

  it('does not nag while the ZIP is still being typed', async () => {
    const wrapper = await mountEditing('1055')

    expect(wrapper.text()).not.toContain('Keine Berliner PLZ')
  })

  it('shows no rejection for a valid ZIP', async () => {
    const wrapper = await mountEditing('10559')

    expect(wrapper.text()).not.toContain('Keine Berliner PLZ')
  })

  it('Enter with a ZIP outside Berlin neither saves nor tracks', async () => {
    const wrapper = await mountEditing('99084')
    vi.useFakeTimers()

    await wrapper.find('input').trigger('keyup.enter')
    expect(wrapper.text()).not.toContain('gespeichert')

    await vi.advanceTimersByTimeAsync(2000)
    expect(useUserStore().userZip).toBe('10178')
    expect(umamiTrack).not.toHaveBeenCalled()
  })

  it('Enter with a Berlin ZIP saves after the confirmation and tracks once', async () => {
    const wrapper = await mountEditing('10559')
    vi.useFakeTimers()

    await wrapper.find('input').trigger('keyup.enter')
    expect(wrapper.text()).toContain('gespeichert')
    expect(useUserStore().userZip).toBe('10178')

    await vi.advanceTimersByTimeAsync(2000)
    expect(useUserStore().userZip).toBe('10559')
    expect(umamiTrack).toHaveBeenCalledOnce()
    expect(umamiTrack).toHaveBeenCalledWith('zip-save', { query: '1055X' })
  })

  // Someone who lives in the default ZIP 10178 has to be able to confirm it
  it('confirms the unchanged default ZIP', async () => {
    const wrapper = await mountSuspended(ZipCode)
    await wrapper.find('button').trigger('click') // "Ändern"
    expect(saveButton(wrapper).attributes('disabled')).toBeUndefined()
    vi.useFakeTimers()

    await saveButton(wrapper).trigger('click')
    await vi.advanceTimersByTimeAsync(2000)

    const store = useUserStore()
    expect(store.userZip).toBe('10178')
    expect(store.userZipDefault).toBe(false)
    expect(localStorage.getItem('bibblitz_zip')).toBe('10178')
    expect(umamiTrack).toHaveBeenCalledWith('zip-save', { query: '1017X' })
  })

  it('does not offer saving again once the ZIP is confirmed and unchanged', async () => {
    useUserStore().saveLocation('10559')
    const wrapper = await mountSuspended(ZipCode)
    await wrapper.find('button').trigger('click')

    expect(saveButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('clicking "Speichern" with a Berlin ZIP saves', async () => {
    const wrapper = await mountEditing('12043')
    vi.useFakeTimers()

    await saveButton(wrapper).trigger('click')
    await vi.advanceTimersByTimeAsync(2000)

    expect(useUserStore().userZip).toBe('12043')
    expect(umamiTrack).toHaveBeenCalledWith('zip-save', { query: '1204X' })
  })
})
