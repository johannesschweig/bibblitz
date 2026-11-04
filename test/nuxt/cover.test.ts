// Covers in the UI: result rows and the detail header show the cover from our proxy route and fall back
// to a media-type tile whenever there is none (no id, or the image fails).
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { mountSuspended, registerEndpoint, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import CoverImage from '~/components/CoverImage.vue'
import DetailSkeleton from '~/components/DetailSkeleton.vue'
import ResultSkeleton from '~/components/ResultSkeleton.vue'
import MediaItem from '~/components/MediaItem.vue'
import MediaPage from '~/pages/media/[id].vue'
import { useItemCacheStore } from '~/stores/itemCacheStore'
import { useMediaStore } from '~/stores/mediaStore'

// The detail page asks whether the cover exists before it renders (see composables/coverAvailable.ts)
const { coverAvailable } = vi.hoisted(() => ({ coverAvailable: vi.fn() }))
mockNuxtImport('coverAvailable', () => coverAvailable)

let detail: Record<string, unknown>
// Lets a test hold back the (slow) detail scrape
let detailGate: Promise<void> = Promise.resolve()
registerEndpoint('/api/detail', async () => {
  await detailGate
  return { success: true, data: detail }
})
const track = vi.fn()
registerEndpoint('/api/search', () => ({
  success: true,
  results: [{ id: '7', title: 'Dune', mediaType: 'Buch', coverId: '9783257056082' }],
  hasMore: false,
  token: null
}))

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

beforeEach(() => {
  coverAvailable.mockReset().mockResolvedValue(true)
  useItemCacheStore().$reset()
  useMediaStore().$reset()
  detailGate = Promise.resolve()
  track.mockClear()
  vi.stubGlobal('umami', { track })
})

describe('CoverImage', () => {
  it('shows the cover from our own route', async () => {
    const wrapper = await mountSuspended(CoverImage, { props: { coverId: '9783257056082', mediaType: 'Buch', size: 's' } })

    const img = wrapper.find('img[data-testid="cover-image"]')
    expect(img.attributes('src')).toBe('/api/cover/9783257056082?size=s')
    expect(wrapper.find('[data-testid="cover-fallback"]').exists()).toBe(false)
  })

  it('is decorative (empty alt) and loads lazily, so only visible rows request their cover', async () => {
    const wrapper = await mountSuspended(CoverImage, { props: { coverId: '9783257056082', mediaType: 'Buch', size: 's' } })

    const img = wrapper.find('img')
    expect(img.attributes('alt')).toBe('')
    expect(img.attributes('loading')).toBe('lazy')
  })

  it('requests the size it is given', async () => {
    const wrapper = await mountSuspended(CoverImage, { props: { coverId: '9783257056082', mediaType: 'Buch', size: 'm' } })

    expect(wrapper.find('img').attributes('src')).toBe('/api/cover/9783257056082?size=m')
  })

  it('shows the media-type tile when the record has no cover id', async () => {
    const wrapper = await mountSuspended(CoverImage, { props: { mediaType: 'DVD', size: 's' } })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cover-fallback"]').exists()).toBe(true)
  })

  it('renders nothing without a cover when the tile is switched off', async () => {
    const wrapper = await mountSuspended(CoverImage, { props: { mediaType: 'Buch', size: 'm', fallback: false } })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cover-fallback"]').exists()).toBe(false)
    expect(wrapper.find('div').exists()).toBe(false)
  })

  it('still shows the cover when the tile is switched off', async () => {
    const wrapper = await mountSuspended(CoverImage, { props: { coverId: '9783257056082', mediaType: 'Buch', size: 'm', fallback: false } })

    expect(wrapper.find('img[data-testid="cover-image"]').exists()).toBe(true)
  })

  it('switches to the tile when the image fails to load', async () => {
    const wrapper = await mountSuspended(CoverImage, { props: { coverId: '9780000000002', mediaType: 'Buch', size: 's' } })

    await wrapper.find('img').trigger('error')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cover-fallback"]').exists()).toBe(true)
  })

  it('tries again when the id changes (the same row component shows another record)', async () => {
    const wrapper = await mountSuspended(CoverImage, { props: { coverId: '9780000000002', mediaType: 'Buch', size: 's' } })
    await wrapper.find('img').trigger('error')

    await wrapper.setProps({ coverId: '9783257056082' })

    expect(wrapper.find('img').attributes('src')).toBe('/api/cover/9783257056082?size=s')
  })
})

describe('Result row', () => {
  it('shows the cover of the search result', async () => {
    useItemCacheStore().setBasicData({ id: '1', title: 'Dune', mediaType: 'Buch', coverId: '9783257056082' })

    const wrapper = await mountSuspended(MediaItem, { props: { mediaId: '1' } })

    expect(wrapper.find('img[data-testid="cover-image"]').attributes('src')).toBe('/api/cover/9783257056082?size=s')
  })

  it('finds the cover through the ISBN when the row only has the detail data (showcase on the home page)', async () => {
    useItemCacheStore().setBasicData({ id: '4', title: 'Dune', mediaType: 'Buch', isbn: '978-3-257-05608-2', availability: [] })

    const wrapper = await mountSuspended(MediaItem, { props: { mediaId: '4' } })

    expect(wrapper.find('img[data-testid="cover-image"]').attributes('src')).toBe('/api/cover/9783257056082?size=s')
  })

  it('shows a cover once the details of a showcase row arrive', async () => {
    const wrapper = await mountSuspended(MediaItem, { props: { mediaId: '5' } })
    expect(wrapper.find('img[data-testid="cover-image"]').exists()).toBe(false)

    useItemCacheStore().items['5'] = { id: '5', title: 'Dune', mediaType: 'Buch', isbn: '978-3-257-05608-2', availability: [] }
    await flushPromises()

    expect(wrapper.find('img[data-testid="cover-image"]').attributes('src')).toBe('/api/cover/9783257056082?size=s')
  })

  it('shows the tile for a result without a cover', async () => {
    useItemCacheStore().setBasicData({ id: '2', title: 'Tatort', mediaType: 'DVD' })

    const wrapper = await mountSuspended(MediaItem, { props: { mediaId: '2' } })

    expect(wrapper.find('img[data-testid="cover-image"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cover-fallback"]').exists()).toBe(true)
  })

  it('still links to the record and keeps the title readable', async () => {
    useItemCacheStore().setBasicData({ id: '3', title: 'Dune', mediaType: 'Buch', coverId: '9783257056082' })

    const wrapper = await mountSuspended(MediaItem, { props: { mediaId: '3' } })

    expect(wrapper.find('a').attributes('href')).toBe('/media/3')
    expect(wrapper.text()).toContain('Dune')
  })
})

describe('Search store', () => {
  it('keeps the cover id of a search result in the item cache', async () => {
    await useMediaStore().executeSearch('Dune')

    expect(useItemCacheStore().items['7']?.coverId).toBe('9783257056082')
  })
})

const base = { title: 'Dune', author: 'Herbert, Frank', mediaType: 'Buch', availability: [] }

// Own id per test: the page's useAsyncData key (detail-<id>) would otherwise return the first test's data
async function mountDetail(id: string) {
  const wrapper = await mountSuspended(MediaPage, { route: `/media/${id}` })
  await vi.waitFor(() => expect(wrapper.text()).toContain('Dune'))
  return wrapper
}

describe('Detail page', () => {
  it('shows the cover found through the ISBN when the page is opened directly', async () => {
    detail = { ...base, id: '11', isbn: '978-3-257-05608-2' }

    const wrapper = await mountDetail('11')

    expect(wrapper.find('img[data-testid="cover-image"]').attributes('src')).toBe('/api/cover/9783257056082?size=m')
  })

  it('uses the cover id from the search result when there is one', async () => {
    useItemCacheStore().setBasicData({ id: '12', title: 'Dune', mediaType: 'Buch', coverId: '9783257060652' })
    detail = { ...base, id: '12', isbn: '978-3-257-05608-2' }

    const wrapper = await mountDetail('12')

    expect(wrapper.find('img[data-testid="cover-image"]').attributes('src')).toBe('/api/cover/9783257060652?size=m')
  })

  it('shows no cover slot at all when the record has no ISBN', async () => {
    detail = { ...base, id: '13' }

    const wrapper = await mountDetail('13')

    expect(wrapper.find('img[data-testid="cover-image"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cover-fallback"]').exists()).toBe(false)
  })

  it('checks before rendering whether the cover exists, and shows no slot when it does not', async () => {
    coverAvailable.mockResolvedValue(false)
    detail = { ...base, id: '16', isbn: '978-3-257-05608-2' }

    const wrapper = await mountDetail('16')

    expect(coverAvailable).toHaveBeenCalledWith('9783257056082', 'm')
    expect(wrapper.find('img[data-testid="cover-image"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cover-fallback"]').exists()).toBe(false)
  })

  it('keeps the skeleton until the cover check is settled, so the text never jumps', async () => {
    let settle: (exists: boolean) => void = () => {}
    coverAvailable.mockReturnValue(new Promise<boolean>((resolve) => { settle = resolve }))
    detail = { ...base, id: '17', isbn: '978-3-257-05608-2' }

    const wrapper = await mountSuspended(MediaPage, { route: '/media/17' })
    await flushPromises()
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(wrapper.find('[data-testid="skeleton-cover"]').exists()).toBe(true)

    settle(true)
    await vi.waitFor(() => expect(wrapper.find('h1').exists()).toBe(true))
    expect(wrapper.find('img[data-testid="cover-image"]').exists()).toBe(true)
  })

  it('leaves the cover out of the skeleton when the search result already showed there is none', async () => {
    coverAvailable.mockReturnValue(new Promise<boolean>(() => {}))
    useItemCacheStore().setBasicData({ id: '18', title: 'Dune', mediaType: 'DVD' })
    detail = { ...base, id: '18' }

    const wrapper = await mountSuspended(MediaPage, { route: '/media/18' })
    await flushPromises()

    expect(wrapper.find('[data-testid="skeleton-cover"]').exists()).toBe(false)
  })

  it('starts the cover check at once for a record from the search, without waiting for the detail scrape', async () => {
    let release: () => void = () => {}
    detailGate = new Promise<void>((resolve) => { release = resolve })
    useItemCacheStore().setBasicData({ id: '19', title: 'Dune', mediaType: 'Buch', coverId: '9783257060652' })
    detail = { ...base, id: '19', isbn: '978-3-257-05608-2' }

    const wrapper = await mountSuspended(MediaPage, { route: '/media/19' })
    await flushPromises()

    expect(coverAvailable).toHaveBeenCalledWith('9783257060652', 'm')
    expect(wrapper.find('h1').exists()).toBe(false)

    release()
    await vi.waitFor(() => expect(wrapper.find('h1').exists()).toBe(true))
    expect(coverAvailable).toHaveBeenCalledTimes(1)
  })

  it('has to wait for the detail scrape on a direct visit, the ISBN is only known from it', async () => {
    let release: () => void = () => {}
    detailGate = new Promise<void>((resolve) => { release = resolve })
    detail = { ...base, id: '20', isbn: '978-3-257-05608-2' }

    const wrapper = await mountSuspended(MediaPage, { route: '/media/20' })
    await flushPromises()
    expect(coverAvailable).not.toHaveBeenCalled()

    release()
    await vi.waitFor(() => expect(wrapper.find('h1').exists()).toBe(true))
    expect(coverAvailable).toHaveBeenCalledWith('9783257056082', 'm')
  })

  it('tracks a click on the cover, to see whether people want to enlarge it', async () => {
    detail = { ...base, id: '21', isbn: '978-3-257-05608-2' }
    const wrapper = await mountDetail('21')

    await wrapper.find('img[data-testid="cover-image"]').trigger('click')

    // useUmami passes its optional data along, so the call has a second (undefined) argument
    expect(track.mock.calls.map(call => call[0])).toContain('cover-click')
  })

  it('does not track anything else on the page when the cover is clicked', async () => {
    detail = { ...base, id: '22', isbn: '978-3-257-05608-2' }
    const wrapper = await mountDetail('22')
    track.mockClear()

    await wrapper.find('img[data-testid="cover-image"]').trigger('click')

    expect(track).toHaveBeenCalledTimes(1)
  })

  it('removes the cover slot when the image fails after all', async () => {
    detail = { ...base, id: '14', isbn: '978-3-257-05608-2' }
    const wrapper = await mountDetail('14')

    await wrapper.find('img[data-testid="cover-image"]').trigger('error')

    expect(wrapper.find('img[data-testid="cover-image"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cover-fallback"]').exists()).toBe(false)
  })

  it('keeps the text next to the title when there is no cover', async () => {
    detail = { ...base, id: '15' }

    const wrapper = await mountDetail('15')

    expect(wrapper.find('h1').text()).toContain('Dune')
  })
})

describe('Skeletons', () => {
  it('result skeleton rows reserve the cover slot of a row', async () => {
    const wrapper = await mountSuspended(ResultSkeleton, { props: { count: 3 } })

    expect(wrapper.findAll('[data-testid="skeleton-cover"]')).toHaveLength(3)
  })

  it('detail skeleton reserves the cover slot by default', async () => {
    const wrapper = await mountSuspended(DetailSkeleton)

    expect(wrapper.find('[data-testid="skeleton-cover"]').exists()).toBe(true)
  })

  it('detail skeleton can leave the cover slot out', async () => {
    const wrapper = await mountSuspended(DetailSkeleton, { props: { cover: false } })

    expect(wrapper.find('[data-testid="skeleton-cover"]').exists()).toBe(false)
  })
})
