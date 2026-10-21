<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import libraryData from '~/assets/libraries.json'
import { calculateHaversineDistance, formatDistance } from '~~/utils/distance'
import { berlinNow, getOpenStatus, type DayKey, type OpenStatus } from '~~/utils/openingHours'
import LibraryMap from '~/components/LibraryMap.vue'
import StatusPill from '~/components/StatusPill.vue'

const { track } = useUmami()
const route = useRoute()
const userStore = useUserStore()

const days: { key: DayKey, label: string, short: string }[] = [
  { key: 'monday', label: 'Montag', short: 'Mo' },
  { key: 'tuesday', label: 'Dienstag', short: 'Di' },
  { key: 'wednesday', label: 'Mittwoch', short: 'Mi' },
  { key: 'thursday', label: 'Donnerstag', short: 'Do' },
  { key: 'friday', label: 'Freitag', short: 'Fr' },
  { key: 'saturday', label: 'Samstag', short: 'Sa' },
  { key: 'sunday', label: 'Sonntag', short: 'So' }
]

// Set after mount: the server renders at build/request time, the visitor's clock decides what is "now"
const now = ref<ReturnType<typeof berlinNow> | null>(null)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  now.value = berlinNow()
  timer = setInterval(() => { now.value = berlinNow() }, 60_000)
})
onBeforeUnmount(() => clearInterval(timer))

const today = computed<DayKey | null>(() => now.value?.day ?? null)

const openStatus = computed<OpenStatus | null>(() => {
  if (!now.value) return null
  const lib = library.value
  // Libraries without published hours (e.g. mobile libraries) get no status
  if (!lib?.opening_hours) return null
  return getOpenStatus(lib.opening_hours, lib.service_hours, now.value)
})

const statusPill = computed(() => {
  switch (openStatus.value) {
    case 'open-service': return { tone: 'near', label: 'Jetzt geöffnet mit Service' } as const
    case 'open-no-service': return { tone: 'wait', label: 'Jetzt geöffnet ohne Service' } as const
    case 'open': return { tone: 'near', label: 'Jetzt geöffnet' } as const
    case 'closed': return { tone: 'neutral', label: 'Jetzt geschlossen' } as const
    default: return null
  }
})

// "10:00-19:30" → "10:00–19:30"; null for days without hours
function hoursOf(hours: WeekHours, key: DayKey) {
  const value = hours?.[key]
  return value && /\d/.test(value) ? value.replace('-', '–') : null
}

const openingRows = computed(() => days.map(d => ({ ...d, hours: hoursOf(library.value?.opening_hours, d.key) })))

// Days without service are folded into one line instead of one "Kein Service" row each
const serviceRows = computed(() => days.map(d => ({ ...d, hours: hoursOf(library.value?.service_hours, d.key) })).filter(d => d.hours))
const noServiceDays = computed(() => days.filter(d => !hoursOf(library.value?.service_hours, d.key)).map(d => d.short).join(', '))

const rowClass = (key: DayKey) => key === today.value ? 'bg-gray-50 font-semibold' : ''

// Arrived from Google or a shared link: there is no previous page of ours to go back to
const router = useRouter()
function goBack() {
  if (window.history.state?.back) router.back()
  else router.push('/')
}

// An unknown id is a real 404 for crawlers and shows a "not found" state instead of a fake library
const library = computed(() => {
  const lib = libraryData.find(lib => lib.id === route.params.id)
  if (!lib) return undefined
  return {
    ...lib,
    // Name and address together: names alone ("Fahrbibliothek Mitte 5") can resolve to the wrong place
    mapsLink: `https://maps.google.com/?q=${encodeURIComponent(`${lib.name}, ${lib.address}`)}`,
  }
})
const libraryId = computed(() => library.value?.id)

if (!library.value) {
  useHead({ title: 'Bibliothek nicht gefunden – BibBlitz', meta: [{ name: 'robots', content: 'noindex' }] })
  if (import.meta.server) setResponseStatus(useRequestEvent()!, 404)
}

