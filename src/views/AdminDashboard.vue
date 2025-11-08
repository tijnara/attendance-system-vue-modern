<template>
  <div class="p-8 max-w-7xl mx-auto space-y-8">
    <h1 class="text-4xl font-bold mb-8">Admin Dashboard</h1>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="space-y-8">
        <div class="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
          <h2 class="text-2xl font-semibold mb-4">Add User</h2>
          <form @submit.prevent="handleCreateUser" class="space-y-4">
            <div>
              <label class="block mb-1 font-medium" for="fullName">Full Name</label>
              <input v-model="newUser.fullName" id="fullName" type="text" required class="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label class="block mb-1 font-medium" for="email">Email</label>
              <input v-model="newUser.email" id="email" type="email" required class="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label class="block mb-1 font-medium" for="password">Password</label>
              <input v-model="newUser.password" id="password" type="password" required class="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label class="block mb-1 font-medium" for="rfid">RFID</label>
              <input v-model="newUser.rf_id" id="rfid" type="text" required class="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label class="block mb-1 font-medium" for="position">Position</label>
              <input v-model="newUser.position" id="position" type="text" class="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label class="block mb-1 font-medium" for="department">Department</label>
              <select v-model="newUser.department_id" id="department" class="w-full px-3 py-2 border rounded">
                <option :value="null">-- Select Department --</option>
                <option v-for="dept in departments" :key="dept.id" :value="dept.id">
                  {{ dept.name }}
                </option>
              </select>
            </div>
            <div class="flex items-center">
              <input v-model="newUser.isadmin" id="isadmin" type="checkbox" class="mr-2" />
              <label for="isadmin">Is Admin?</label>
            </div>
            <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
              Add User
            </button>
          </form>
        </div>
        <div class="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
          <h2 class="text-2xl font-semibold mb-4">Add Department</h2>
          <form @submit.prevent="handleAddDepartment" class="space-y-4">
            <div>
              <label class="block mb-1 font-medium" for="dept-name">Department Name</label>
              <input v-model="newDepartment.name" id="dept-name" type="text" required class="w-full px-3 py-2 border rounded" />
            </div>
            <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
              Add Department
            </button>
          </form>
        </div>
      </div>
      <div class="lg:col-span-2 bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
        <h2 class="text-2xl font-semibold mb-4">Department Schedule Editor</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="text-lg font-medium mb-2">Select a department to edit:</h3>
            <ul class="space-y-2 max-h-[70vh] overflow-y-auto">
              <li v-for="dept in departments" :key="dept.id">
                <button
                  @click="openScheduleEditor(dept)"
                  class="w-full text-left p-3 rounded-md border"
                  :class="scheduleToEdit.department_id === dept.id ? 'bg-blue-100 dark:bg-blue-900 border-blue-400' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700'"
                >
                  <span class="font-semibold">{{ dept.name }}</span>
                  <span class="text-sm text-neutral-600 dark:text-neutral-400">
                    <span v-if="dept.department_schedule && dept.department_schedule[0]">
                      {{ dept.department_schedule[0].workStart }} - {{ dept.department_schedule[0].workEnd }}
                    </span>
                    <span v-else class="text-red-500">No schedule set</span>
                  </span>
                </button>
              </li>
            </ul>
          </div>
          <div v-if="scheduleToEdit.department_id">
            <h3 class="text-lg font-medium mb-2">
              Editing: <span class="text-blue-600">{{ scheduleToEdit.department_name }}</span>
            </h3>
            <form @submit.prevent="handleSaveSchedule" class="space-y-3">
              <div>
                <label class="block mb-1 text-sm font-medium" for="workStart">Work Start</label>
                <input v-model="scheduleToEdit.workStart" id="workStart" type="time" class="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label class="block mb-1 text-sm font-medium" for="workEnd">Work End</label>
                <input v-model="scheduleToEdit.workEnd" id="workEnd" type="time" class="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label class="block mb-1 text-sm font-medium" for="lunchStart">Lunch Start</label>
                <input v-model="scheduleToEdit.lunchStart" id="lunchStart" type="time" class="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label class="block mb-1 text-sm font-medium" for="lunchEnd">Lunch End</label>
                <input v-model="scheduleToEdit.lunchEnd" id="lunchEnd" type="time" class="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label class="block mb-1 text-sm font-medium" for="breakStart">Break Start</label>
                <input v-model="scheduleToEdit.breakStart" id="breakStart" type="time" class="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label class="block mb-1 text-sm font-medium" for="breakEnd">Break End</label>
                <input v-model="scheduleToEdit.breakEnd" id="breakEnd" type="time" class="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label class="block mb-1 text-sm font-medium" for="workingDays">Working Days (e.g., 5)</label>
                <input v-model.number="scheduleToEdit.workingDays" id="workingDays" type="number" class="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label class="block mb-1 text-sm font-medium" for="workdaysNote">Notes (e.g., Mon-Fri)</label>
                <input v-model="scheduleToEdit.workdaysNote" id="workdaysNote" type="text" class="w-full px-3 py-2 border rounded" />
              </div>
              <button type="submit" class="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition">
                {{ scheduleToEdit.id ? 'Update Schedule' : 'Create Schedule' }}
              </button>
            </form>
          </div>
          <div v-else class="text-neutral-500">
            Please select a department to begin editing its schedule.
          </div>
        </div>
      </div>
    </div>
    <!-- NEW: Explicit Lists Section -->
    <div class="space-y-8">
      <!-- Users Table -->
      <div class="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
        <h2 class="text-2xl font-semibold mb-4">Existing Users</h2>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[600px] text-left">
            <thead>
              <tr class="border-b dark:border-neutral-600">
                <th class="p-2">ID</th>
                <th class="p-2">Name</th>
                <th class="p-2">Email</th>
                <th class="p-2">RFID</th>
                <th class="p-2">Position</th>
                <th class="p-2">Admin?</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id" class="border-b dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                <td class="p-2">{{ user.id }}</td>
                <td class="p-2">{{ user.fullName }}</td>
                <td class="p-2">{{ user.email }}</td>
                <td class="p-2">{{ user.rf_id }}</td>
                <td class="p-2">{{ user.position }}</td>
                <td class="p-2">
                  <span :class="user.isadmin ? 'text-green-500' : 'text-neutral-500'">
                    {{ user.isadmin ? 'Yes' : 'No' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Departments Table -->
      <div class="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
        <h2 class="text-2xl font-semibold mb-4">Existing Departments</h2>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[400px] text-left">
            <thead>
              <tr class="border-b dark:border-neutral-600">
                <th class="p-2">ID</th>
                <th class="p-2">Name</th>
                <th class="p-2">Has Schedule?</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="dept in departments" :key="dept.id" class="border-b dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                <td class="p-2">{{ dept.id }}</td>
                <td class="p-2">{{ dept.name }}</td>
                <td class="p-2">
                  <span :class="dept.department_schedule && dept.department_schedule[0] ? 'text-green-500' : 'text-red-500'">
                    {{ dept.department_schedule && dept.department_schedule[0] ? 'Yes' : 'No' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Department Schedules Table -->
      <div class="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
        <h2 class="text-2xl font-semibold mb-4">All Department Schedules</h2>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[800px] text-left">
            <thead>
              <tr class="border-b dark:border-neutral-600">
                <th class="p-2">Department</th>
                <th class="p-2">Work Time</th>
                <th class="p-2">Lunch Time</th>
                <th class="p-2">Break Time</th>
                <th class="p-2">Days</th>
                <th class="p-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="dept in departments" :key="dept.id">
                <tr v-if="dept.department_schedule && dept.department_schedule[0]" class="border-b dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700">
                  <td class="p-2 font-medium">{{ dept.name }}</td>
                  <td class="p-2">{{ dept.department_schedule[0].workStart }} - {{ dept.department_schedule[0].workEnd }}</td>
                  <td class="p-2">{{ dept.department_schedule[0].lunchStart }} - {{ dept.department_schedule[0].lunchEnd }}</td>
                  <td class="p-2">{{ dept.department_schedule[0].breakStart }} - {{ dept.department_schedule[0].breakEnd }}</td>
                  <td class="p-2">{{ dept.department_schedule[0].workingDays }}</td>
                  <td class="p-2">{{ dept.department_schedule[0].workdaysNote }}</td>
                </tr>
              </template>
              <tr v-if="departments.every(d => !(d.department_schedule && d.department_schedule[0]))">
                <td colspan="6" class="p-4 text-center text-neutral-500">No schedules created yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { createUser, listUsers } from '../services/usersAPI'
import {
  listDepartmentsWithSchedules,
  addDepartment,
  createDepartmentSchedule,
  updateDepartmentSchedule
} from '../services/adminDataAPI'

// --- State ---
const newUser = ref({
  rf_id: '',
  fullName: '',
  email: '',
  password: '',
  position: '',
  department_id: null,
  isadmin: false,
})
const newDepartment = ref({
  name: ''
})
const defaultSchedule = {
  id: null,
  department_id: null,
  department_name: '',
  workingDays: 5,
  workStart: '09:00',
  workEnd: '17:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  breakStart: '15:00',
  breakEnd: '15:15',
  workdaysNote: 'Monday to Friday'
}
const scheduleToEdit = ref({ ...defaultSchedule })
// --- State for Lists ---
const users = ref([])
const departments = ref([])

onMounted(() => {
  loadDepartmentsWithSchedules()
  loadUsers()
})

async function loadUsers() {
  users.value = await listUsers()
}

async function loadDepartmentsWithSchedules() {
  departments.value = await listDepartmentsWithSchedules()
}

async function handleCreateUser() {
  const userProfile = {
    rf_id: newUser.value.rf_id,
    fullName: newUser.value.fullName,
    email: newUser.value.email,
    password: newUser.value.password,
    position: newUser.value.position,
    department_id: newUser.value.department_id,
    isadmin: newUser.value.isadmin,
  }
  const created = await createUser(userProfile)
  if (created) {
    alert(`User ${created.fullName} created!`)
    newUser.value = { rf_id: '', fullName: '', email: '', password: '', position: '', department_id: null, isadmin: false }
    loadUsers() // Refresh the user list
  } else {
    alert('Error creating user.')
  }
}

async function handleAddDepartment() {
  const created = await addDepartment({ name: newDepartment.value.name })
  if (created) {
    alert(`Department ${created.name} created!`)
    newDepartment.value.name = ''
    loadDepartmentsWithSchedules() // Refresh the department list
  } else {
    alert('Error creating department.')
  }
}

function openScheduleEditor(department) {
  scheduleToEdit.value.department_name = department.name
  scheduleToEdit.value.department_id = department.id
  const existingSchedule = department.department_schedule[0]
  if (existingSchedule) {
    scheduleToEdit.value.id = existingSchedule.id
    scheduleToEdit.value.workingDays = existingSchedule.workingDays
    scheduleToEdit.value.workStart = existingSchedule.workStart
    scheduleToEdit.value.workEnd = existingSchedule.workEnd
    scheduleToEdit.value.lunchStart = existingSchedule.lunchStart
    scheduleToEdit.value.lunchEnd = existingSchedule.lunchEnd
    scheduleToEdit.value.breakStart = existingSchedule.breakStart
    scheduleToEdit.value.breakEnd = existingSchedule.breakEnd
    scheduleToEdit.value.workdaysNote = existingSchedule.workdaysNote
  } else {
    scheduleToEdit.value = {
      ...defaultSchedule,
      department_id: department.id,
      department_name: department.name,
    }
  }
}

async function handleSaveSchedule() {
  const isUpdating = !!scheduleToEdit.value.id
  const payload = { ...scheduleToEdit.value }
  delete payload.department_name
  for (const key of ['lunchStart', 'lunchEnd', 'breakStart', 'breakEnd']) {
    if (payload[key] === '') {
      payload[key] = null
    }
  }
  try {
    let result
    if (isUpdating) {
      const { id, ...patch } = payload
      result = await updateDepartmentSchedule(id, patch)
      alert('Schedule updated successfully!')
    } else {
      delete payload.id
      result = await createDepartmentSchedule(payload)
      alert('Schedule created successfully!')
    }
    if (result) {
      loadDepartmentsWithSchedules()
      scheduleToEdit.value = { ...defaultSchedule }
    } else {
      throw new Error('Save operation failed.')
    }
  } catch (err) {
    alert(`Error saving schedule: ${err.message}`)
  }
}
</script>
