<script setup lang="ts">
import AvailabilityBadge from '~/components/AvailabilityBadge.vue'
import MediaTitle from '~/components/MediaTitle.vue'
import { useItemCacheStore } from '~/stores/itemCacheStore'
import { getMediaTypeConfig } from '../../utils/mediaTypeMapping'

const props = defineProps<{
  mediaId: string
}>()

const itemCacheStore = useItemCacheStore()

const item = computed(() => itemCacheStore.items[props.mediaId])
const config = computed(() => getMediaTypeConfig(item.value?.mediaType ?? ''))
</script>

<template>
  <li class="group bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 transition-all">
    <div class="p-2 md:p-3">
      <NuxtLink :to="`/media/${props.mediaId}`" class="block min-w-0">
        <div class="flex flex-col min-w-0">
          <p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
            <Icon :name="config.icon" class="size-3.5" />{{ config.label }}
          </p>
          <h3 class="font-semibold text-gray-900 text-sm md:text-base leading-snug group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
            <MediaTitle v-if="item?.title" :title="item.title" />
            <template v-else>Lädt Titel...</template>
          </h3>
          <!-- Year and platform tell apart results with the same title; the author gives way when space is short -->
          <p v-if="item?.author || item?.year || item?.platform" class="flex gap-1.5 text-xs md:text-sm text-gray-500 mb-2">
            <span v-if="item.author" class="truncate">{{ item.author }}</span>
            <span v-if="item.platform || item.year" class="shrink-0">
              <template v-if="item.author">· </template>{{ [item.platform, item.year].filter(Boolean).join(' · ') }}
            </span>
          </p>
          <AvailabilityBadge :mediaId="props.mediaId" />
        </div>
      </NuxtLink>
    </div>
  </li>
</template>