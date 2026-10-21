<script setup lang="ts">
import libraryData from '~/assets/libraries.json'
import { groupLibraries } from '~~/utils/libraryGroups'

useHead({
  title: 'Alle Bibliotheken – BibBlitz',
  meta: [{ name: 'description', content: 'Alle Standorte der Berliner öffentlichen Bibliotheken (VÖBB) mit Adresse, Öffnungs- und Servicezeiten.' }]
})

const groups = groupLibraries(libraryData)
</script>

<template>
  <div class="font-sans text-gray-800">
    <header class="mb-10">
      <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{{ libraryData.length }} Standorte</p>
      <h1 class="text-3xl md:text-4xl font-bold leading-tight tracking-tight text-gray-900">Alle Bibliotheken</h1>
      <p class="mt-3 text-gray-600">Die Standorte des VÖBB mit Adresse, Öffnungs- und Servicezeiten.</p>
    </header>

    <section v-for="group in groups" :key="group.title" class="mb-10">
      <h2 class="text-xl font-bold mb-2">{{ group.title }}</h2>
      <ul class="divide-y divide-gray-200 border-y border-gray-200">
        <li v-for="lib in group.libraries" :key="lib.id">
          <NuxtLink :to="`/library/${lib.id}`"
            class="flex items-center justify-between gap-3 py-3 hover:bg-gray-50 active:bg-gray-50">
            <div class="min-w-0">
              <h3 class="font-medium text-gray-900 wrap-anywhere">{{ lib.name }}</h3>
              <p v-if="lib.address" class="mt-0.5 text-sm text-gray-600 wrap-anywhere">{{ lib.address }}</p>
            </div>
            <Icon name="lucide:chevron-right" class="size-4 shrink-0 text-gray-500" />
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
