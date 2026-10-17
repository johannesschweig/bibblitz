<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useItemCacheStore } from '~/stores/itemCacheStore'
import { useUserStore } from '~/stores/userStore'
import { useVoebbStatusStore } from '~/stores/voebbStatusStore'
import { calculateStatusInfo } from '../../utils/availability'

const props = defineProps({
  mediaId: { type: String, required: true }
})

const itemCacheStore = useItemCacheStore()
const userStore = useUserStore()
const voebbStatus = useVoebbStatusStore()
const targetElement = ref(null)
let observer = null

// Reaktiv an den zentralen Cache binden
const itemData = computed(() => itemCacheStore.items[props.mediaId])
const failed = ref(false)

function load() {
  failed.value = false
  // Ask the central cache store
  itemCacheStore.fetchDetails(props.mediaId)
    .catch(() => {})
    .finally(() => {
      failed.value = !itemData.value?.availability
    })
}

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !itemData.value?.availability) {
      load()
      observer.disconnect()
    }
  }, { rootMargin: '50px' }) // Load 50px early so it feels smoother

  if (targetElement.value) observer.observe(targetElement.value)
})

onUnmounted(() => { if (observer) observer.disconnect() })

const statusInfo = computed(() => calculateStatusInfo(itemData.value?.availability, userStore.userCoords, userStore.userZipDefault))
</script>

<template>
  <div ref="targetElement" class="flex items-center">
    <div v-if="itemData?.availability" class="flex items-center gap-2">
      <StatusPill :tone="statusInfo.tone" :label="statusInfo.label" />
    </div>

    <!-- VÖBB is switched off: a retry cannot work, the banner on the page says until when -->
    <span v-else-if="failed && voebbStatus.maintenance" class="inline-flex items-center gap-1.5 h-6 text-xs text-gray-500">
      <Icon name="lucide:wrench" class="size-3.5" />
      Verfügbarkeit während der VÖBB-Wartung nicht abrufbar
    </span>

    <!-- Details could not be loaded (e.g. VÖBB timeout): say so and offer a retry instead of leaving a gap -->
    <button v-else-if="failed" type="button" class="inline-flex items-center gap-1.5 h-6 text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
      @click.prevent="load()">
      <Icon name="lucide:circle-alert" class="size-3.5" />
      Verfügbarkeit nicht abrufbar · Erneut versuchen
    </button>

    <!-- Not fetched yet or in flight: same height as the pill, so the row does not jump -->
    <div v-else class="h-6 w-36 rounded-full bg-gray-100 animate-pulse"></div>
  </div>
</template>
