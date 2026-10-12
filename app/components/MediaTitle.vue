<script setup lang="ts">
import { splitSubtitle } from '../../utils/catalogText'

// Renders a catalog title with the part after the first " : " in a lighter style.
// Purely visual: the whole text stays visible, even when the split guesses wrong.
const props = defineProps<{ title: string }>()
const parts = computed(() => splitSubtitle(props.title))
</script>

<template>
  <span>{{ parts.main }}<template v-if="parts.rest">: <span class="font-normal text-gray-500">{{ parts.rest }}</span></template></span>
</template>
