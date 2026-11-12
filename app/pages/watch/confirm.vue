<!-- Landing page of the link in the confirmation mail of a shelf watch: the visit itself confirms, no extra
  click. The call is made by this page's script, not by the request for the link, so mail scanners that only
  open links do not confirm for the visitor. The states can be previewed
  with ?state=active|expired|error. See docs/shelf-watch.md. -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useItemCacheStore } from '@/stores/itemCacheStore'
import { splitSubtitle } from '../../../utils/catalogText'
import { confirmWatch } from '~/composables/useWatchApi'

// One page per link: the app keeps pages alive, and a second link (another Wecker, or another state) must not show the first one's result
definePageMeta({ key: route => route.fullPath })

// A page behind a token link: nothing for search engines
useHead({ title: 'Wecker – BibBlitz', meta: [{ name: 'robots', content: 'noindex' }] })

type Phase = 'working' | 'done' | 'active' | 'expired' | 'error'

const route = useRoute()
const itemCache = useItemCacheStore()
const { track } = useUmami()
const isDev = useWatchMock()
const token = String(route.query.token ?? '')
const mediaId = typeof route.query.id === 'string' ? route.query.id : ''
const count = Number(route.query.n) || 0
const preview = route.query.state

const phase = ref<Phase>(preview === 'active' || preview === 'expired' || preview === 'error' ? preview : 'working')

const title = computed(() => {
  const item = itemCache.items[mediaId]
  return item?.title ? splitSubtitle(item.title).main : 'dein Titel'
})
const libraries = computed(() => count === 1 ? 'in deiner Bibliothek' : count > 1 ? `in einer deiner ${count} Bibliotheken` : 'in einer deiner Bibliotheken')

async function confirm() {
  phase.value = 'working'
  const result = await confirmWatch(token)
  phase.value = !result.ok ? 'error' : result.status === 'ok' ? 'done' : result.status
  // The Wecker is switched on: the return visit from the mail (docs/shelf-watch.md)
  if (phase.value === 'done') track('watch-confirm')
}

onMounted(() => {
  if (mediaId && !itemCache.items[mediaId]) itemCache.fetchDetails(mediaId).catch(() => {})
  if (phase.value === 'working') confirm()
})
</script>

<template>
  <div class="space-y-6 py-4" data-testid="watch-confirm">
    <p v-if="phase === 'working'" role="status" class="text-gray-600">Einen Moment …</p>

    <template v-else-if="phase === 'done'">
      <div class="flex items-center gap-3">
        <div class="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
          <Icon name="lucide:alarm-clock-check" class="text-2xl" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Wecker läuft</h1>
      </div>
      <p class="text-gray-700">
        Wir mailen dir, sobald <strong class="font-semibold">{{ title }}</strong> {{ libraries }} verfügbar ist.
      </p>
      <div class="flex flex-wrap gap-3">
        <NuxtLink v-if="mediaId" :to="`/media/${mediaId}`" class="btn btn-md btn-secondary">Zum Titel</NuxtLink>
        <NuxtLink :to="{ path: '/watch/stop', query: { token, id: mediaId } }" class="btn btn-md btn-secondary">Ausschalten</NuxtLink>
      </div>

      <!-- Only while the mails are mocked: jump to the mail the Wecker sends later -->
      <section v-if="isDev" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-testid="watch-mail-preview">
        <p class="mb-2 font-semibold">Vorschau (nur Entwicklung)</p>
        <p class="mb-2">Später klingelt der Wecker. So sieht die Mail aus:</p>
        <NuxtLink :to="{ path: '/watch/mail', query: { type: 'alert', id: mediaId, n: count } }" class="underline">Mail „Wecker klingelt“ öffnen</NuxtLink>
      </section>
    </template>

    <template v-else-if="phase === 'active'">
      <h1 class="text-2xl font-bold text-gray-900">Dieser Wecker läuft schon</h1>
      <p class="text-gray-700">Du hast ihn schon bestätigt. Wir mailen dir, sobald ein Exemplar verfügbar ist.</p>
      <NuxtLink v-if="mediaId" :to="`/media/${mediaId}`" class="btn btn-md btn-secondary">Zum Titel</NuxtLink>
      <NuxtLink v-else to="/" class="btn btn-md btn-secondary">Zur Startseite</NuxtLink>
    </template>

    <template v-else-if="phase === 'expired'">
      <h1 class="text-2xl font-bold text-gray-900">Der Link ist abgelaufen</h1>
      <p class="text-gray-700">Stell den Wecker einfach neu.</p>
      <NuxtLink v-if="mediaId" :to="`/media/${mediaId}`" class="btn btn-md btn-accent">Zum Titel</NuxtLink>
      <NuxtLink v-else to="/" class="btn btn-md btn-accent">Zur Startseite</NuxtLink>
    </template>

    <template v-else>
      <h1 class="text-2xl font-bold text-gray-900">Hat nicht geklappt</h1>
      <p class="text-gray-700">Wir konnten den Wecker nicht bestätigen. Bitte versuche es noch einmal.</p>
      <button type="button" class="btn btn-md btn-accent" @click="confirm">Erneut versuchen</button>
    </template>
  </div>
</template>
