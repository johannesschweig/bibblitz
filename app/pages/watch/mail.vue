<!-- Development only: shows the mails of the shelf watch as they would arrive, so the flow can be clicked through
  without a mail account. type=confirm is the confirmation mail the server "sent" (dev outbox, real links);
  type=alert is the Wecker-klingelt mail built from sample data. The mails are rendered from the same templates
  the server sends (utils/watchMail.ts). See docs/shelf-watch.md. -->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useItemCacheStore } from '@/stores/itemCacheStore'
import { splitSubtitle } from '../../../utils/catalogText'
import { alertMail } from '../../../utils/watchMail'

// The route exists to try the flow: in production it is a 404
if (!useWatchMock()) throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true })

useHead({ title: 'Mail-Vorschau – BibBlitz', meta: [{ name: 'robots', content: 'noindex' }] })

interface PreviewMail {
  to: string
  subject: string
  html: string
  // Where the "Abbestellen" link of a mail program would lead
  stopUrl: string
}

const route = useRoute()
const origin = useRequestURL().origin
const itemCache = useItemCacheStore()

const type = computed<'confirm' | 'alert'>(() => route.query.type === 'alert' ? 'alert' : 'confirm')
const mediaId = computed(() => typeof route.query.id === 'string' ? route.query.id : '')
const emailParam = computed(() => typeof route.query.email === 'string' ? route.query.email : '')

// The mail the server "sent" (confirmation): fetched from the dev outbox
const sent = ref<PreviewMail | null>(null)
const missing = ref(false)

async function loadSent() {
  sent.value = null
  missing.value = false
  try {
    const mail = await $fetch<{ to: string, subject: string, html: string, unsubscribeUrl?: string }>('/api/watch/dev-mail', { query: emailParam.value ? { to: emailParam.value } : {} })
    sent.value = { to: mail.to, subject: mail.subject, html: mail.html, stopUrl: (mail.unsubscribeUrl ?? '').replace('/api/watch/stop', '/watch/stop') }
  } catch {
    missing.value = true
  }
}

const title = computed(() => {
  const item = itemCache.items[mediaId.value]
  return item?.title ? splitSubtitle(item.title).main : 'Die Wartenden'
})

// The alert from sample data. Its stop link has no real watch behind it, like after a real alert: "gone"
const alertPreview = computed<PreviewMail>(() => {
  const mail = alertMail({
    title: title.value,
    libraries: [
      { name: 'Bibliothek am Wasserturm', shelfmark: 'Roman Must' },
      { name: 'Bezirkszentralbibliothek Philipp Schaeffer', shelfmark: 'Roman Must' }
    ],
    titleUrl: `${origin}/media/${mediaId.value}?ref=wecker`,
    stopUrl: `${origin}/watch/stop?token=sample&id=${mediaId.value}`
  })
  return { to: emailParam.value || 'name@beispiel.de', subject: mail.subject, html: mail.html, stopUrl: `/watch/stop?token=sample&id=${mediaId.value}` }
})

const shown = computed(() => type.value === 'alert' ? alertPreview.value : sent.value)
const mailQuery = (mail: 'confirm' | 'alert') => ({ type: mail, id: mediaId.value, email: emailParam.value })

// Links in the mail open the whole page, as a link in a real mail does
const srcdoc = computed(() => shown.value ? shown.value.html.replace('<head>', '<head><base target="_top">') : '')

function fitFrame(event: Event) {
  const frame = event.target as HTMLIFrameElement
  const doc = frame.contentDocument
  if (doc) frame.style.height = `${doc.documentElement.scrollHeight}px`
}

// Back to the confirmation from the alert: read the outbox again
watch(type, (mail) => {
  if (mail === 'confirm') loadSent()
})

onMounted(() => {
  if (mediaId.value && !itemCache.items[mediaId.value]) itemCache.fetchDetails(mediaId.value).catch(() => {})
  if (type.value === 'confirm') loadSent()
})
</script>

<template>
  <div class="space-y-4 py-2" data-testid="watch-mail">
    <!-- Switch between the two mails of the flow -->
    <div class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p class="mb-2 font-semibold">Vorschau (nur Entwicklung)</p>
      <div class="flex flex-wrap gap-x-4 gap-y-1">
        <NuxtLink :to="{ path: '/watch/mail', query: mailQuery('confirm') }" class="underline" :class="type === 'confirm' ? 'font-semibold' : ''">1. Bestätigung</NuxtLink>
        <NuxtLink :to="{ path: '/watch/mail', query: mailQuery('alert') }" class="underline" :class="type === 'alert' ? 'font-semibold' : ''">2. Wecker klingelt</NuxtLink>
      </div>
    </div>

    <p v-if="type === 'confirm' && missing" class="text-gray-700" data-testid="mail-missing">
      Noch keine Mail verschickt. Stell einen Wecker, dann erscheint die Bestätigung hier.
    </p>

    <article v-if="shown" class="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm">
        <dt class="text-gray-600">Von</dt>
        <dd class="text-gray-900">
          BibBlitz &lt;wecker@bibblitz.de&gt;
          <!-- What mail programs show next to the sender, from the List-Unsubscribe header -->
          <NuxtLink v-if="shown.stopUrl" :to="shown.stopUrl" class="link block w-fit underline" data-testid="mail-client-unsubscribe"
            title="So zeigt das Mail-Programm den Abmelde-Link an (Header List-Unsubscribe)">Abbestellen</NuxtLink>
        </dd>
        <dt class="text-gray-600">An</dt>
        <dd class="text-gray-900 wrap-anywhere" data-testid="mail-to">{{ shown.to }}</dd>
        <dt class="text-gray-600">Betreff</dt>
        <dd class="font-semibold text-gray-900 wrap-anywhere" data-testid="mail-subject">{{ shown.subject }}</dd>
      </dl>
      <iframe :srcdoc="srcdoc" title="Mail" class="block w-full border-0" style="height: 480px" data-testid="mail-frame" @load="fitFrame" />
    </article>
  </div>
</template>
