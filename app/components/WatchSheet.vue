<!-- Fullscreen sheet for the shelf watch: pick the libraries, give an e-mail address, get one mail once a
  copy is free there. The API is server/api/watch/ (composables/useWatchApi.ts). See docs/shelf-watch.md. -->
<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount, onActivated, onDeactivated } from 'vue'
import { calculateBranchStatus, splitLibraryName } from '../../utils/availability'
import { formatDistance } from '../../utils/distance'
import { splitSubtitle } from '../../utils/catalogText'
import { nearLibraryIds, defaultWatchSelection, isValidEmail, type WatchLibrary } from '../../utils/watch'
import { subscribeToWatch } from '~/composables/useWatchApi'

const props = defineProps<{
  open: boolean
  mediaId: string
  title: string
  // The libraries to wait for: the ones with a free copy are left out by the page, there is nothing to wait for
  libraries: WatchLibrary[]
  zipDefault: boolean
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const isDev = useWatchMock()
const { track } = useUmami()

const selected = ref<string[]>([])
const email = ref('')
// Honeypot: hidden from people, bots fill it and get a fake success
const website = ref('')
const consent = ref(false)
const phase = ref<'form' | 'sending' | 'sent'>('form')
const errors = reactive({ libraries: '', email: '', consent: '', form: '' })

const dialog = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

const nearIds = computed(() => nearLibraryIds(props.libraries))
const mainTitle = computed(() => splitSubtitle(props.title).main)
const sentLibraries = computed(() => props.libraries.filter(library => selected.value.includes(library.libraryId)))

const countText = computed(() => {
  const n = selected.value.length
  return n === 0 ? 'Keine gewählt' : `${n} gewählt`
})

function lockScroll(locked: boolean) {
  if (import.meta.client) document.body.style.overflow = locked ? 'hidden' : ''
}

watch(
  () => props.open,
  async (open) => {
    lockScroll(open)
    if (!open) return
    email.value = ''
    website.value = ''
    consent.value = false
    phase.value = 'form'
    Object.assign(errors, { libraries: '', email: '', consent: '', form: '' })
    selected.value = defaultWatchSelection(props.libraries, props.zipDefault)
    await nextTick()
    closeButton.value?.focus()
  },
  { immediate: true }
)

// The error is about an empty selection: any later selection clears it
watch(selected, (ids) => {
  if (ids.length > 0) errors.libraries = ''
})

// The detail page stays alive behind other pages (keepalive): do not leave the page locked, and
// close the sheet, so the way back does not land in a stale one
onDeactivated(() => {
  lockScroll(false)
  if (props.open) emit('close')
})
onActivated(() => lockScroll(props.open))
onBeforeUnmount(() => lockScroll(false))

function choose(ids: string[]) {
  selected.value = ids
  errors.libraries = ''
}

function validate(): boolean {
  errors.libraries = selected.value.length === 0 ? 'Wähle mindestens eine Bibliothek.' : ''
  errors.email = isValidEmail(email.value) ? '' : 'Das ist keine gültige Adresse.'
  errors.consent = consent.value ? '' : 'Bitte stimme zu.'
  errors.form = ''
  return !errors.libraries && !errors.email && !errors.consent
}

async function submit() {
  if (phase.value === 'sending') return
  if (!validate()) {
    await nextTick()
    dialog.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }
  phase.value = 'sending'
  const result = await subscribeToWatch({
    mediaId: props.mediaId,
    libraryIds: [...selected.value],
    email: email.value.trim(),
    website: website.value
  })
  if (result.ok) {
    // Measures whether the preselection is what people want (docs/shelf-watch.md)
    const preselected = defaultWatchSelection(props.libraries, props.zipDefault)
    track('watch-submit', {
      libraries: selected.value.length,
      preselected_unchanged: preselected.length === selected.value.length && preselected.every(id => selected.value.includes(id)) ? 1 : 0,
      zip_default: props.zipDefault ? 1 : 0
    })
    phase.value = 'sent'
    await nextTick()
    closeButton.value?.focus()
    return
  }
  phase.value = 'form'
  errors.form = result.reason === 'rate'
    ? 'Zu viele Versuche. Kurz warten.'
    : 'Hat nicht geklappt. Nochmal?'
}

// The sheet covers the screen, so Tab must not leave it for the page behind
function trapTab(event: KeyboardEvent) {
  const focusable = dialog.value?.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), a[href], [tabindex]:not([tabindex="-1"])'
  )
  if (!focusable?.length) return
  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const inputBase = 'w-full rounded-xl border bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-500 outline-none transition-colors focus:ring-2'
