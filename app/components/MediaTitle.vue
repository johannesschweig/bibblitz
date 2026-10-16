<script setup lang="ts">
import { splitSubtitle } from '../../utils/catalogText'

// Renders a catalog title with the part after the first " : " in a lighter style.
// Purely visual: the whole text stays visible, even when the split guesses wrong.
// `stacked` (detail page): the subtitle moves to its own, smaller line instead of running on in the heading.
const props = defineProps<{ title: string, stacked?: boolean }>()
const parts = computed(() => splitSubtitle(props.title))
</script>

<template>
  <template v-if="stacked && parts.rest">
    <span>{{ parts.main }}</span>
    <span class="mt-2 block text-xl font-normal leading-snug tracking-normal text-gray-500 hyphens-auto md:text-2xl">{{ parts.rest }}</span>
  </template>
  <span v-else>{{ parts.main }}<template v-if="parts.rest">: <span class="font-normal text-gray-500">{{ parts.rest }}</span></template></span>
</template>
