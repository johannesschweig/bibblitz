<!-- components/Showcase.vue -->
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useItemCacheStore } from '~/stores/itemCacheStore'
import MediaItem from '~/components/MediaItem.vue'

// Hand-picked, occasionally updated selection of popular media for the home page
const showcase = {
  ids: [
    '34112359',
    '01392424',
    '07235286',
    '34971091',
    '35168840',
    '00224031',
    '06115009'
  ]
}

const itemCacheStore = useItemCacheStore()
const { track } = useUmami()

const INITIAL_COUNT = 3
const expanded = ref(false)
const visibleIds = computed(() => expanded.value ? showcase.ids : showcase.ids.slice(0, INITIAL_COUNT))

// Load sequentially instead of in parallel – VÖBB responds unreliably
// to many concurrent requests (timeouts/rate limiting).
async function loadShowcase() {
  for (const id of showcase.ids) {
    await itemCacheStore.fetchDetails(id)
  }
  // Retry failed requests once
  const missing = showcase.ids.filter(id => !itemCacheStore.items[id]?.title)
  for (const id of missing) {
    await itemCacheStore.fetchDetails(id)
  }
}

onMounted(() => {
  loadShowcase()
})

function trackClick(id: string) {
  track('showcase-click', { id })
}
</script>

<template>
  <section>
    <p class="text-xs font-medium text-gray-500 uppercase tracking-widest mb-4">
      Beliebt bei BibBlitz
    </p>
    <ul class="space-y-2">
      <MediaItem v-for="id in visibleIds" :key="id" :mediaId="id" @click="trackClick(id)" />
    </ul>
    <button v-if="!expanded && showcase.ids.length > INITIAL_COUNT" type="button" @click="expanded = true"
      class="btn btn-sm btn-secondary mt-3">
      Mehr anzeigen
    </button>
  </section>
</template>
