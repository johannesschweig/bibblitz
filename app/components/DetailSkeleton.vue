<template>
  <div class="animate-pulse" aria-hidden="true">
    <header class="mb-10">
      <div class="h-3 w-1/4 rounded bg-gray-100 mb-3"></div>
      <div class="h-10 w-3/4 rounded bg-gray-200 mb-4"></div>
      <div class="h-6 w-1/3 rounded bg-gray-100 mb-3"></div>
      <div class="h-4 w-1/4 rounded bg-gray-100"></div>
      <div class="h-10 w-24 rounded-xl bg-gray-200 mt-6"></div>
    </header>

    <div class="h-7 w-28 rounded bg-gray-200 mb-4"></div>
    <div class="divide-y divide-gray-200 border-b border-gray-200">
      <div v-for="n in 4" :key="n" class="py-4 flex items-center justify-between gap-4">
        <div class="flex-1">
          <div class="h-4 w-2/3 rounded bg-gray-200 mb-2"></div>
          <div class="h-3 w-1/3 rounded bg-gray-100"></div>
        </div>
        <div class="h-6 w-24 rounded-full bg-gray-100"></div>
      </div>
    </div>
  </div>
</template>
