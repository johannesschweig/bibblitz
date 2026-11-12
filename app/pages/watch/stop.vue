<!-- Landing page of the "ausschalten" link of a shelf watch: the visit itself switches the Wecker off, no extra
  click. The call is made by this page's script, not by the request for the link, so mail scanners that only
  open links do not end a watch. The states can be previewed with ?state=gone|error. See docs/shelf-watch.md. -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useItemCacheStore } from '@/stores/itemCacheStore'
import { splitSubtitle } from '../../../utils/catalogText'
import { stopWatch } from '~/composables/useWatchApi'

// One page per link: the app keeps pages alive, and a second link (another Wecker, or another state) must not show the first one's result
definePageMeta({ key: route => route.fullPath })

// A page behind a token link: nothing for search engines
useHead({ title: 'Wecker aus – BibBlitz', meta: [{ name: 'robots', content: 'noindex' }] })

type Phase = 'working' | 'done' | 'gone' | 'error'

const route = useRoute()
const itemCache = useItemCacheStore()
const { track } = useUmami()
const token = String(route.query.token ?? '')
const mediaId = typeof route.query.id === 'string' ? route.query.id : ''
const preview = route.query.state

const phase = ref<Phase>(preview === 'gone' || preview === 'error' ? preview : 'working')

const title = computed(() => {
  const item = itemCache.items[mediaId]
  return item?.title ? splitSubtitle(item.title).main : 'diesen Titel'
})

async function stop() {
  phase.value = 'working'
  const result = await stopWatch(token)
  phase.value = !result.ok ? 'error' : result.status === 'ok' ? 'done' : 'gone'
  if (phase.value === 'done') track('watch-stop')
}

onMounted(() => {
  if (mediaId && !itemCache.items[mediaId]) itemCache.fetchDetails(mediaId).catch(() => {})
  if (phase.value === 'working') stop()
})
</script>

<template>
  <div class="space-y-6 py-4" data-testid="watch-stop">
    <p v-if="phase === 'working'" role="status" class="text-gray-600">Einen Moment …</p>

    <template v-else-if="phase === 'done'">
      <h1 class="text-2xl font-bold text-gray-900">Wecker aus</h1>
      <p class="text-gray-700">
        Deine Adresse ist gelöscht. Wir mailen dir nichts mehr zu <strong class="font-semibold">{{ title }}</strong>.
      </p>
      <NuxtLink to="/" class="btn btn-md btn-secondary">Zur Startseite</NuxtLink>
    </template>

    <template v-else-if="phase === 'gone'">
      <h1 class="text-2xl font-bold text-gray-900">Diesen Wecker gibt es nicht mehr</h1>
      <p class="text-gray-700">Er wurde schon ausgeschaltet oder ist abgelaufen. Deine Adresse ist gelöscht.</p>
      <NuxtLink to="/" class="btn btn-md btn-secondary">Zur Startseite</NuxtLink>
    </template>

    <template v-else>
      <h1 class="text-2xl font-bold text-gray-900">Hat nicht geklappt</h1>
      <p class="text-gray-700">Wir konnten den Wecker nicht ausschalten. Bitte versuche es noch einmal.</p>
      <button type="button" class="btn btn-md btn-accent" @click="stop">Erneut versuchen</button>
    </template>
  </div>
</template>
