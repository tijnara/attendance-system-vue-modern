<template>
  <transition name="fade">
    <div v-if="message" class="fixed bottom-5 right-5 max-w-sm rounded-2xl shadow-lg border border-black/5 dark:border-white/10 p-4"
         :class="ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'">
      <div class="font-semibold mb-1">{{ ok ? 'Success' : 'Error' }}</div>
      <div class="text-sm leading-snug">{{ message }}</div>
    </div>
  </transition>
</template>

<script setup>
defineProps({ ok: Boolean, message: String })
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
