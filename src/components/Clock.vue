<template>
  <div aria-live="polite">{{ now }}</div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
// Always display time in Philippines (Asia/Manila)
const fmt = (d = new Date()) => d.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
const now = ref(fmt())
let t = null
onMounted(() => { t = setInterval(() => now.value = fmt(), 1000) })
onBeforeUnmount(() => { clearInterval(t) })
</script>
