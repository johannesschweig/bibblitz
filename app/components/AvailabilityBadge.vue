<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useItemCacheStore } from '~/stores/itemCacheStore'
import { useUserStore } from '~/stores/userStore'
import { calculateStatusInfo } from '../../utils/availability'

const props = defineProps({
  mediaId: { type: String, required: true }
})

const itemCacheStore = useItemCacheStore()
const userStore = useUserStore()
const targetElement = ref(null)
let observer = null

// Reaktiv an den zentralen Cache binden
const itemData = computed(() => itemCacheStore.items[props.mediaId])
const isPending = ref(false)

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !itemData.value?.availability) {
      isPending.value = true
      // Ask the central cache store
      itemCacheStore.fetchDetails(props.mediaId).finally(() => {
        isPending.value = false
      })
      observer.disconnect()
    }
  }, { rootMargin: '50px' }) // Load 50px early so it feels smoother

  if (targetElement.value) observer.observe(targetElement.value)
})

onUnmounted(() => { if (observer) observer.disconnect() })

const statusInfo = computed(() => calculateStatusInfo(itemData.value?.availability, userStore.userCoords, userStore.userZipDefault))
</script>

<template>
  <div ref="targetElement" class="flex items-center min-h-6">
    <div v-if="isPending" class="flex items-center gap-2 animate-pulse">
      <div class="h-5 w-36 bg-gray-200 rounded-full"></div>
      <span class="text-xs text-gray-400">Prüfe Verfügbarkeit...</span>
    </div>

    <div v-else-if="itemData?.availability" class="flex items-center gap-2">
      <StatusPill :tone="statusInfo.tone" :label="statusInfo.label" />
    </div>
  </div>
</template>