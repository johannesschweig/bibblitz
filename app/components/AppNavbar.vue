<script setup>
import { useUserStore } from '~/stores/userStore'
import { useMediaStore } from '#imports'

const userStore = useUserStore()
const mediaStore = useMediaStore()
</script>

<template>
  <nav class="sticky top-0 z-900 border-b border-gray-100 bg-white/80 backdrop-blur-md">
    <div class="mx-auto flex max-w-2xl justify-between px-4 py-3 sm:px-6">

      <NuxtLink to="/" @click="mediaStore.clearSearch()"
        class="text-xl font-black tracking-tight text-gray-900 hover:opacity-80 transition-opacity">
        BibBlitz
      </NuxtLink>
    </div>
  </nav>
</template>