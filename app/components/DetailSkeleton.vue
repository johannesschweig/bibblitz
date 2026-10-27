<template>
  <!-- Same boxes as pages/media/[id].vue (header, ZIP row, branch list). Keep both in sync when the page changes. -->
  <div class="animate-pulse" aria-hidden="true">
    <header class="mb-10">
      <div class="h-4 mb-2 flex items-center"><div class="h-3 w-1/4 rounded bg-gray-100"></div></div>
      <!-- Title plus stacked subtitle, which most records have (73 px mobile, 86 px from md) -->
      <div class="h-[73px] md:h-[86px] flex flex-col justify-center gap-3">
        <div class="h-8 md:h-9 w-3/4 rounded bg-gray-200"></div>
        <div class="h-5 md:h-6 w-1/2 rounded bg-gray-100"></div>
      </div>
      <div class="h-7 mt-3 flex items-center"><div class="h-5 w-1/3 rounded bg-gray-100"></div></div>
      <div class="h-5 mt-2 flex items-center"><div class="h-3.5 w-1/4 rounded bg-gray-100"></div></div>
      <div class="h-5 mt-1 flex items-center"><div class="h-3.5 w-1/3 rounded bg-gray-100"></div></div>
      <div class="h-[42px] w-24 rounded-xl bg-gray-200 mt-6"></div>
    </header>

    <div class="h-7 mb-4 flex items-center"><div class="h-6 w-28 rounded bg-gray-200"></div></div>

    <!-- ZIP row -->
    <div class="mb-2 mt-[9px] p-1 grid grid-cols-[auto_1fr_auto] gap-x-3 items-center">
      <div class="size-[37px] rounded-full bg-gray-100"></div>
      <div>
        <div class="h-2.5 w-24 rounded bg-gray-100 mb-1.5"></div>
        <div class="h-4 w-40 rounded bg-gray-200"></div>
      </div>
      <div class="h-[30px] w-20 rounded-lg bg-gray-100"></div>
    </div>

    <!-- Branch rows: pill beside the text from sm, below it on mobile (like the real list) -->
    <div class="divide-y divide-gray-200 border-b border-gray-200">
      <div v-for="n in 4" :key="n" class="py-4 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-2">
        <div class="min-w-0 col-start-1 row-start-1">
          <div class="h-6 flex items-center"><div class="h-4 w-2/3 rounded bg-gray-200"></div></div>
          <div class="h-5 mt-1 flex items-center"><div class="h-3.5 w-1/3 rounded bg-gray-100"></div></div>
        </div>
        <div class="h-6 w-24 rounded-full bg-gray-100 col-start-1 row-start-2 justify-self-start sm:col-start-2 sm:row-start-1 sm:justify-self-end"></div>
        <div class="size-4 rounded bg-gray-100 col-start-2 row-start-1 row-span-2 sm:col-start-3 sm:row-span-1"></div>
      </div>
    </div>
  </div>
</template>
