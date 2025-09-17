<template>
  <header class="backdrop-blur bg-white/70 dark:bg-neutral-900/70 border-b border-black/5 dark:border-white/10 sticky top-0 z-10">
    <div class="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
      <div class="font-semibold">Employee Time Tracking System</div>
      <nav class="flex items-center gap-4 text-sm">
        <RouterLink class="hover:underline" to="/">Scanner</RouterLink>
        <RouterLink class="hover:underline" to="/admin/logs">Admin Logs</RouterLink>
      </nav>
      <div class="ml-auto text-sm opacity-70"><Clock/></div>
    </div>
  </header>
</template>

<script setup>
import Clock from './Clock.vue'
</script>
