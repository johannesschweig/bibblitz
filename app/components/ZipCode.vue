<script setup lang="ts">
import { useUserStore } from '~/stores/userStore'
import berlinZips from '~/assets/berlinZipCodes.json'

const { track } = useUmami()
const userStore = useUserStore()
const localZipInput = ref(userStore.userZip)
const editing = ref(false)
const showSuccess = ref(false)

const isValidZip = computed(() => {
  const zip = localZipInput.value.trim()
  return berlinZips.hasOwnProperty(zip)
})

const isDirty = computed(() => localZipInput.value !== userStore.userZip)
const canSave = computed(() => isValidZip.value && isDirty.value)

watch(() => userStore.userZip, (newZip) => {
  localZipInput.value = newZip
}, { immediate: true })

function saveLocation() {
  // Enter bypasses the disabled button, so check again here
  if (!canSave.value) return
  showSuccess.value = true
  setTimeout(() => {
    showSuccess.value = false
    const saved = userStore.saveLocation(localZipInput.value)
    editing.value = false
    if (saved) track('zip-save', { query: localZipInput.value.substring(0, 4) + 'X' })
  }, 2000)
}
</script>

<template>
  <div class="border  p-2 rounded-lg flex items-center transition-all duration-300" :class="showSuccess ? 'bg-emerald-50 border-emerald-300': 'bg-white border-gray-200'">
    <div v-if="showSuccess"
      class="w-full flex items-center gap-1 text-emerald-700  text-sm py-1 min-h-12">
      <Icon name="lucide:check" class="size-6" />
      <span class="font-bold">{{ localZipInput}}</span>
      <span>{{ (berlinZips as any)[localZipInput]?.district }} gespeichert.</span>
    </div>

    <div v-else class="w-full">
      <div class="grid grid-cols-[auto_1fr_auto] gap-x-3 items-center w-full p-1">
        <div class="p-2.5 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
          <Icon name="lucide:locate-fixed" class="size-5 text-blue-800" />
        </div>

        <div class="flex flex-col min-w-0 justify-center">
          <span class="font-bold text-gray-500 text-[10px] uppercase tracking-wider mb-0.5">
            Dein Stammbezirk
          </span>
          <p class="text-sm md:text-base truncate">
            <span :class="userStore.userZipDefault ? 'text-gray-600 italic' : 'font-bold text-blue-700'">
              {{ userStore.userZip }}
              {{ userStore.userZipDefault ? '(Standardwert)' : `(${(berlinZips as any)[userStore.userZip]?.district})`
              }}
            </span>
          </p>
        </div>

        <button @click="editing = !editing" class="btn btn-sm btn-secondary">
          <Icon v-if="editing" name="lucide:chevron-up" class="size-4" />
          <span v-else>Ändern</span>
        </button>
      </div>

      <div v-if="editing" class="flex flex-col gap-2 mt-2 px-1">
        <p class="text-xs text-gray-500">Gib deine PLZ ein, um Bibliotheken in deiner Nähe zu finden.</p>
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <input v-model="localZipInput" type="text" placeholder="z.B. 10559" @keyup.enter="saveLocation"
              inputmode="numeric" maxlength="5"
              class="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-center font-bold placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
            <span v-if="isValidZip" class="text-sm text-gray-600 font-medium">
              {{ (berlinZips as any)[localZipInput.trim()]?.district }}
            </span>
          </div>
          <button @click="saveLocation" :disabled="!canSave" class="btn btn-md md:self-start"
            :class="canSave ? 'btn-primary' : 'btn-secondary'">
            Speichern
          </button>
        </div>
      </div>
    </div>

  </div>
</template>