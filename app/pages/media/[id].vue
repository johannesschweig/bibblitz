<!-- pages/media/[id].vue -->
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useItemCacheStore } from '@/stores/itemCacheStore'
import { getPermanentUrlFromId } from '../../../utils/index.ts'
import { sortBranchesByDistance, calculateBranchStatus, parseStatus, splitLibraryName } from '../../../utils/availability'
import { formatDistance } from '../../../utils/distance'
import { useUserStore } from '~/stores/userStore.js'
import { useVoebbStatusStore } from '~/stores/voebbStatusStore'
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import ZipCode from '~/components/ZipCode.vue'
import StatusPill from '~/components/StatusPill.vue'
import MediaTitle from '~/components/MediaTitle.vue'
import { getMediaTypeConfig } from '../../../utils/mediaTypeMapping'
import { splitSubtitle } from '../../../utils/catalogText'

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

  // The default ZIP is not the user's location, so "far away" would hide the wrong branches
  if (branches.length <= 3 || showAllBranches.value || userStore.userZipDefault) {
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

// The title comes from the client-side detail fetch, so until it arrives the default site title stays.
// Without the subtitle: it can be very long and the tab only shows the first words anyway.
useHead({
  title: () => {
    const title = data.value?.data?.title
    return title ? `${splitSubtitle(title).main} – BibBlitz` : undefined
  }
})

const mediaConfig = computed(() => getMediaTypeConfig(data.value?.data?.mediaType ?? ''))

// "Buch · PlayStation 4 · 2025", with the same media label as in the result list
const metaLine = computed(() => {
  const item = data.value?.data
  if (!item) return ''
  const type = item.mediaType ? getMediaTypeConfig(item.mediaType).label : undefined
  return [type, item.platform, item.year].filter(Boolean).join(' · ')
})

// Measures whether the default view (nearby branches only) is enough or people open the far ones too
function expandBranches() {
  track('branches-expand', {
    hidden: hiddenBranchesCount.value,
    available_now: displayedBranches.value.filter(b => b.daysToWait === -999).length,
    zip_default: userStore.userZipDefault ? 1 : 0
  })
  showAllBranches.value = true
}

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
      <!-- Title & metadata: text only, no icon -->
      <header class="mb-10">
        <p v-if="metaLine" class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{{ metaLine }}</p>
        <h1 class="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-gray-900 text-pretty break-words">
          <MediaTitle :title="data.data.title" stacked />
        </h1>
        <p v-if="data.data.author" class="mt-3 text-xl text-gray-800" @click="authorClicked()">{{ data.data.author }}</p>
        <p v-if="data.data.isbn" class="mt-2 text-sm text-gray-500">ISBN <span @click="isbnClicked()">{{ data.data.isbn }}</span></p>
        <a :href="getPermanentUrlFromId(data.data.id)" target="_blank" class="btn btn-md btn-secondary mt-6"
          @click="voebbClicked()">
          VÖBB
          <Icon name="lucide:arrow-up-right" class="size-4" />
        </a>
      </header>

      <!-- Availability list -->
      <section>
        <h2 class="text-xl font-bold mb-4">Standorte</h2>

        <div v-if="!data.data.availability" class="text-gray-500 p-4 text-center">
          {{ voebbStatus.maintenance ? 'Standorte sind während der VÖBB-Wartung nicht abrufbar.' : 'Standorte konnten nicht geladen werden.' }}
        </div>

        <div v-else-if="data.data.availability.length === 0" class="text-gray-500 p-4 text-center">
          Keine Exemplare gefunden.
        </div>

        <div v-else>
          <ZipCode v-model="userStore.userZip" class="mb-2" />
          <ul class="divide-y divide-gray-200 border-b border-gray-200">
            <li v-for="(item, index) in displayedBranches" :key="index">
              <!-- ?media lets the library page show which copy the user is after -->
              <NuxtLink :to="{ path: `/library/${item.libraryId}`, query: { media: mediaId } }"
                class="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-2 py-4 hover:bg-gray-50 active:bg-gray-50">
                <div class="min-w-0 col-start-1 row-start-1">
                  <h3 class="font-medium text-gray-900 wrap-anywhere">{{ splitLibraryName(item.libraryName).name }}</h3>
                  <!-- Mobile: distance on one line, shelf mark on the next. Wider: all on one line -->
                  <div class="mt-1 text-sm text-gray-600 sm:flex sm:flex-wrap sm:gap-x-1.5">
                    <!-- Distances are meaningless while the default ZIP is in use -->
                    <p v-if="item.distance !== undefined && !userStore.userZipDefault">{{ formatDistance(item.distance) }}</p>
                    <p v-if="item.shelfmark" class="sm:before:mr-1.5 sm:before:content-['·'] sm:first:before:content-none">
                      Signatur: <span class="font-mono text-[13px] text-gray-700">{{ item.shelfmark }}</span>
                    </p>
                  </div>
                  <p v-if="parseStatus(item.status).notes.length" class="mt-1.5 flex items-start gap-1.5 text-sm text-gray-600">
                    <Icon name="lucide:info" class="mt-0.5 size-4 shrink-0 text-gray-500" />
                    <span>{{ parseStatus(item.status).notes.join(' · ') }}</span>
                  </p>
                </div>
                <StatusPill class="col-start-1 row-start-2 justify-self-start sm:col-start-2 sm:row-start-1 sm:justify-self-end" v-bind="calculateBranchStatus(item, userStore.userZipDefault)" />
                <Icon name="lucide:chevron-right" class="size-4 text-gray-500 col-start-2 row-start-1 row-span-2 sm:col-start-3 sm:row-span-1" />
              </NuxtLink>
            </li>
          </ul>
          <button v-if="hiddenBranchesCount > 0" @click="expandBranches" class="btn btn-md btn-secondary mt-6 w-full">
            {{ hiddenBranchesCount }} entferntere
            {{ hiddenBranchesCount === 1 ? 'Bibliothek' : 'Bibliotheken' }} anzeigen
          </button>
        </div>
      </section>


    </div>
  </div>
</template>
