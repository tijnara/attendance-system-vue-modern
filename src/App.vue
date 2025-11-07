<template>
  <div class="min-h-screen font-sans bg-gradient-to-br from-indigo-100 via-white to-emerald-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-800 text-neutral-900 dark:text-neutral-100">
    <NavBar />
    <main class="max-w-7xl mx-auto px-4 py-8">
      <router-view />
    </main>
    <footer class="text-xs opacity-70 text-center py-6">
      Hosted on 100.119.3.44 · © tijnara
    </footer>
  </div>
</template>

<script setup>
import NavBar from './components/NavBar.vue'
</script>
