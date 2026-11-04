<script setup lang="ts">
// Placeholder rows with the same boxes as MediaItem.vue (cover, eyebrow, title, meta line, availability pill),
// so the list does not jump when results arrive. Keep both in sync when the row layout changes.
defineProps<{ count?: number }>()
</script>

<template>
  <ul class="space-y-2" aria-hidden="true">
    <li v-for="n in count ?? 5" :key="n" class="bg-white border border-gray-200 rounded-xl shadow-sm animate-pulse">
      <div class="p-2 md:p-3 flex gap-3 min-w-0">
        <div data-testid="skeleton-cover" class="shrink-0 w-14 h-20 md:w-16 md:h-24 rounded bg-gray-100"></div>
        <div class="flex flex-col min-w-0 flex-1">
          <!-- Each bar sits in a box as high as the text line it stands for -->
          <div class="h-4 mb-1 flex items-center"><div class="h-3 w-20 rounded bg-gray-100"></div></div>
          <div class="h-[19px] md:h-[22px] mb-1 flex items-center"><div class="h-4 w-3/4 rounded bg-gray-200"></div></div>
          <div class="h-4 md:h-5 mb-2 flex items-center"><div class="h-3 w-1/2 rounded bg-gray-100"></div></div>
          <div class="h-6 w-36 rounded-full bg-gray-100"></div>
        </div>
      </div>
    </li>
  </ul>
</template>
