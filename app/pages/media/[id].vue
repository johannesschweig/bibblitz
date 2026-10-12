<!-- pages/media/[id].vue -->
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useItemCacheStore } from '@/stores/itemCacheStore'
import { getPermanentUrlFromId } from '../../../utils/index.ts'
import { sortBranchesByDistance, calculateBranchStatus } from '../../../utils/availability'
import { formatDistance } from '../../../utils/distance'
import { useUserStore } from '~/stores/userStore.js'
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import ZipCode from '~/components/ZipCode.vue'
import StatusPill from '~/components/StatusPill.vue'

const { track } = useUmami()
const route = useRoute()
const mediaId = route.params.id
const itemCacheStore = useItemCacheStore()
const userStore = useUserStore()
const showAllBranches = ref(false)

const { data, pending, error } = useAsyncData(`detail-${mediaId}`, async () => {
  const details = await itemCacheStore.fetchDetails(mediaId)
  if (!details) throw new Error('Details konnten nicht geladen werden')
  return { success: true, data: details }
})

const displayedBranches = computed(() => {
  const branches = sortedBranches.value

  if (branches.length <= 3 || showAllBranches.value) {
    return branches
  }

  return branches.filter(item => {
    const dist = item.distance ?? 999
    return dist <= 7
  })
})

const hiddenBranchesCount = computed(() => {
  return sortedBranches.value.length - displayedBranches.value.length
})

const sortedBranches = computed(() => {
  if (!data.value?.success || !data.value?.data?.availability) {
    return []
  }

  return sortBranchesByDistance(data.value.data.availability, userStore.userCoords)
})

// Measures once per page view what the user sees on the detail page (errors, availability, default ZIP)
let detailTracked = false
function trackDetailView() {
  if (detailTracked || pending.value || !import.meta.client) return
  detailTracked = true
  const branches = sortedBranches.value
  const status = error.value || !data.value?.success ? 'error' : branches.length === 0 ? 'empty' : 'ok'
  const free = branches.filter(b => b.daysToWait === -999)
  const nearestFree = free.map(b => b.distance).filter((d): d is number => d !== undefined)
  track('detail-view', {
    status,
    branches: branches.length,
    available_now: free.length,
    ...(nearestFree.length && { nearest_available_km: Math.min(...nearestFree) }),
    zip_default: userStore.userZipDefault ? 1 : 0
  })
}
watch(pending, trackDetailView)
// nextTick: app.vue loads the saved ZIP in its own onMounted, which runs after the page's
onMounted(() => nextTick(trackDetailView))

function voebbClicked() {
  track('voebb-click', {
    available_now: sortedBranches.value.filter(b => b.daysToWait === -999).length,
    zip_default: userStore.userZipDefault ? 1 : 0
  })
}

function authorClicked() {
  track('author-click', { query: data.value?.data.author ?? '' })
}
</script>

<template>
  <div class="max-w-2xl mx-auto font-sans text-gray-800">
    <!-- Back button -->
    <div class="mb-2">
      <NuxtLink class="btn btn-text btn-md mb-2 pl-0" @click="$router.go(-1)">
        ← Zurück
      </NuxtLink>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="text-center py-12 text-gray-500 animate-pulse">
      <p class="text-lg font-semibold">Suche Medien-Details...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error || !data?.success" class="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200">
      <p class="font-semibold">Fehler beim Laden der Daten</p>
      <p class="text-sm">{{ error?.message || data?.error }}</p>
    </div>

    <!-- Data display -->
    <div v-else-if="data?.data">
      <!-- Title & metadata -->
      <header class="mb-6 border-b border-gray-200 pb-6">
        <h1 class="text-xl md:text-2xl font-bold leading-tight text-gray-900 mb-2">
          {{ data.data.title }}
        </h1>
        <div class="flex flex-col gap-2 text-sm text-gray-600 mb-2">
          <div v-if="data.data.author" class="" @click="authorClicked()"> {{
            data.data.author }}</div>
          <div v-if="data.data.mediaType" class="">{{ data.data.mediaType }}</div>
        </div>
        <!-- Buttons -->
        <div class="flex gap-2">
          <a :href="getPermanentUrlFromId(data.data.id)" target="_blank" class="btn btn-sm btn-secondary"
            @click="voebbClicked()">
            ↗ VÖBB
          </a>
        </div>
      </header>

      <!-- Availability list -->
      <section>
        <h2 class="text-lg font-bold mb-4">Standorte</h2>

        <div v-if="data.data.availability.length === 0" class="text-gray-500 p-4 text-center">
          Keine Exemplare gefunden.
        </div>

        <div v-else class="space-y-3">

          <ZipCode v-model="userStore.userZip" />
          <NuxtLink v-for="(item, index) in displayedBranches" :key="index" :to="`/library/${item.libraryId}`"
            class="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-blue-50 group hover:border-blue-50 active:bg-blue-50 active:border-blue-50">
            <div>
              <h3 class="font-medium text-gray-900 group-hover:text-blue-900 group-active:text-blue-900">{{
                item.libraryName }}</h3>
              <p v-if="item.distance !== undefined || item.shelfmark" class="text-xs text-gray-500 mt-0.5">
                <span v-if="item.distance !== undefined" class="font-semibold text-gray-700">{{ formatDistance(item.distance) }}</span>
                <span v-if="item.distance !== undefined && item.shelfmark"> · </span>
                <template v-if="item.shelfmark">
                  Signatur: <span class="font-mono bg-gray-50 px-1 py-0.5 border border-gray-300 rounded text-gray-700">{{
                    item.shelfmark
                  }}</span>
                </template>
              </p>
            </div>

            <StatusPill class="self-start sm:self-center" v-bind="calculateBranchStatus(item, userStore.userZipDefault)" />
          </NuxtLink>
          <button v-if="hiddenBranchesCount > 0" @click="showAllBranches = true" class="btn btn-md btn-secondary">
            {{ hiddenBranchesCount }} entferntere
            {{ hiddenBranchesCount === 1 ? 'Bibliothek' : 'Bibliotheken' }} anzeigen
          </button>
        </div>
      </section>


    </div>
  </div>
</template>
