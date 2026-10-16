<!-- pages/index.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMediaStore } from '~/stores/mediaStore'
import { useItemCacheStore } from '#imports'
import AppIntro from '~/components/AppIntro.vue'
import Faq from '~/components/Faq.vue'
import MediaItem from '~/components/MediaItem.vue'
import About from '~/components/About.vue'
import Showcase from '~/components/Showcase.vue'
import MediaTypeFilter from '~/components/MediaTypeFilter.vue'
import { getMediaTypeConfig } from '../../utils/mediaTypeMapping'
import { normalizeIsbn } from '../../utils/isbn'

const { track } = useUmami()
const route = useRoute()
const router = useRouter()
const mediaStore = useMediaStore()
const itemCacheStore = useItemCacheStore()

const searchQuery = ref('')
const loading = ref(false)
const hasSearched = ref(false)
const lastQuery = ref('')

// Currently selected filter (null = all)
const selectedMediaType = ref<string | null>(null)

const quickSearches = [
  { icon: 'lucide:book-open', label: 'Dune', query: 'Dune Wüstenplanet' },
  { icon: 'lucide:puzzle', label: 'Catan', query: 'Siedler von Catan' },
  { icon: 'lucide:headphones', label: 'Tonie Eiskönigin', query: 'Tonie Eiskönigin' }
]

// 1. Overview of all media types in the results, with counts
const mediaTypes = computed(() => {
  const counts: Record<string, number> = {}

  for (const id of mediaStore.searchIds) {
    const rawType = itemCacheStore.items[id]?.mediaType || 'unbekannt'
    const label = getMediaTypeConfig(rawType).label  // ← normalized
    counts[label] = (counts[label] || 0) + 1
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }))
})

// 2. Filtered IDs based on the selected tag
const filteredSearchIds = computed(() => {
  if (!selectedMediaType.value) return mediaStore.searchIds

  return mediaStore.searchIds.filter(id => {
    const rawType = itemCacheStore.items[id]?.mediaType || 'unbekannt'
    return getMediaTypeConfig(rawType).label === selectedMediaType.value
  })
})

// router.replace triggers the route.query.q watcher before mediaStore.lastQuery is set.
// Without this marker the same search (and the same VÖBB scrape) would run twice.
// Must be declared before the watcher: it runs immediately (`immediate`) and calls handleSearch.
let inFlightQuery = ''

watch(
  () => route.query.q,
  (newQuery) => {
    // This page is kept alive (see app.vue), so the watcher keeps firing on /media and /library.
    // Without this guard the else branch below would router.replace the q param onto those pages.
    if (route.path !== '/') return

    if (newQuery) {
      const queryStr = String(newQuery)
      searchQuery.value = queryStr
      hasSearched.value = true

      if (queryStr !== mediaStore.lastQuery) {
        handleSearch(queryStr, 'user')
      }
    } else {
      if (mediaStore.lastQuery && mediaStore.searchIds.length > 0) {
        searchQuery.value = mediaStore.lastQuery
        hasSearched.value = true
        router.replace({ query: { q: mediaStore.lastQuery } })
      } else {
        searchQuery.value = ''
        hasSearched.value = false
        selectedMediaType.value = null
        mediaStore.clearSearch()
      }
    }
  },
  { immediate: true }
)

function handleInputClear() {
  if (searchQuery.value === '') {
    hasSearched.value = false
    selectedMediaType.value = null
    mediaStore.searchIds = []
    router.replace({ query: {} })
  }
}

function handleQuickSearch(query: string) {
  searchQuery.value = query
  handleSearch(query, 'quick')
}

async function handleSearch(queryText: string, source: 'user' | 'quick') {
  const cleanQuery = queryText.trim()
  if (!cleanQuery) return
  if (cleanQuery === inFlightQuery) return
  inFlightQuery = cleanQuery
  loading.value = true
  hasSearched.value = false
  selectedMediaType.value = null
  lastQuery.value = cleanQuery
  router.replace({ query: { q: cleanQuery } })
  let failed = false
  try {
    await mediaStore.executeSearch(cleanQuery)
  } catch (error) {
    failed = true
    console.error('Fehler bei der VÖBB-Suche:', error)
  } finally {
    if (inFlightQuery === cleanQuery) inFlightQuery = ''
    loading.value = false
    hasSearched.value = true
  }
  // Track only after the response so the result count and errors can be sent along
  track(
    source === 'user' ? 'search-started' : 'search-quick',
    {
      query: cleanQuery,
      results: mediaStore.searchIds.length,
      ...(normalizeIsbn(cleanQuery) && { isbn: 1 }),
      ...(failed && { error: 1 })
    }
  )
}

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
          <input v-model="searchQuery" type="search" placeholder="Titel, Autor, Spiel, ISBN …" @search="handleInputClear"
            @input="handleInputClear"
            class="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
            :disabled="loading" />
          <button type="submit" class="btn btn-md btn-accent" :disabled="loading || !searchQuery.trim()">
            {{ loading ? '…' : 'Suchen' }}
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

        <!-- Filter tags right below the search (once there are results) -->
        <div v-if="mediaStore.searchIds.length > 0 && !loading">
          <MediaTypeFilter v-model="selectedMediaType" :types="mediaTypes" :total-count="mediaStore.searchIds.length" />
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="text-center py-16 text-gray-400 text-sm animate-pulse">
        Frage VÖBB-Katalog ab …
      </div>

      <!-- Results -->
      <div v-else-if="mediaStore.searchIds.length > 0">
        <p class="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
          {{ filteredSearchIds.length }} von {{ mediaStore.searchIds.length }} Treffern
        </p>

        <!-- List uses filteredSearchIds -->
        <ul v-if="filteredSearchIds.length > 0" class="space-y-2">
          <MediaItem v-for="id in filteredSearchIds" :key="id" :mediaId="id" />
        </ul>
        <div v-else class="text-center py-12 text-gray-400 text-sm">
          Keine Treffer für den gewählten Filter.
        </div>

        <div v-if="mediaStore.hasMore" class="text-center mt-4">
          <button type="button" class="btn btn-md btn-secondary" :disabled="mediaStore.loadingMore"
            @click="handleLoadMore">
            {{ mediaStore.loadingMore ? 'Lädt …' : 'Weitere Treffer laden' }}
          </button>
        </div>
      </div>

      <!-- Empty state after a search -->
      <div v-else-if="hasSearched" class="text-center py-16 text-gray-400 text-sm">
        Keine Treffer für „{{ lastQuery }}“ gefunden.
      </div>
      <div v-else class="flex flex-col gap-8">
        <AppIntro />
        <Showcase />
        <Faq />
        <About />
      </div>

      <div class="mt-12 flex gap-3 text-xs">
        <NuxtLink to="/imprint" class="text-gray-400 hover:text-gray-600">Impressum</NuxtLink>
        <NuxtLink to="/data-privacy" class="text-gray-400 hover:text-gray-600">Datenschutz</NuxtLink>
      </div>
    </div>
  </div>
</template>