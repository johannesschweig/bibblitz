<!-- Fullscreen filter page. Both filters are applied by VÖBB (a new search), so "Anwenden" always searches again. -->
<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { LANGUAGE_OPTIONS, MEDIA_TYPE_OPTIONS } from '../../utils/filterOptions'

const props = defineProps<{
  open: boolean
  selectedLanguages: string[]
  selectedMediaTypes: string[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'apply', value: { languages: string[]; mediaTypes: string[] }): void
}>()

const { track } = useUmami()

// Changes are only a draft until "Anwenden"; "Schließen" drops them
const draftLanguages = ref<string[]>([])
const draftMediaTypes = ref<string[]>([])
const dialog = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

const hasDraft = computed(() => draftLanguages.value.length + draftMediaTypes.value.length > 0)

function lockScroll(locked: boolean) {
  if (import.meta.client) document.body.style.overflow = locked ? 'hidden' : ''
}

watch(
  () => props.open,
  async (open) => {
    lockScroll(open)
    if (!open) return
    draftLanguages.value = [...props.selectedLanguages]
    draftMediaTypes.value = [...props.selectedMediaTypes]
    await nextTick()
    closeButton.value?.focus()
  },
  { immediate: true }
)
onBeforeUnmount(() => lockScroll(false))

// One value per group: a second click on the selected chip clears it, another chip replaces it
function pick(list: string[], value: string): string[] {
  return list.includes(value) ? [] : [value]
}

function reset() {
  draftLanguages.value = []
  draftMediaTypes.value = []
  track('filter-reset')
}

function apply() {
  emit('apply', { languages: [...draftLanguages.value], mediaTypes: [...draftMediaTypes.value] })
}

// The page covers the screen, so Tab must not leave it for the page behind
function trapTab(event: KeyboardEvent) {
  const focusable = dialog.value?.querySelectorAll<HTMLElement>('button:not([disabled])')
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

const chipBase = 'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
const chipOn = 'bg-blue-100 text-blue-950 border-blue-200'
const chipOff = 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
</script>

<template>
  <div v-if="open" ref="dialog" role="dialog" aria-modal="true" aria-labelledby="filter-title"
    class="fixed inset-0 z-1000 bg-white" @keydown.esc="emit('close')" @keydown.tab="trapTab">
    <div class="mx-auto flex h-full w-full max-w-2xl flex-col">
      <header class="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
        <h2 id="filter-title" class="text-xl font-bold text-gray-900">Filter</h2>
        <button ref="closeButton" type="button" class="btn btn-sm btn-secondary" @click="emit('close')">
          <Icon name="lucide:x" class="size-4" />
          Schließen
        </button>
      </header>

      <div class="flex-1 space-y-8 overflow-y-auto px-4 py-6 sm:px-6">
        <!-- Fixed lists without counts: VÖBB's counts include rows BibBlitz hides (e-media, box sets) and merged types, so they never match the list -->
        <section aria-labelledby="filter-language">
          <h3 id="filter-language" class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Sprache</h3>
          <div class="flex flex-wrap gap-2">
            <button v-for="option in LANGUAGE_OPTIONS" :key="option" type="button"
              :aria-pressed="draftLanguages.includes(option)"
              :class="[chipBase, draftLanguages.includes(option) ? chipOn : chipOff]"
              @click="draftLanguages = pick(draftLanguages, option)">
              <Icon v-if="draftLanguages.includes(option)" name="lucide:check" class="size-4" />
              {{ option }}
            </button>
          </div>
        </section>

        <section aria-labelledby="filter-media-type">
          <h3 id="filter-media-type" class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Medienart</h3>
          <div class="flex flex-wrap gap-2">
            <button v-for="option in MEDIA_TYPE_OPTIONS" :key="option" type="button"
              :aria-pressed="draftMediaTypes.includes(option)"
              :class="[chipBase, draftMediaTypes.includes(option) ? chipOn : chipOff]"
              @click="draftMediaTypes = pick(draftMediaTypes, option)">
              <Icon v-if="draftMediaTypes.includes(option)" name="lucide:check" class="size-4" />
              {{ option }}
            </button>
          </div>
        </section>
      </div>

      <footer class="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
        <button type="button" class="btn btn-md btn-secondary" :disabled="!hasDraft" @click="reset">
          Zurücksetzen
        </button>
        <button type="button" class="btn btn-md btn-accent flex-1" @click="apply">
          Anwenden
        </button>
      </footer>
    </div>
  </div>
</template>
