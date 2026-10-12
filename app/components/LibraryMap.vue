<!-- components/LibraryMap.vue -->
<template>
  <div ref="mapEl" class="w-full h-40 md:h-80 rounded-2xl overflow-hidden shadow-sm border border-gray-200" />
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

  map = L.map(mapEl.value, {
    center: [userStore.userCoords.lat, userStore.userCoords.lon],
    zoom: 12,
    zoomControl: true,
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

  const selectedLibrary = libraryData.find(lib => lib.id === props.libraryId)
  const bounds = L.latLngBounds(
    [userStore.userCoords.lat, userStore.userCoords.lon],
    [selectedLibrary?.lat, selectedLibrary?.lon]
  )

  map.fitBounds(bounds, { padding: [20, 20] })
})

function addLibraryMarkers(L: any) {
  // Remove old markers
  markers.forEach(m => m.remove())
  markers = []

  const libIcon = L.divIcon({
    html: `<div style="
      width: 10px; height: 10px;
      background: #374151;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    "></div>`,
    className: '',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })

  const selectedLibIcon = L.divIcon({
    html: `<div style="
      width: 14px; height: 14px;
      background: #10b981;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    "></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [5, 5],
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