<!-- pages/media/[id].vue -->
<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useItemCacheStore } from '@/stores/itemCacheStore'
import { getPermanentUrlFromId } from '../../../utils/index.ts'
import { sortBranchesByDistance } from '../../../utils/availability'
import { useUserStore } from '~/stores/userStore.js'
import { ref, computed } from 'vue'
import ZipCode from '~/components/ZipCode.vue'

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

function getStatusClass(status: string) {
  const s = status.toLowerCase()
  if (s.includes('verfügbar')) {
    return 'bg-green-100 text-green-800'
  }
  if (s.includes('ausgeliehen')) {
    return 'bg-amber-100 text-amber-800'
  }
  return 'bg-gray-100 text-gray-800'
}

function authorClicked() {
  track('author-click', { query: data.value?.data.author ?? '' })
}
</script>

<template>
  <div class="max-w-2xl mx-auto font-sans text-gray-800">
    <!-- Zurück-Button -->
    <div class="mb-2">
      <NuxtLink class="btn btn-text btn-md mb-2 pl-0" @click="$router.go(-1)">
        ← Zurück
      </NuxtLink>
    </div>

    <!-- Lade-Zustand -->
    <div v-if="pending" class="text-center py-12 text-gray-500 animate-pulse">
      <p class="text-lg font-semibold">Suche Medien-Details...</p>
    </div>

    <!-- Fehler-Zustand -->
    <div v-else-if="error || !data?.success" class="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200">
      <p class="font-semibold">Fehler beim Laden der Daten</p>
      <p class="text-sm">{{ error?.message || data?.error }}</p>
    </div>

    <!-- Daten-Anzeige -->
    <div v-else-if="data?.data">
      <!-- Titel & Metadaten -->
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
          <a :href="getPermanentUrlFromId(data.data.id)" target="_blank" class="btn btn-sm btn-secondary">
            ↗ VÖBB
          </a>
        </div>
      </header>

      <!-- Verfügbarkeitsliste -->
      <section>
        <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
          📍 Standorte <span class="text-sm font-normal text-gray-500">(Sortiert nach Entfernung zu <span
              class="font-medium"> {{ userStore.userZip }} </span>)</span>
        </h2>

        <div v-if="data.data.availability.length === 0" class="text-gray-500 p-4 text-center">
          Keine Exemplare gefunden.
        </div>

        <div v-else class="space-y-3">

          <ZipCode v-model="userStore.userZip" />
          <NuxtLink v-for="(item, index) in displayedBranches" :key="index" :to="`/library/${item.libraryId}`"
            class="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-blue-50 group hover:border-blue-50 active:bg-blue-50 active:border-blue-50"
            :class="item.distance < 3 ? 'bg-white' : 'bg-gray-50'">
            <div>
              <h3 class="font-medium text-gray-900 group-hover:text-blue-900 group-active:text-blue-900">{{
                item.libraryName }}</h3>
              <p v-if="item.shelfmark" class="text-xs text-gray-500 mt-0.5">
                Signatur: <span class="font-mono bg-gray-50 px-1 py-0.5 border border-gray-300 rounded text-gray-700">{{
                  item.shelfmark
                }}</span>
                <!-- {{ item.daysToWait}} -->
              </p>
            </div>

            <!-- Status Badge -->
            <span class="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold self-start sm:self-center"
              :class="getStatusClass(item.status)">
              {{
                item.daysToWait === 0 ? 'Rückgabe heute fällig' :
                  (item.daysToWait !== -999 && item.daysToWait < 0) ? 'Rückgabe überfällig' : item.daysToWait === 1
                    ? '⏳ 1 Tag' : item.daysToWait > 1 && item.daysToWait !== 999 ? `⏳ ${item.daysToWait} Tage` :
                      item.status
              }}
            </span>
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
