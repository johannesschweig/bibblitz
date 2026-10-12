<script setup>
import { useUserStore } from '~/stores/userStore'
import { useMediaStore } from '#imports'

const userStore = useUserStore()
const mediaStore = useMediaStore()
</script>

<template>
  <nav class="sticky top-0 z-900 border-b border-gray-100 bg-white/80 backdrop-blur-md">
    <div class="mx-auto flex max-w-7xl justify-between px-4 py-3 sm:px-6">

      <NuxtLink to="/" @click="mediaStore.clearSearch()"
        class="text-xl font-black tracking-tight text-gray-900 hover:opacity-80 transition-opacity">
        BibBlitz
      </NuxtLink>

      <div class="flex gap-2 sm:gap-3">
        <NuxtLink :to="mediaStore.lastQuery ? `/?q=${encodeURIComponent(mediaStore.lastQuery)}` : '/'"
          class="flex gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-all" inactive-class="text-gray-700"
          active-class="bg-blue-100 text-blue-700">
          <Icon name="lucide:search" class="size-4 mt-0.5" />
          <span>Suche</span>
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>