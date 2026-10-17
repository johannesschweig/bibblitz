<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import libraryData from '~/assets/libraries.json'
import { calculateHaversineDistance, formatDistance } from '~~/utils/distance'
import LibraryMap from '~/components/LibraryMap.vue'

const { track } = useUmami()
const route = useRoute()
const userStore = useUserStore()

const dayLabels = {
  monday: 'Montag',
  tuesday: 'Dienstag',
  wednesday: 'Mittwoch',
  thursday: 'Donnerstag',
  friday: 'Freitag',
  saturday: 'Samstag',
  sunday: 'Sonntag'
}

const libraryId = computed(() => {
  const id = route.params.id
  const raw = Array.isArray(id) ? id[0] : id
  return /^[a-z]/i.test(raw) ? raw : undefined
})

const library = computed(() => {
  const id = libraryId.value
  if (!id) {
    return {
      name: 'Unbekannte Bibliothek',
      district: '',
      address: '',
      mapsLink: '#',
      website: '#',
      opening_hours: []
    }
  }

  const lib = libraryData.find(lib => lib.id === id)
  if (!lib) {
    return {
      name: 'Unbekannte Bibliothek',
      district: '',
      address: '',
      mapsLink: '#',
      website: '#',
      opening_hours: []
    }
  }
  return {
    ...lib,
    mapsLink: `https://maps.google.com/?q=${encodeURIComponent(lib.name)}`,
  }
})

const distanceText = computed(() => {
  const userCoords = userStore.userCoords
  if (!userCoords) return null

  const library = libraryData.find(lib => lib.id === libraryId.value)
  const { lat, lon } = library || { lat: undefined, lon: undefined }
  if (!lat && !lon) return null


  // Calculate distance in kilometers
  const km = calculateHaversineDistance(
    userCoords.lat,
    userCoords.lon,
    lat,
    lon
  )

  return `${formatDistance(km)} von dir entfernt`
})

// The two ways off the library page: planning the way there and the library's own site
function outboundClicked(event: 'library-maps-click' | 'library-website-click') {
  track(event, { id: libraryId.value ?? '', zip_default: userStore.userZipDefault ? 1 : 0 })
}
</script>

<template>
  <div>

    <NuxtLink class="btn btn-text btn-md mb-2 pl-0" @click="$router.go(-1)">
      ← Zurück
    </NuxtLink>

    <LibraryMap v-if="libraryId" :libraryId="libraryId" :key="libraryId" class="mb-2" />

    <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

      <div class="p-5 border-b border-gray-100 bg-linear-to-br from-slate-50 to-white">
        <span
          class="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">
          {{ library.district }}
        </span>
        <h1 class="text-xl font-extrabold text-emerald-950 mt-2.5 leading-tight">
          {{ library.name }}
        </h1>
      </div>

      <div class="p-5 flex flex-col gap-5">
        <div v-if="!userStore.userZipDefault && distanceText"
          class="flex items-start gap-3 bg-blue-50/50 border border-blue-100/60 p-3 rounded-xl">
          <div class="p-1.5 bg-blue-100 text-blue-600 rounded-lg text-xs shrink-0 mt-0.5">
            <Icon name="lucide:footprints" class="size-4 block" />
          </div>
          <div>
            <h3 class="text-xs font-bold text-blue-700 uppercase tracking-wide">Entfernung</h3>
            <p class="text-sm text-blue-900 font-bold mt-0.5">
              {{ distanceText }}
            </p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="p-2 bg-gray-100 text-gray-600 rounded-lg mt-0.5 shrink-0">
            <Icon name="lucide:map-pin" class="size-4 block" />
          </div>
          <div>
            <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wide">Adresse</h3>
            <p class="text-sm text-gray-700 font-medium mt-0.5">{{ library.address }}</p>
            <a :href="library.mapsLink" target="_blank" @click="outboundClicked('library-maps-click')"
              class="text-xs text-blue-600 font-semibold hover:underline block mt-1">
              In Google Maps öffnen ↗
            </a>
          </div>

        </div>

        <div class="flex items-start gap-3">
          <div class="p-2 bg-gray-100 text-gray-600 rounded-lg mt-0.5 shrink-0">
            <Icon name="lucide:clock" class="size-4 block" />
          </div>
          <div class="w-full">
            <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
              Öffnungszeiten
            </h3>

            <div class="bg-gray-50 rounded-xl p-3 text-sm flex flex-col gap-1.5">
              <div v-for="(germanLabel, englishKey) in dayLabels" :key="englishKey"
                class="flex justify-between border-b border-gray-200/50 last:border-none pb-1.5 last:pb-0">
                <span class="text-gray-500 font-medium">{{ germanLabel }}</span>

                <span class="text-gray-800 font-bold" :class="{
                  'text-red-700 font-medium': !library.opening_hours?.[englishKey] || library.opening_hours?.[englishKey] === 'Geschlossen'
                }">
                  {{ library.opening_hours?.[englishKey] || 'Geschlossen' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="library.service_hours" class="flex items-start gap-3">
          <div class="p-2 bg-gray-100 text-gray-600 rounded-lg mt-0.5 shrink-0">
            <Icon name="lucide:concierge-bell" class="size-4 block" />
          </div>
          <div class="w-full">
            <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
              Service Zeiten
            </h3>
            <p class="text-sm text-gray-500">Ausleihe bei Mitarbeitern (z.B. Brettspiele, Konsolenspiele, tlw. Tonies)
            </p>

            <div class="bg-gray-50 rounded-xl p-3 text-sm flex flex-col gap-1.5">
              <div v-for="(germanLabel, englishKey) in dayLabels" :key="englishKey"
                class="flex justify-between border-b border-gray-200/50 last:border-none pb-1.5 last:pb-0">
                <span class="text-gray-500 font-medium">{{ germanLabel }}</span>

                <span class="text-gray-800 font-bold" :class="{
                  'text-gray-500! font-medium': !library.service_hours?.[englishKey] || library.service_hours?.[englishKey] === 'Kein Service'
                }">
                  {{ library.service_hours?.[englishKey] || 'Kein Service' }}
                </span>
              </div>
            </div>
          </div>
        </div>


      </div>

      <div class="p-4 bg-gray-50 border-t border-gray-100 flex">
        <a :href="library.website" target="_blank" class="w-full btn btn-secondary btn-md"
          @click="outboundClicked('library-website-click')">
          <span>Bibliothekswebsite öffnen</span>
          <span class="text-xs">↗</span>
        </a>
      </div>

    </div>
  </div>
</template>