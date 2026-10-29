<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMediaStore } from '#imports'

const route = useRoute()
const router = useRouter()
const mediaStore = useMediaStore()
const { track } = useUmami()

// The home page has nothing to go back to
const showBack = computed(() => route.path !== '/')

// Where the click happened, for the events
const page = computed(() => {
  if (route.path === '/') return 'home'
  if (route.path.startsWith('/media/')) return 'detail'
  if (route.path.startsWith('/library/')) return 'library'
  return 'other'
})

// Arrived from Google or a shared link: there is no previous page of ours, so go to the next best place.
// A shared library link carries ?media=<id>, the book the sender was after beats the home page.
const fallback = computed(() => {
  const media = route.query.media
  return page.value === 'library' && typeof media === 'string' ? `/media/${media}` : '/'
})

function goBack() {
  const hasHistory = !!window.history.state?.back
  track('back-click', { from: page.value, had_history: hasHistory ? 1 : 0 })
  if (hasHistory) router.back()
  else router.push(fallback.value)
}

// Measures whether people use the logo as "back": it clears the results (had_results) on purpose
function logoClicked() {
  track('logo-click', { from: page.value, had_results: mediaStore.searchIds.length ? 1 : 0 })
  mediaStore.clearSearch()
}
</script>

<template>
  <nav class="sticky top-0 z-900 border-b border-gray-100 bg-white/80 backdrop-blur-md">
    <!-- Three columns keep the logo in the middle whether or not the back button is shown -->
    <div class="mx-auto grid max-w-2xl grid-cols-[1fr_auto_1fr] items-center px-4 py-3 sm:px-6">
      <div>
        <!-- -my / -ml: 40 px tap target without making the bar taller, icon aligned with the page content -->
        <button v-if="showBack" type="button" class="btn btn-text btn-md -my-2 -ml-3 px-3" @click="goBack">
          <Icon name="lucide:arrow-left" class="size-4" />
          Zurück
        </button>
      </div>

      <NuxtLink to="/" @click="logoClicked()"
        class="text-xl font-black tracking-tight text-gray-900 hover:opacity-80 transition-opacity">
        BibBlitz
      </NuxtLink>
    </div>
  </nav>
</template>
