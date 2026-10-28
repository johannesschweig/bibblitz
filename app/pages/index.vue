<!-- pages/index.vue -->
<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMediaStore } from '~/stores/mediaStore'
import { useVoebbStatusStore } from '~/stores/voebbStatusStore'
import AppIntro from '~/components/AppIntro.vue'
import Faq from '~/components/Faq.vue'
import MediaItem from '~/components/MediaItem.vue'
import About from '~/components/About.vue'
import Showcase from '~/components/Showcase.vue'
import FilterPage from '~/components/FilterPage.vue'
import { normalizeIsbn } from '../../utils/isbn'
import { parseFilterParam, parseMediaTypeParam, sameSelection } from '../../utils/filters'

interface Filters {
  languages: string[]
  mediaTypes: string[]
}

const { track } = useUmami()
const route = useRoute()
const router = useRouter()
const mediaStore = useMediaStore()
const voebbStatus = useVoebbStatusStore()

const searchQuery = ref('')
const loading = ref(false)
const hasSearched = ref(false)
const searchFailed = ref(false)
const lastQuery = ref('')

const filterOpen = ref(false)
const filterButton = ref<HTMLButtonElement | null>(null)

const quickSearches = [
  { icon: 'lucide:book-open', label: 'Dune', query: 'Dune Wüstenplanet' },
  { icon: 'lucide:puzzle', label: 'Catan', query: 'Siedler von Catan' },
  { icon: 'lucide:headphones', label: 'Tonie Eiskönigin', query: 'Tonie Eiskönigin' }
]

// Both filters are applied by VÖBB as part of the search and stay active until they are reset
const currentFilters = (): Filters => ({ languages: mediaStore.languages, mediaTypes: mediaStore.mediaTypes })
const activeFilterCount = computed(() => mediaStore.languages.length + mediaStore.mediaTypes.length)
// Also with no results at all, so a filter that hides everything can be reset
const showFilterButton = computed(() => !loading.value && (mediaStore.searchIds.length > 0 || activeFilterCount.value > 0))
const filterSummary = computed(() => [...mediaStore.languages, ...mediaStore.mediaTypes].join(', '))

// The count only covers the pages loaded so far, so say "geladen" while more can be loaded
const resultCountText = computed(() => {
  const loaded = mediaStore.searchIds.length
  return mediaStore.hasMore ? `${loaded} Treffer geladen` : `${loaded} Treffer`
})

// ?q=Dune&lang=Englisch&type=Buch
function searchRouteQuery(query: string, filters: Filters) {
  return {
    q: query,
    ...(filters.languages.length > 0 && { lang: filters.languages.join(',') }),
    ...(filters.mediaTypes.length > 0 && { type: filters.mediaTypes.join(',') })
  }
}

// router.replace triggers the route.query watcher before mediaStore.lastQuery is set.
// Without this marker the same search (and the same VÖBB scrape) would run twice.
// Must be declared before the watcher: it runs immediately (`immediate`) and calls handleSearch.
let inFlightSearch = ''
const searchKey = (query: string, filters: Filters) =>
  [query, [...filters.languages].sort().join(','), [...filters.mediaTypes].sort().join(',')].join('|')

watch(
  () => [route.query.q, route.query.lang, route.query.type],
  ([newQuery]) => {
    // This page is kept alive (see app.vue), so the watcher keeps firing on /media and /library.
    // Without this guard the else branch below would router.replace the q param onto those pages.
    if (route.path !== '/') return

    if (newQuery) {
      const queryStr = String(newQuery)
      const filters = { languages: parseFilterParam(route.query.lang), mediaTypes: parseMediaTypeParam(route.query.type) }
      searchQuery.value = queryStr
      hasSearched.value = true

      const sameFilters = sameSelection(filters.languages, mediaStore.languages) && sameSelection(filters.mediaTypes, mediaStore.mediaTypes)
      if (queryStr !== mediaStore.lastQuery || !sameFilters) {
        handleSearch(queryStr, 'user', filters)
      }
    } else {
      if (mediaStore.lastQuery && mediaStore.searchIds.length > 0) {
        searchQuery.value = mediaStore.lastQuery
        hasSearched.value = true
        router.replace({ query: searchRouteQuery(mediaStore.lastQuery, currentFilters()) })
      } else {
        searchQuery.value = ''
        hasSearched.value = false
        mediaStore.clearSearch()
      }
    }
  },
  { immediate: true }
)

