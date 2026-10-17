<template>
  <div class="flex min-h-screen flex-col bg-slate-50/50 text-gray-900 antialiased selection:bg-blue-500 selection:text-white">
    <!-- Global navigation bar -->
    <AppNavbar />

    <!-- Main content of the current page -->
    <main class="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
      <MaintenanceNotice />
      <slot />
    </main>

  </div>
</template>
