<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="bg-white dark:bg-neutral-900 rounded-lg shadow p-8 w-full max-w-sm relative">
      <button @click="$emit('close')" class="absolute top-2 right-2 text-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">&times;</button>
      <h2 class="text-2xl font-bold mb-6 text-center">Login</h2>
      <form @submit.prevent="onLogin">
        <div class="mb-4">
          <label class="block mb-1 font-medium" for="email">Email</label>
          <input v-model="email" id="email" type="email" required class="w-full px-3 py-2 border rounded" />
        </div>
        <div class="mb-6">
          <label class="block mb-1 font-medium" for="password">Password</label>
          <input v-model="password" id="password" type="password" required class="w-full px-3 py-2 border rounded" />
        </div>
        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">Login</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const email = ref('')
const password = ref('')

function onLogin() {
  // Placeholder for login logic
  alert(`Login attempted for ${email.value}`)
}
</script>
