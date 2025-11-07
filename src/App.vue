<template>
  <div class="min-h-screen font-sans bg-gradient-to-br from-indigo-100 via-white to-emerald-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-800 text-neutral-900 dark:text-neutral-100">
    <NavBar />
    <main class="max-w-7xl mx-auto px-4 py-8">
      <ul>
        <li v-for="todo in todos" :key="todo.id">{{ todo.name }}</li>
      </ul>
      <router-view />
    </main>
    <footer class="text-xs opacity-70 text-center py-6">
      © tijnara
    </footer>
  </div>
</template>

<script setup>
import NavBar from './components/NavBar.vue'
import { ref, onMounted } from 'vue'
import { supabase } from './utils/supabase'

const todos = ref([])

async function getTodos() {
  const { data } = await supabase.from('todos').select()
  todos.value = data
}

onMounted(() => {
  getTodos()
})
</script>
