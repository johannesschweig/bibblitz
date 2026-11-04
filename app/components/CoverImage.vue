<script setup lang="ts">
import { coverSrc, type CoverSize } from '../../utils/cover'
import { getMediaTypeConfig } from '../../utils/mediaTypeMapping'

// A cover through our own proxy route, or a tile with the media-type icon when there is none. The
// parent sets the width and height (cover aspect is about 2:3), so rows keep their size either way.
// `fallback` false: render nothing when there is no cover (the detail page, where an empty tile is noise)
const props = withDefaults(defineProps<{
  coverId?: string
  mediaType: string
  size: CoverSize
  fallback?: boolean
}>(), { fallback: true })

const failed = ref(false)
const showImage = computed(() => !!props.coverId && !failed.value)
const image = ref<HTMLImageElement>()
const config = computed(() => getMediaTypeConfig(props.mediaType))

// The same row component can show another record later, which deserves its own try
watch(() => props.coverId, () => { failed.value = false })

// Server-rendered markup (a detail page opened directly): the image may have failed before Vue was
// listening, so look at it once. Later renders get the error event.
const renderedByServer = useNuxtApp().isHydrating
onMounted(() => {
  if (renderedByServer && image.value?.complete && image.value.naturalWidth === 0) failed.value = true
})
</script>

<template>
  <!-- bg-gray-100 is also what shows while the image loads -->
  <div v-if="showImage || fallback" class="shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100">
    <img
      v-if="showImage"
      ref="image"
      data-testid="cover-image"
      :src="coverSrc(coverId, size)"
      alt=""
      loading="lazy"
      decoding="async"
      class="size-full object-cover"
      @error="failed = true"
    >
    <div v-else data-testid="cover-fallback" class="flex size-full items-center justify-center text-gray-500">
      <Icon :name="config.icon" :class="size === 'm' ? 'size-10' : 'size-6'" />
    </div>
  </div>
</template>
