<!-- components/Showcase.vue -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useItemCacheStore } from '~/stores/itemCacheStore'
import MediaItem from '~/components/MediaItem.vue'

// Hand-picked, occasionally updated selection of popular media for the home page
const showcase = {
  ids: [
    '34112359',
    '01392424',
    '07235286'
  ]
}

const itemCacheStore = useItemCacheStore()
const { track } = useUmami()

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
      <MediaItem v-for="id in showcase.ids" :key="id" :mediaId="id" @click="trackClick(id)" />
    </ul>
  </section>
</template>
