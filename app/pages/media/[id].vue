<!-- pages/media/[id].vue -->
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useItemCacheStore } from '@/stores/itemCacheStore'
import { getPermanentUrlFromId } from '../../../utils/index.ts'
import { sortBranchesByDistance, calculateBranchStatus } from '../../../utils/availability'
import { formatDistance } from '../../../utils/distance'
import { useUserStore } from '~/stores/userStore.js'
import { useVoebbStatusStore } from '~/stores/voebbStatusStore'
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import ZipCode from '~/components/ZipCode.vue'
import StatusPill from '~/components/StatusPill.vue'
import MediaTitle from '~/components/MediaTitle.vue'
import { getMediaTypeConfig } from '../../../utils/mediaTypeMapping'

const { track } = useUmami()
const route = useRoute()
const mediaId = route.params.id
const itemCacheStore = useItemCacheStore()
const userStore = useUserStore()
const voebbStatus = useVoebbStatusStore()
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

const mediaConfig = computed(() => getMediaTypeConfig(data.value?.data?.mediaType ?? ''))

// "Buch · PlayStation 4 · 2025", with the same media label as in the result list
const metaLine = computed(() => {
  const item = data.value?.data
  if (!item) return ''
  const type = item.mediaType ? getMediaTypeConfig(item.mediaType).label : undefined
  return [type, item.platform, item.year].filter(Boolean).join(' · ')
})

function voebbClicked() {
  track('voebb-click', {
    available_now: sortedBranches.value.filter(b => b.daysToWait === -999).length,
    zip_default: userStore.userZipDefault ? 1 : 0
  })
}

// Measures whether people click the (plain, unstyled) ISBN on their own. If they do, link it to an
// ISBN search (that also finds duplicate records of the same edition with their own copies)
function isbnClicked() {
  track('isbn-click')
}

function authorClicked() {
  track('author-click', { query: data.value?.data.author ?? '' })
}
</script>

<template>
  <div class="font-sans text-gray-800">
    <!-- Back button -->
    <div class="mb-2">
      <NuxtLink class="btn btn-text btn-md mb-2 pl-0" @click="$router.go(-1)">
        ← Zurück
      </NuxtLink>
    </div>

    <!-- Loading state -->
    <div v-if="pending">
      <p role="status" class="sr-only">Suche Medien-Details …</p>
      <DetailSkeleton />
    </div>

    <!-- Direct visit during maintenance: there is no title to show, the banner above explains why -->
    <p v-else-if="voebbStatus.maintenance && !data?.data" class="text-gray-500 text-sm py-8 text-center">
      Dieser Eintrag kann gerade nicht geladen werden.
    </p>

    <!-- Error state -->
    <div v-else-if="error || !data?.success" class="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200">
      <p class="font-semibold">Fehler beim Laden der Daten</p>
      <p class="text-sm">{{ error?.message || data?.error }}</p>
    </div>

    <!-- Data display -->
    <div v-else-if="data?.data">
      <!-- Title & metadata: same icon + text grid as a result row, larger -->
      <header class="mb-8 border-b border-gray-200 pb-6">
        <div class="grid grid-cols-[56px_1fr] sm:grid-cols-[72px_1fr] gap-4">
          <img :src="mediaConfig.icon" :alt="mediaConfig.label" class="w-14 sm:w-[72px] p-1.5 sm:p-2">
          <div class="min-w-0">
            <p v-if="metaLine" class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">{{ metaLine }}</p>
            <h1 class="text-2xl md:text-3xl font-bold leading-tight text-gray-900 text-balance">
              <MediaTitle :title="data.data.title" />
            </h1>
            <p v-if="data.data.author" class="mt-2 text-base text-gray-700" @click="authorClicked()">{{ data.data.author }}</p>
            <p v-if="data.data.isbn" class="mt-1 text-xs text-gray-500">ISBN <span @click="isbnClicked()">{{ data.data.isbn }}</span></p>
          </div>
        </div>
        <a :href="getPermanentUrlFromId(data.data.id)" target="_blank" class="btn btn-md btn-secondary mt-5"
          @click="voebbClicked()">
          ↗ VÖBB
        </a>
      </header>

      <!-- Availability list -->
      <section>
        <h2 class="text-lg font-bold mb-4">Standorte</h2>

        <div v-if="!data.data.availability" class="text-gray-500 p-4 text-center">
          {{ voebbStatus.maintenance ? 'Standorte sind während der VÖBB-Wartung nicht abrufbar.' : 'Standorte konnten nicht geladen werden.' }}
        </div>

        <div v-else-if="data.data.availability.length === 0" class="text-gray-500 p-4 text-center">
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
