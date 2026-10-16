<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isTrackingDisabled = ref(false)

// Check the current status on this device
onMounted(() => {
  isTrackingDisabled.value = localStorage.getItem('umami.disabled') === '1'
})

function toggleTracking() {
  if (isTrackingDisabled.value) {
    // Re-enable tracking
    localStorage.removeItem('umami.disabled')
    isTrackingDisabled.value = false
    alert('Umami Tracking ist für dieses Gerät wieder AKTIVIERT.')
  } else {
    // Disable tracking
    localStorage.setItem('umami.disabled', '1')
    isTrackingDisabled.value = true
    alert('Umami Tracking ist für dieses Gerät jetzt DEAKTIVIERT.')
  }
}
</script>

<template>
  <div class="min-h-screen bg-white text-black font-mono flex flex-col justify-between p-8 selection:bg-black selection:text-white">
    <header class="border-b border-black pb-4">
      <h1 class="text-sm font-bold tracking-tight">DEV_CONSOLE // UMAMI_CONFIG</h1>
    </header>

    <main class="max-w-md my-auto space-y-6">
      <div class="text-xs text-neutral-600 uppercase tracking-wider space-y-1">
        <p>-> gerät lokal ausschließen</p>
        <p>-> status: <span :class="isTrackingDisabled ? 'text-red-700 font-bold' : 'text-green-700 font-bold'">{{ isTrackingDisabled ? '[MUTED]' : '[TRACKING]' }}</span></p>
      </div>

      <button 
        @click="toggleTracking"
        class="block border border-black px-4 py-2 text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-colors duration-150 active:translate-y-px"
      >
        {{ isTrackingDisabled ? 'enable_tracking' : 'disable_tracking' }}
      </button>
    </main>

    <footer class="text-xs border-t border-neutral-200 pt-4">
      <NuxtLink to="/" class="text-neutral-500 hover:text-black hover:underline">
        ../zurueck_zur_startseite
      </NuxtLink>
    </footer>
  </div>
</template>