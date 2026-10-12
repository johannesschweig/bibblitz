<script setup lang="ts">
import type { StatusTone } from '../../utils/availability'

defineProps<{ tone: StatusTone, label: string }>()

// Full class strings so Tailwind can detect them. Strength within green: near > good,
// so close copies read as easier to get. `hard` gets a ring because it is a warning.
const styles: Record<StatusTone, { pill: string, dot: string }> = {
  near: { pill: 'bg-emerald-100 text-emerald-900', dot: 'bg-emerald-600' },
  good: { pill: 'bg-emerald-50 text-emerald-900 ring-1 ring-inset ring-emerald-200', dot: 'bg-emerald-500' },
  wait: { pill: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  hard: { pill: 'bg-orange-100 text-orange-900 ring-1 ring-inset ring-orange-300', dot: 'bg-orange-600' },
  bad: { pill: 'bg-red-50 text-red-800', dot: 'bg-red-500' },
  neutral: { pill: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' }
}
</script>

<template>
  <span :class="['inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full', styles[tone].pill]">
    <span :class="['size-1.5 rounded-full shrink-0', styles[tone].dot]"></span>
    {{ label }}
  </span>
</template>
