<template>
  <div class="rounded-2xl p-5 md:p-6 border border-black/5 dark:border-white/10 bg-white/70 dark:bg-neutral-900/70 backdrop-blur shadow-sm">
    <!-- Kiosk style (screenshot-like) -->
    <template v-if="kiosk">
      <div class="flex flex-col items-center text-center">
        <div class="w-20 h-20 md:w-24 md:h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-10 h-10 text-indigo-600 dark:text-indigo-300">
            <path fill="currentColor" d="M12 1a7 7 0 0 0-7 7v4a7 7 0 0 0 14 0V8a7 7 0 0 0-7-7m0 2a5 5 0 0 1 5 5v4a5 5 0 0 1-10 0V8a5 5 0 0 1 5-5m0 4a3 3 0 0 0-3 3v2a3 3 0 0 0 6 0V10a3 3 0 0 0-3-3"/>
          </svg>
        </div>


        <button class="btn-primary mt-4" :disabled="busy" @click="$emit('simulate-fp')">
          {{ busy ? 'Scanning…' : 'Scan Fingerprint' }}
        </button>
      </div>

      <!-- Hidden but bound fields to keep flow intact -->
      <div class="sr-only">
        <input v-model="keyboard" @keyup.enter="$emit('submit', keyboard)" />
        <select v-model="action">
          <option value="TIME_IN">TIME_IN</option>
          <option value="TIME_OUT">TIME_OUT</option>
          <option value="LUNCH_START">LUNCH_START</option>
          <option value="LUNCH_END">LUNCH_END</option>
          <option value="BREAK_START">BREAK_START</option>
          <option value="BREAK_END">BREAK_END</option>
        </select>
        <input type="number" v-model.number="manualUserId" />
        <input type="number" v-model.number="departmentIdManual" />
        <select v-model="departmentIdSelect"><option value="">None</option></select>
      </div>
    </template>

    <!-- Original utility panel (default) -->
    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-xl md:text-2xl font-semibold">Scan Station</h2>
        <span class="text-xs px-2 py-1 rounded-full border border-black/10 dark:border-white/10">RFID • Fingerprint</span>
      </div>

      <!-- Photo placeholder for future use -->
      <div class="mt-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
        <div class="w-40 h-40 md:w-56 md:h-56 rounded-2xl bg-neutral-200 dark:bg-neutral-800 border border-black/10 dark:border-white/10 flex items-center justify-center overflow-hidden">
          <img src="https://placehold.co/300x300?text=User+Photo" alt="User photo placeholder" class="w-full h-full object-cover opacity-80" />
        </div>
        <div class="hidden md:block text-sm opacity-70">
          This area is reserved for a user photo. You can replace the placeholder image with a real photo later.
        </div>
      </div>

      <div class="grid md:grid-cols-3 gap-4 mt-6">
        <button class="btn-primary" @click="$emit('simulate-fp')">
          Simulate Fingerprint
        </button>

        <div>
          <label class="label">RFID</label>
          <input ref="scanInput" class="input" v-model="keyboard" @keyup.enter="$emit('submit', keyboard)" placeholder="Tap RFID card, then press Enter" />
          <p class="hint">Most readers type the value here; press Enter after scanning.</p>
        </div>

        <div>
          <label class="label">Action</label>
          <select class="input" v-model="action">
            <option value="TIME_IN">TIME_IN</option>
            <option value="TIME_OUT">TIME_OUT</option>
            <option value="LUNCH_START">LUNCH_START</option>
            <option value="LUNCH_END">LUNCH_END</option>
            <option value="BREAK_START">BREAK_START</option>
            <option value="BREAK_END">BREAK_END</option>
          </select>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-4 mt-5">
        <div>
          <label class="label">Department (optional; auto-detected from user when possible)</label>
          <template v-if="departments.length">
            <select class="input" v-model="departmentIdSelect">
              <option value="">None</option>
              <option v-for="d in departments" :key="d.departmentId ?? d.department_id ?? d.deptId ?? d.dept_id ?? d.id" :value="String(d.departmentId ?? d.department_id ?? d.deptId ?? d.dept_id ?? d.id)">{{ d.departmentName ?? d.department_name ?? d.deptName ?? d.dept_name ?? d.name ?? d.title }}</option>
            </select>
          </template>
          <template v-else>
            <input class="input" type="number" v-model.number="departmentIdManual" placeholder="e.g. 3" />
            <p class="hint">Departments failed to load; enter ID manually.</p>
          </template>
        </div>
        <div>
          <label class="label">Manual User ID (override)</label>
          <input class="input" type="number" v-model.number="manualUserId" placeholder="If known, type here" />
        </div>
      </div>

      <div class="flex flex-wrap gap-3 mt-6">
        <button class="btn" :class="busy ? 'opacity-60 cursor-not-allowed' : 'btn-ghost'" @click="$emit('commit', { action, departmentId: selectedDepartmentId, manualUserId, keyboard })" :disabled="busy">
          {{ busy ? 'Submitting…' : 'Submit Log' }}
        </button>
        <button class="btn" @click="$emit('clear')" :disabled="busy">Clear</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import { getDepartments } from '../services/api.js'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  busy: { type: Boolean, default: false },
  kiosk: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue','submit','clear','simulate-fp','commit'])

const keyboard = ref('')
const manualUserId = ref()
const action = ref('TIME_IN')

// Focus ref for non-kiosk scan input
const scanInput = ref(null)

// Departments data
const departments = ref([])
const departmentIdSelect = ref('')
const departmentIdManual = ref()

onMounted(async () => {
  try {
    const res = await getDepartments()
    const list = Array.isArray(res) ? res : (res?.content || [])
    departments.value = list
  } catch (_) {
    departments.value = []
  }
  // After loading data, set initial focus to scan input when not in kiosk mode
  if (!props.kiosk) {
    nextTick(() => {
      setTimeout(() => {
        try { scanInput?.value?.focus() } catch (_) {}
      }, 0)
    })
  }
})

const selectedDepartmentId = computed(() => {
  if (departments.value && departments.value.length) {
    return departmentIdSelect.value ? Number(departmentIdSelect.value) : undefined
  }
  const v = Number(departmentIdManual.value)
  return Number.isFinite(v) ? v : undefined
})

watch([departmentIdSelect, departmentIdManual, manualUserId, action, keyboard], () => {
  emit('update:modelValue', {
    ...(props.modelValue || {}),
    departmentId: selectedDepartmentId.value,
    manualUserId: manualUserId.value,
    action: action.value,
    keyboard: keyboard.value
  })
})
</script>

<style scoped>
.label{ @apply block text-base mb-1 opacity-80; }
.input{ @apply w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-900/80 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400 text-base; }
.btn{ @apply rounded-xl px-5 py-3 border border-black/10 dark:border-white/10 text-base; }
.btn-ghost{ @apply bg-white/60 dark:bg-neutral-900/60 hover:bg-white/80 dark:hover:bg-neutral-800/80; }
.btn-primary{ @apply rounded-xl px-5 py-3 bg-indigo-600 text-white hover:bg-indigo-700 text-base; }
.hint{ @apply text-sm opacity-60 mt-1; }
</style>
