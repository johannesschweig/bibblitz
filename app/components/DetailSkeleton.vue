<template>
  <div class="animate-pulse" aria-hidden="true">
    <header class="mb-8 border-b border-gray-200 pb-6">
      <div class="grid grid-cols-[56px_1fr] sm:grid-cols-[72px_1fr] gap-4">
        <div class="m-1.5 sm:m-2 size-11 sm:size-14 rounded-lg bg-gray-200"></div>
        <div>
          <div class="h-3 w-1/4 rounded bg-gray-100 mb-3"></div>
          <div class="h-8 w-3/4 rounded bg-gray-200 mb-3"></div>
          <div class="h-5 w-1/3 rounded bg-gray-100"></div>
        </div>
      </div>
      <div class="h-10 w-24 rounded-xl bg-gray-200 mt-5"></div>
    </header>

    <div class="h-6 w-28 rounded bg-gray-200 mb-4"></div>
    <div class="space-y-3">
      <div v-for="n in 4" :key="n" class="h-[74px] rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between gap-4">
        <div class="flex-1">
          <div class="h-4 w-2/3 rounded bg-gray-200 mb-2"></div>
          <div class="h-3 w-1/3 rounded bg-gray-100"></div>
        </div>
        <div class="h-6 w-24 rounded-full bg-gray-100"></div>
      </div>
    </div>
  </div>
</template>