const distanceText = computed(() => {
  const userCoords = userStore.userCoords
  const lib = library.value
  if (!userCoords || !lib) return null

  const km = calculateHaversineDistance(userCoords.lat, userCoords.lon, lib.lat, lib.lon)
  return `${formatDistance(km)} von dir entfernt`
})

// The two ways off the library page: planning the way there and the library's own site
function outboundClicked(event: 'library-maps-click' | 'library-website-click') {
  track(event, { id: libraryId.value ?? '', zip_default: userStore.userZipDefault ? 1 : 0 })
}
</script>

<template>
  <div class="font-sans text-gray-800">

    <button type="button" class="btn btn-text btn-md mb-2 pl-0" @click="goBack">
      <Icon name="lucide:arrow-left" class="size-4" />
      Zurück
    </button>

    <template v-if="library">
    <header class="mb-8">
      <p v-if="library.district" class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
        {{ library.district }}
      </p>
      <h1 class="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-gray-900 text-pretty break-words">
        {{ library.name }}
      </h1>
      <StatusPill v-if="statusPill" v-bind="statusPill" class="mt-4" />
    </header>

    <div class="divide-y divide-gray-200 border-y border-gray-200">

      <section class="py-6">
        <h2 class="text-xl font-bold mb-3">Adresse</h2>
        <p class="text-gray-800">{{ library.address }}</p>
        <p v-if="!userStore.userZipDefault && distanceText" class="mt-1 text-sm text-gray-600">{{ distanceText }}</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <a :href="library.mapsLink" target="_blank" class="btn btn-sm btn-secondary"
            @click="outboundClicked('library-maps-click')">
            In Google Maps öffnen
            <Icon name="lucide:arrow-up-right" class="size-4" />
          </a>
          <a :href="library.website" target="_blank" class="btn btn-sm btn-secondary"
            @click="outboundClicked('library-website-click')">
            Bibliothekswebsite
            <Icon name="lucide:arrow-up-right" class="size-4" />
          </a>
        </div>
      </section>

      <section v-if="libraryId" class="py-6">
        <LibraryMap :libraryId="libraryId" :key="libraryId" />
      </section>

      <section class="py-6">
        <h2 class="text-xl font-bold mb-3">Öffnungszeiten</h2>
        <ul class="divide-y divide-gray-200 text-sm">
          <li v-for="row in openingRows" :key="row.key" class="flex justify-between px-2 py-2"
            :class="rowClass(row.key)" :aria-current="row.key === today ? 'date' : undefined">
            <span :class="row.key === today ? 'text-gray-900' : 'text-gray-600'">{{ row.label }}</span>
            <span :class="row.hours ? 'text-gray-900' : 'text-gray-600'">{{ row.hours || 'Geschlossen' }}</span>
          </li>
        </ul>
      </section>

      <section v-if="library.service_hours" id="servicezeiten" class="py-6 scroll-mt-4">
        <h2 class="text-xl font-bold">Servicezeiten</h2>
        <p class="mt-1 mb-3 text-sm text-gray-600">
          Ausleihe bei Mitarbeitern (z. B. Brettspiele, Konsolenspiele, teilweise Tonies)
        </p>
        <ul class="divide-y divide-gray-200 text-sm">
          <li v-for="row in serviceRows" :key="row.key" class="flex justify-between px-2 py-2"
            :class="rowClass(row.key)" :aria-current="row.key === today ? 'date' : undefined">
            <span :class="row.key === today ? 'text-gray-900' : 'text-gray-600'">{{ row.label }}</span>
            <span class="text-gray-900">{{ row.hours }}</span>
          </li>
        </ul>
        <p v-if="noServiceDays" class="mt-3 px-2 text-sm text-gray-600">{{ noServiceDays }}: kein Service</p>
      </section>

    </div>
    </template>

    <div v-else class="py-10">
      <h1 class="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-gray-900">Bibliothek nicht gefunden</h1>
      <p class="mt-3 text-gray-600">Diese Adresse gehört zu keiner Bibliothek im VÖBB.</p>
      <NuxtLink to="/libraries" class="btn btn-md btn-secondary mt-6">Alle Bibliotheken ansehen</NuxtLink>
    </div>
  </div>
</template>
