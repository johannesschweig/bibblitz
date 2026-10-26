// Result rows load their availability through a queue (VÖBB times out when ~10 detail pages are
// scraped at once); pages the user waits on must not queue behind them.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useItemCacheStore } from '~/stores/itemCacheStore'

let running = 0
let peak = 0
const started: string[] = []
const releases: Array<() => void> = []

registerEndpoint('/api/detail', async (event: any) => {
  const id = new URL(event.node.req.url, 'http://x').searchParams.get('id') as string
  started.push(id)
  running++
  peak = Math.max(peak, running)
  await new Promise<void>(resolve => releases.push(resolve))
  running--
  return { success: true, data: { id, title: `Item ${id}`, mediaType: 'Buch', availability: [{ libraryName: 'X', status: 'Verfügbar', daysToWait: -999 }] } }
})

const release = async () => {
  releases.shift()?.()
  await new Promise(resolve => setTimeout(resolve, 10))
}

beforeEach(() => {
  useItemCacheStore().$reset()
  running = 0
  peak = 0
  started.length = 0
  releases.length = 0
})

describe('itemCacheStore.fetchDetails', () => {
  it('runs at most 3 queued row fetches at the same time', async () => {
    const store = useItemCacheStore()
    const rows = ['1', '2', '3', '4', '5', '6'].map(id => store.fetchDetails(id, { queued: true }))

    await vi.waitFor(() => expect(started).toHaveLength(3))
    expect(started).toEqual(['1', '2', '3'])

    while (started.length < 6 || releases.length) await release()
    await Promise.all(rows)

    expect(peak).toBe(3)
    expect(Object.keys(store.items)).toHaveLength(6)
  })

  it('does not queue the same row twice', async () => {
    const store = useItemCacheStore()
    const a = store.fetchDetails('1', { queued: true })
    const b = store.fetchDetails('1', { queued: true })

    await vi.waitFor(() => expect(started).toEqual(['1']))
    await release()
    await Promise.all([a, b])
    expect(started).toEqual(['1'])
  })

  it('fetches a page right away while row fetches wait, and the queued row skips its own request', async () => {
    const store = useItemCacheStore()
    const rows = ['1', '2', '3', '4'].map(id => store.fetchDetails(id, { queued: true }))
    await vi.waitFor(() => expect(started).toHaveLength(3))

    // row 4 waits for a slot, the user opens its page
    const page = store.fetchDetails('4')
    await vi.waitFor(() => expect(started).toEqual(['1', '2', '3', '4']))

    while (releases.length) await release()
    await Promise.all([...rows, page])

    expect(started.filter(id => id === '4')).toHaveLength(1)
    expect(store.items['4']?.availability).toBeTruthy()
  })
})