function handleInputClear() {
  if (searchQuery.value === '') {
    hasSearched.value = false
    mediaStore.clearSearch()
    router.replace({ query: {} })
  }
}

function handleQuickSearch(query: string) {
  searchQuery.value = query
  handleSearch(query, 'quick')
}

// 'filter' is a search the filter page triggered: it is tracked as filter-apply, not as a search.
// Returns whether the search worked.
async function handleSearch(queryText: string, source: 'user' | 'quick' | 'filter', filters: Filters = currentFilters()): Promise<boolean> {
  const cleanQuery = queryText.trim()
  if (!cleanQuery) return true
  const key = searchKey(cleanQuery, filters)
  if (key === inFlightSearch) return true
  inFlightSearch = key
  loading.value = true
  hasSearched.value = false
  searchFailed.value = false
  lastQuery.value = cleanQuery
  router.replace({ query: searchRouteQuery(cleanQuery, filters) })
  let failed = false
  try {
    await mediaStore.executeSearch(cleanQuery, filters)
  } catch (error) {
    failed = true
    searchFailed.value = true
    console.error('Fehler bei der VÖBB-Suche:', error)
  } finally {
    if (inFlightSearch === key) inFlightSearch = ''
    loading.value = false
    hasSearched.value = true
  }
  // The URL shows what VÖBB applied: a value it does not offer for this search is dropped
  if (!failed && !(sameSelection(mediaStore.languages, filters.languages) && sameSelection(mediaStore.mediaTypes, filters.mediaTypes))) {
    router.replace({ query: searchRouteQuery(cleanQuery, currentFilters()) })
  }
  if (source !== 'filter') {
    // Track only after the response so the result count and errors can be sent along
    track(
      source === 'user' ? 'search-started' : 'search-quick',
      {
        query: cleanQuery,
        results: mediaStore.searchIds.length,
        ...(normalizeIsbn(cleanQuery) && { isbn: 1 }),
        ...(mediaStore.languages.length > 0 && { language: mediaStore.languages.join(',') }),
        ...(mediaStore.mediaTypes.length > 0 && { media_type: mediaStore.mediaTypes.join(',') }),
        ...(failed && { error: 1 })
      }
    )
  }
  return !failed
}

// 'empty-state' = "Filter ändern" under a search that found nothing with the filter
function openFilter(source: 'button' | 'empty-state' = 'button') {
  filterOpen.value = true
  track('filter-open', { source })
}

function closeFilter() {
  filterOpen.value = false
  nextTick(() => filterButton.value?.focus())
}

// The dialog closes right away, the list shows the skeleton while VÖBB searches again
async function applyFilters(selection: Filters) {
  closeFilter()
  const unchanged = sameSelection(selection.languages, mediaStore.languages) && sameSelection(selection.mediaTypes, mediaStore.mediaTypes)
  if (unchanged) return
  const worked = await handleSearch(lastQuery.value || mediaStore.lastQuery, 'filter', selection)
  const language = selection.languages.join(',')
  const mediaType = selection.mediaTypes.join(',')
  const results = mediaStore.searchIds.length
  track('filter-apply', {
    results,
    ...(language && { language }),
    ...(mediaType && { media_type: mediaType }),
    ...(!language && !mediaType && { reset: 1 }),
    ...(!worked && { error: 1 })
  })
  // Own events per filter: Umami counts sessions per event name, not per property value
  if (worked && language) track('filter-language', { language, results })
  if (worked && mediaType) track('filter-media-type', { media_type: mediaType, results })
}

// Way out of a filter that hides everything
const resetFilters = () => applyFilters({ languages: [], mediaTypes: [] })

async function handleLoadMore() {
  try {
    await mediaStore.loadMore()
    track('search-next-page', { query: mediaStore.lastQuery, page: mediaStore.currentPage })
  } catch (error) {
    console.error('Fehler beim Nachladen weiterer Treffer:', error)
  }
}
</script>

