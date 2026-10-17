<script setup lang="ts">
import { useVoebbStatusStore } from '~/stores/voebbStatusStore'

const status = useVoebbStatusStore()
const route = useRoute()

// Only where VÖBB data is needed; library pages, imprint etc. work without it
const relevant = computed(() => route.path === '/' || route.path.startsWith('/media/'))
</script>

<template>
  <div v-if="status.maintenance && relevant" role="status"
    class="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
    <Icon name="lucide:wrench" class="mt-0.5 size-4 shrink-0" />
    <div>
      <p class="font-semibold">Der VÖBB-Katalog ist gerade in Wartung</p>
      <p class="mt-1">
        Suche und Verfügbarkeit sind
        <template v-if="status.until">bis {{ status.until }}</template>
        <template v-else>vorübergehend</template>
        nicht möglich.
      </p>
    </div>
  </div>
</template>
