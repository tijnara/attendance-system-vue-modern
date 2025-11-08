<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="bg-white dark:bg-neutral-900 rounded-lg shadow p-8 w-full max-w-sm relative">
      <button @click="$emit('close')" class="absolute top-2 right-2 text-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">&times;</button>
      <h2 class="text-2xl font-bold mb-6 text-center">Admin Login</h2>
      <form @submit.prevent="onLogin">
        <div v-if="errorMessage" class="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {{ errorMessage }}
        </div>

        <div class="mb-4">
          <label class="block mb-1 font-medium" for="email">Email</label>
          <input v-model="email" id="email" type="email" required :disabled="isLoading" class="w-full px-3 py-2 border rounded disabled:bg-neutral-100 dark:disabled:bg-neutral-800" />
        </div>
        <div class="mb-6">
          <label class="block mb-1 font-medium" for="password">Password</label>
          <input v-model="password" id="password" type="password" required :disabled="isLoading" class="w-full px-3 py-2 border rounded disabled:bg-neutral-100 dark:disabled:bg-neutral-800" />
        </div>
        <button type="submit" :disabled="isLoading" class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:bg-blue-400">
          {{ isLoading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
// Import your API function to get user profile data from public.user
import { getUserByEmail } from '../services/usersAPI'

const emit = defineEmits(['close'])
const router = useRouter()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

async function onLogin() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    // 1. Fetch the user profile from the public 'user' table
    const userProfile = await getUserByEmail(email.value)

    // 2. Check if user exists
    if (!userProfile) {
      // Use a generic error for security (don't reveal if email exists)
      throw new Error('Invalid email or password.')
    }

    // 3. Check if the password matches
    // WARNING: This is a plain-text password check. See security note below.
    if (userProfile.password !== password.value) {
      throw new Error('Invalid email or password.')
    }

    // 4. Check if the user is an admin
    if (userProfile.isadmin !== true) {
      throw new Error('Access Denied. You must be an admin to log in.')
    }

    // 5. Success! Redirect to the admin dashboard
    // We are not "logged in" in a Supabase auth sense, but we have verified
    // this user is an admin and can proceed.
    router.push({ name: 'AdminDashboard' })
    emit('close') // Close the modal

  } catch (err) {
    errorMessage.value = err.message
  } finally {
    isLoading.value = false
  }
}
</script>