<template>
  <div class="min-h-screen">
    <div class="md:py-12">

      <!-- Search form -->
      <div class="mb-6">
        <form @submit.prevent="handleSearch(searchQuery, 'user')" class="flex gap-2 mb-3">
          <input v-model="searchQuery" type="search" aria-label="Suche nach Titel, Autor, Spiel oder ISBN" placeholder="Titel, Autor, Spiel, ISBN …" @search="handleInputClear"
            @input="handleInputClear"
            class="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
            :disabled="loading" />
          <button type="submit" class="btn btn-md btn-accent" :disabled="loading || !searchQuery.trim()">
            <Icon v-if="loading" name="lucide:loader-circle" class="size-4 animate-spin" />
            Suchen
          </button>
        </form>

        <!-- Suggestions (initial state only) -->
        <div v-if="mediaStore.searchIds.length === 0 && !loading"
          class="flex flex-wrap gap-2 items-center text-xs text-gray-500 px-1">
          <span class="mr-1 hidden sm:inline">Vorschläge:</span>

          <button v-for="item in quickSearches" :key="item.query" type="button" @click="handleQuickSearch(item.query)"
            :disabled="loading"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <Icon :name="item.icon" class="size-3.5" />
            {{ item.label }}
          </button>
        </div>

        <!-- Filter button right below the search (once there are results, or while a filter hides all) -->
        <div v-if="showFilterButton">
          <button ref="filterButton" type="button" class="btn btn-sm btn-secondary" aria-haspopup="dialog"
            @click="openFilter('button')">
            <Icon name="lucide:sliders-horizontal" class="size-4" />
            Filter
            <span v-if="activeFilterCount > 0" aria-hidden="true"
              class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">{{ activeFilterCount }}</span>
            <span v-if="activeFilterCount > 0" class="sr-only">, {{ activeFilterCount }} aktiv</span>
          </button>
        </div>
      </div>

      <FilterPage :open="filterOpen" :selected-languages="mediaStore.languages" :selected-media-types="mediaStore.mediaTypes"
        @close="closeFilter" @apply="applyFilters" />

      <!-- Loading state -->
      <div v-if="loading">
        <p role="status" class="sr-only">Frage VÖBB-Katalog ab …</p>
        <ResultSkeleton />
      </div>

      <!-- Results -->
      <div v-else-if="mediaStore.searchIds.length > 0">
        <p data-testid="result-count" aria-live="polite"
          class="text-xs font-medium text-gray-500 uppercase tracking-widest mb-4">{{ resultCountText }}</p>

        <ul class="space-y-2">
          <MediaItem v-for="id in mediaStore.searchIds" :key="id" :mediaId="id" />
        </ul>

        <div v-if="mediaStore.hasMore" class="text-center mt-4">
          <button type="button" class="btn btn-md btn-secondary" :disabled="mediaStore.loadingMore"
            @click="handleLoadMore">
            {{ mediaStore.loadingMore ? 'Lädt …' : 'Weitere Treffer laden' }}
          </button>
        </div>
      </div>

      <!-- The banner in the layout explains the maintenance, this only says what it means for the search -->
      <div v-else-if="hasSearched && voebbStatus.maintenance" class="text-center py-16 text-gray-500 text-sm">
        Die Suche ist gerade nicht möglich.
      </div>
      <!-- The filters stay active, so "Erneut versuchen" searches with them again -->
      <div v-else-if="hasSearched && searchFailed" class="text-center py-16 text-gray-500 text-sm">
        <p>Die Suche hat nicht geklappt. Bitte versuche es gleich noch einmal.</p>
        <button type="button" class="btn btn-md btn-secondary mt-4" @click="handleSearch(lastQuery, 'user')">
          Erneut versuchen
        </button>
      </div>
      <!-- Empty state after a search -->
      <div v-else-if="hasSearched" class="text-center py-16 text-gray-500 text-sm">
        <p v-if="activeFilterCount > 0">Keine Treffer für „{{ lastQuery }}“ mit dem Filter {{ filterSummary }}.</p>
        <p v-else>Keine Treffer für „{{ lastQuery }}“ gefunden.</p>
        <div v-if="activeFilterCount > 0" class="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" class="btn btn-md btn-accent" @click="resetFilters">Filter zurücksetzen</button>
          <button type="button" class="btn btn-md btn-secondary" @click="openFilter('empty-state')">Filter ändern</button>
        </div>
      </div>
      <div v-else class="flex flex-col gap-8">
        <AppIntro />
        <Showcase />
        <Faq />
        <About />
      </div>

      <div class="mt-12 flex gap-3 text-xs">
        <NuxtLink to="/libraries" class="text-gray-500 hover:text-gray-700">Alle Bibliotheken</NuxtLink>
        <NuxtLink to="/imprint" class="text-gray-500 hover:text-gray-700">Impressum</NuxtLink>
        <NuxtLink to="/data-privacy" class="text-gray-500 hover:text-gray-700">Datenschutz</NuxtLink>
      </div>
    </div>
  </div>
</template>