<script setup lang="ts">
// Placeholder rows with the same grid as MediaItem.vue, so the list does not jump when results arrive
defineProps<{ count?: number }>()
</script>

<template>
  <ul class="space-y-2" aria-hidden="true">
    <li v-for="n in count ?? 5" :key="n" class="bg-white border border-gray-200 rounded-xl shadow-sm animate-pulse">
      <div class="p-2 md:p-3 grid grid-cols-[52px_1fr] md:grid-cols-[72px_1fr] gap-3">
        <div class="m-1 md:m-2 size-10 md:size-12 rounded-lg bg-gray-200"></div>
        <div class="flex flex-col min-w-0">
          <div class="h-4 md:h-5 w-3/4 rounded bg-gray-200 mb-2"></div>
          <div class="h-3 md:h-4 w-1/2 rounded bg-gray-100 mb-3"></div>
          <div class="h-6 w-36 rounded-full bg-gray-100"></div>
        </div>
      </div>
    </li>
  </ul>
</template>