</script>

<template>
  <div v-if="open" ref="dialog" role="dialog" aria-modal="true" aria-labelledby="watch-title"
    class="fixed inset-0 z-1000 bg-white" @keydown.esc="emit('close')" @keydown.tab="trapTab">
    <div class="mx-auto flex h-full w-full max-w-2xl flex-col">
      <header class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-6">
        <h2 id="watch-title" class="text-xl font-bold text-gray-900">
          {{ phase === 'sent' ? 'Fast da' : 'Wecker stellen' }}
        </h2>
        <button ref="closeButton" type="button" class="btn btn-sm btn-secondary shrink-0" @click="emit('close')">
          <Icon name="lucide:x" class="size-4" />
          Schließen
        </button>
      </header>

      <!-- Sent -->
      <div v-if="phase === 'sent'" class="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6" data-testid="watch-sent">
        <div class="flex items-start gap-3">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <Icon name="lucide:mail-check" class="text-2xl" />
          </div>
          <p class="text-base text-gray-900">
            Bestätigungsmail an <strong class="font-semibold wrap-anywhere">{{ email.trim() }}</strong> ist raus.
            Link anklicken, dann läuft der Wecker.
          </p>
        </div>

        <section aria-labelledby="watch-sent-libraries">
          <h3 id="watch-sent-libraries" class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Der Wecker gilt für</h3>
          <p class="mb-2 text-sm text-gray-700 wrap-anywhere">{{ mainTitle }}</p>
          <ul class="divide-y divide-gray-200 rounded-xl border border-gray-200">
            <li v-for="library in sentLibraries" :key="library.libraryId" class="px-3 py-2.5 text-sm text-gray-900">
              {{ splitLibraryName(library.libraryName).name }}
            </li>
          </ul>
        </section>

        <!-- Only while the mails are mocked: the way into the mail that would arrive now -->
        <section v-if="isDev" class="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-testid="watch-mail-preview">
          <p class="font-semibold">Vorschau (nur Entwicklung)</p>
          <p>Hier käme jetzt die Mail an.</p>
          <NuxtLink :to="{ path: '/watch/mail', query: { type: 'confirm', id: mediaId, email: email.trim().toLowerCase() } }"
            class="btn btn-md btn-accent">
            <Icon name="lucide:mail-open" class="size-4" />
            Mail öffnen
          </NuxtLink>
        </section>
      </div>

      <!-- Form -->
      <form v-else class="flex min-h-0 flex-1 flex-col" novalidate @submit.prevent="submit">
        <div class="flex-1 space-y-8 overflow-y-auto px-4 py-6 sm:px-6">
          <div class="space-y-1">
            <p class="font-semibold text-gray-900 wrap-anywhere">{{ mainTitle }}</p>
            <p class="text-sm text-gray-600">
              Wir mailen dir einmal, sobald es in deinen Bibliotheken verfügbar ist.
            </p>
          </div>

          <fieldset class="space-y-3">
            <legend class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Welche Bibliotheken?</legend>

            <div class="flex flex-wrap gap-2">
              <button v-if="!zipDefault" type="button" class="btn btn-sm btn-secondary" :disabled="nearIds.length === 0"
                @click="choose(nearIds)">In meiner Nähe</button>
              <button type="button" class="btn btn-sm btn-secondary" @click="choose(libraries.map(l => l.libraryId))">Alle</button>
              <button type="button" class="btn btn-sm btn-secondary" @click="choose([])">Keine</button>
            </div>

            <ul class="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200">
              <li v-for="(library, index) in libraries" :key="library.libraryId">
                <label class="grid cursor-pointer grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 px-3 py-3.5 hover:bg-gray-50 sm:grid-cols-[auto_1fr_auto]">
                  <input v-model="selected" type="checkbox" :value="library.libraryId"
                    :aria-invalid="errors.libraries && index === 0 ? 'true' : undefined"
                    :aria-describedby="errors.libraries ? 'watch-libraries-error' : undefined"
                    class="row-span-2 mt-0.5 size-5 shrink-0 self-start accent-blue-600 sm:row-span-1 sm:mt-0 sm:self-center" @change="errors.libraries = ''">
                  <span class="min-w-0">
                    <span class="block font-medium text-gray-900 wrap-anywhere">{{ splitLibraryName(library.libraryName).name }}</span>
                    <!-- Distances are meaningless while the default ZIP is in use -->
                    <span v-if="library.distance !== undefined && !zipDefault" class="block text-sm text-gray-600">{{ formatDistance(library.distance) }}</span>
                  </span>
                  <StatusPill class="col-start-2 justify-self-start sm:col-start-3 sm:justify-self-end"
                    v-bind="calculateBranchStatus(library.best, zipDefault)" />
                </label>
              </li>
            </ul>

            <p class="text-sm text-gray-600" aria-live="polite" data-testid="watch-count">{{ countText }}</p>
            <p v-if="errors.libraries" id="watch-libraries-error" role="alert" class="text-sm text-red-700">{{ errors.libraries }}</p>
          </fieldset>

          <div class="space-y-4">
            <div class="space-y-1.5">
              <label for="watch-email" class="block text-sm font-semibold text-gray-900">E-Mail</label>
              <input id="watch-email" v-model="email" type="email" inputmode="email" autocomplete="email"
                placeholder="name@beispiel.de" :aria-invalid="errors.email ? 'true' : undefined"
                :aria-describedby="errors.email ? 'watch-email-error' : undefined" :class="[inputBase, errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100']"
                @input="errors.email = ''">
              <p v-if="errors.email" id="watch-email-error" role="alert" class="text-sm text-red-700">{{ errors.email }}</p>
            </div>

            <div class="space-y-1.5">
              <label class="flex cursor-pointer items-start gap-3">
                <input v-model="consent" type="checkbox" :aria-invalid="errors.consent ? 'true' : undefined"
                  :aria-describedby="errors.consent ? 'watch-consent-error' : undefined" class="mt-0.5 size-5 shrink-0 accent-blue-600" @change="errors.consent = ''">
                <span class="text-sm text-gray-700">
                  Ich möchte einmalig per E-Mail benachrichtigt werden. Danach wird meine Adresse gelöscht.
                  <NuxtLink to="/data-privacy" target="_blank" class="link underline">Datenschutz</NuxtLink>
                </span>
              </label>
              <p v-if="errors.consent" id="watch-consent-error" role="alert" class="text-sm text-red-700">{{ errors.consent }}</p>
            </div>
          </div>
        </div>

        <!-- Honeypot: off screen, out of the tab order and hidden from screen readers -->
        <div class="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
          <label>Website <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off"></label>
        </div>

        <footer class="space-y-3 border-t border-gray-200 px-4 py-4 sm:px-6">
          <p v-if="errors.form" role="alert" class="text-sm text-red-700" data-testid="watch-form-error">{{ errors.form }}</p>
          <button type="submit" class="btn btn-md btn-accent w-full" :disabled="phase === 'sending'">
            {{ phase === 'sending' ? 'Wird gestellt …' : 'Wecker stellen' }}
          </button>
        </footer>
      </form>
    </div>
  </div>
</template>
