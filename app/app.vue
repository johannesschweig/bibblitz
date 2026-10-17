<!-- app.vue -->
<template>
  <div>
    <NuxtLayout>
      <NuxtPage :keepalive="{ max: 5 }" />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '~/stores/userStore'
import { useVoebbStatusStore } from '~/stores/voebbStatusStore'

const userStore = useUserStore()
const voebbStatus = useVoebbStatusStore()

onMounted(() => {
  userStore.fetchUserData()
  voebbStatus.check()
})
</script>