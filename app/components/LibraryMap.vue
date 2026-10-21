<!-- components/LibraryMap.vue -->
<template>
  <div>
    <div ref="mapEl" class="isolate w-full h-48 rounded-xl overflow-hidden border border-gray-200 bg-gray-100" />
    <ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
      <li class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-emerald-600"></span>Diese Bibliothek</li>
      <li class="flex items-center gap-1.5"><span class="size-2 rounded-full bg-gray-400"></span>Andere Bibliothek</li>
      <li v-if="!userStore.userZipDefault" class="flex items-center gap-1.5">
        <span class="size-2 rounded-full bg-blue-600"></span>Dein Stammbezirk
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import libraryData from '~/assets/libraries.json'

const props = defineProps({
  libraryId: { type: String, required: true },
})


const userStore = useUserStore()
const config = useRuntimeConfig()
const mapEl = ref<HTMLElement>()
let map: any
let markers: any[] = []

onMounted(async () => {
  if (!mapEl.value) return

  const L = (await import('leaflet')).default
  await import('leaflet/dist/leaflet.css')

  // Centred on the library at a fixed zoom, whatever the user's ZIP is
  const selectedLibrary = libraryData.find(lib => lib.id === props.libraryId)
  map = L.map(mapEl.value, {
    center: selectedLibrary ? [selectedLibrary.lat, selectedLibrary.lon] : [52.52, 13.405],
    zoom: selectedLibrary ? 15 : 11,
    zoomControl: true,
    // The map sits mid-page: the wheel must keep scrolling the page
    scrollWheelZoom: false,
  })

  // CartoDB Positron – clean, minimal, grey/white
  L.tileLayer(`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${config.public.cartoApiKey}`, {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map)

  // User location
  const userIcon = L.divIcon({
    html: `<div style="
      width: 14px; height: 14px;
      background: #2563eb;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(37,99,235,0.5);
    "></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
  if (!userStore.userZipDefault) {
    L.marker([userStore.userCoords.lat, userStore.userCoords.lon], { icon: userIcon, zIndexOffset: 2000 }, )
      .addTo(map)
      .bindPopup(`<b>Dein Standort (${userStore.userZip})</b>`)
  }

  // Library markers
  addLibraryMarkers(L)

  // The container may still be settling when the tiles are requested
  requestAnimationFrame(() => map?.invalidateSize())
})

function addLibraryMarkers(L: any) {
  // Remove old markers
  markers.forEach(m => m.remove())
  markers = []

  const libIcon = L.divIcon({
    html: `<div style="
      width: 8px; height: 8px;
      background: #9ca3af;
      border: 2px solid white;
      border-radius: 50%;
    "></div>`,
    className: '',
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  })

  const selectedLibIcon = L.divIcon({
    html: `<div style="
      width: 22px; height: 22px;
      background: #059669;
      border: 4px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.45);
    "></div>`,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })

  libraryData.forEach(lib => {
    const icon = lib.id === props.libraryId ? selectedLibIcon : libIcon
    const marker = L.marker([lib.lat, lib.lon], { icon: icon, zIndexOffset: lib.id === props.libraryId ? 1000 : 0 })
      .addTo(map)
      .bindPopup(`
        <div style="font-family: sans-serif; min-width: 140px;">
          <b style="font-size: 13px;">${lib.name}</b>
          ${lib.address ? `<br><span style="font-size: 11px; color: #6b7280;">${lib.address}</span>` : ''}
        </div>
      `)
    // .on('click', () => emit('select', lib))

    markers.push(marker)
  })
}

// Re-render libraries when they change
watch(() => libraryData, async () => {
  if (!map) return
  const L = (await import('leaflet')).default
  addLibraryMarkers(L)
})

onUnmounted(() => {
  map?.remove()
})
</script>