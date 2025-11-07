<template>
  <div class="space-y-8">
    <!-- Top banner like screenshot -->
    <div class="rounded-2xl p-5 md:p-6 border border-black/5 bg-gradient-to-r from-indigo-50 via-sky-50 to-fuchsia-50 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold">Employee Time Tracking System</h1>
          <p class="mt-1 text-neutral-600">Digital time recording and attendance management</p>
        </div>
        <div class="text-right">
          <div class="flex items-center justify-end gap-2">
            <span class="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
            <div class="tabular-nums text-xl md:text-2xl font-semibold">{{ timeString }}</div>
          </div>
          <div class="mt-1 text-xs md:text-sm text-neutral-700">{{ dateString }}</div>
        </div>
      </div>
    </div>

    <!-- Top row: Employee Information and Department Schedule -->
    <div class="grid lg:grid-cols-5 gap-4">
      <!-- Employee Information card -->
      <div class="rounded-2xl p-4 border border-black/5 bg-white/70 backdrop-blur shadow-sm lg:col-span-2">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5m-7 8a7 7 0 0 1 14 0z"/></svg>
          </div>
          <h3 class="text-lg font-semibold">Employee Information</h3>
        </div>

        <!-- Photo -->
        <div class="mb-4 flex items-center gap-4">
          <div class="w-32 h-32 rounded-full bg-neutral-200 overflow-hidden flex items-center justify-center text-neutral-600 border border-black/10">
            <img v-if="displayPhoto" :src="displayPhoto" alt="Employee photo" class="w-full h-full object-cover" />
            <span v-else class="font-semibold">{{ initials }}</span>
          </div>
          <div>
            <label class="block text-sm mb-1 opacity-80">Photo</label>
            <div class="text-xs text-neutral-600">Photo will appear here when available from the database.</div>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm mb-1 opacity-80">Employee No:</label>
            <input
                class="w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400"
                type="number"
                v-model.number="form.manualUserId"
                @keyup.enter="onManualScan"
                placeholder="Employee number"
                :disabled="DISABLE_EMPLOYEE_NO || busy"
            />
          </div>

          <div>
            <label class="block text-sm mb-1 opacity-80 flex items-center gap-2">
              <span class="inline-flex items-center justify-center w-5 h-5 text-indigo-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2M4 6h16v3H4zm3.5 9A1.5 1.5 0 1 1 9 13.5A1.5 1.5 0 0 1 7.5 15m8.5 2h-7a1 1 0 0 1 0-2h7a1 1 0 1 1 0 2"/></svg>
              </span>
              <span>RFID</span>
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-5 h-5"><path fill="currentColor" d="M2 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1h1a4 4 0 0 1 4 4v3a3 3 0 0 1-3 3H9a4 4 0 0 1-4-4V7Zm2 0v4a2 2 0 0 0 2 2h7V7z"/></svg>
              </span>
              <input
                  ref="rfidInput"
                  class="w-full rounded-xl border border-black/10 bg-white/80 pl-10 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400 text-transparent caret-indigo-600"
                  type="text"
                  v-model.trim="form.rfide"
                  @keyup.enter="onRfidSubmit"
                  placeholder="Tap card or enter RFID"
                  :disabled="DISABLE_RFID || busy"
                  autocomplete="off"
              />
              <div class="pointer-events-none absolute left-10 right-3 top-1/2 -translate-y-1/2 text-neutral-900">
                {{ maskedRfid }}
              </div>
            </div>
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm mb-1 opacity-80">Full Name:</label>
            <div class="flex items-center gap-2">
              <div class="w-full rounded-xl border border-black/10 bg-white/50 px-3 py-2 text-base font-medium min-h-[40px] flex items-center">
                {{ fullName || (selectedUser && (selectedUser.fullName || selectedUser.name)) || '—' }}
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm mb-1 opacity-80">Department:</label>
            <div class="w-full rounded-xl border border-black/10 bg-white/50 px-3 py-2 text-base font-medium min-h-[40px] flex items-center">
              {{ departmentNameDisplay }}
            </div>
          </div>
        </div>

        <div class="mt-4 flex items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="onManualScan"
            :disabled="busy || !form.manualUserId"
            title="Scan manually"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-4 h-4" fill="currentColor"><path d="M4 6a2 2 0 0 1 2-2h4v2H6v4H4zm16 0v4h-2V6h-4V4h4a2 2 0 0 1 2 2M4 14h2v4h4v2H6a2 2 0 0 1-2-2zm16 0h-2v4h-4v2h4a2 2 0 0 0 2-2z"/></svg>
            <span>Scan</span>
          </button>
          <span v-if="showLateLabel" class="ml-2 flex items-center text-red-600 font-bold">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><path stroke="currentColor" stroke-width="2" d="M12 8v4m0 4h.01"/></svg>
            Late
          </span>
        </div>
      </div>

      <!-- Department Schedule -->
      <div class="rounded-2xl p-0 border border-black/5 bg-white/70 backdrop-blur shadow-sm overflow-hidden lg:col-span-3">
        <div class="px-6 py-4 border-b border-black/10">
          <h3 class="text-lg font-semibold">Department Schedule</h3>
        </div>
        <div class="p-4">
          <div v-if="schedulesLoading" class="text-sm text-neutral-600">Loading schedules...</div>
          <div v-else-if="schedulesError" class="text-sm text-red-600">Failed to load schedules: {{ schedulesError }}</div>
          <div v-else>
            <div class="overflow-x-auto">
              <table class="min-w-[700px] w-full table-fixed text-xs">
                <thead class="text-left border-b border-black/10 bg-black/[.03]">
                <tr class="[&>*]:py-1 [&>*]:px-2 [&>*]:align-top">
                  <th>Depart-ment</th>
                  <th>Working Days</th>
                  <th>Work Start</th>
                  <th>Work End</th>
                  <th class="hidden sm:table-cell">Lunch Start</th>
                  <th class="hidden sm:table-cell">Lunch End</th>
                  <th class="hidden sm:table-cell">Break Start</th>
                  <th class="hidden sm:table-cell">Break End</th>
                  <th class="hidden sm:table-cell">Note</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="s in schedules" :key="s.scheduleId ?? (s.departmentId ?? s.department_id ?? s.deptId ?? s.dept_id ?? s.id)" class="border-b border-black/5">
                  <td class="py-1 px-2 whitespace-normal break-words align-top">{{ getDeptName(s.departmentId ?? s.department_id ?? s.deptId ?? s.dept_id ?? s.id) }}</td>
                  <td class="py-1 px-2 whitespace-normal break-words align-top">{{ s.workingDays ?? '' }}</td>
                  <td class="py-1 px-2 whitespace-normal break-words align-top">{{ hms12(s.workStart) }}</td>
                  <td class="py-1 px-2 whitespace-normal break-words align-top">{{ hms12(s.workEnd) }}</td>
                  <td class="py-1 px-2 whitespace-normal break-words align-top hidden sm:table-cell">{{ hms12(s.lunchStart) }}</td>
                  <td class="py-1 px-2 whitespace-normal break-words align-top hidden sm:table-cell">{{ hms12(s.lunchEnd) }}</td>
                  <td class="py-1 px-2 whitespace-normal break-words align-top hidden sm:table-cell">{{ hms12(s.breakStart) }}</td>
                  <td class="py-1 px-2 whitespace-normal break-words align-top hidden sm:table-cell">{{ hms12(s.breakEnd) }}</td>
                  <td class="py-1 px-2 whitespace-normal break-words align-top hidden sm:table-cell">{{ s.workdaysNote ?? '' }}</td>
                </tr>
                </tbody>
              </table>
            </div>
            <div v-if="schedules.length === 0" class="text-sm text-neutral-600 p-4">No schedules available.</div>
          </div>
        </div>
        <div class="px-6 py-3 text-xs text-neutral-500 border-t border-black/5">Updated on: {{ updatedOn }}</div>
      </div>
    </div>

    <!-- Floating modal showing last scan info -->
    <div v-if="lastScan" class="fixed top-4 left-4 z-50">
      <div class="rounded-xl border border-black/10 bg-white/90 backdrop-blur px-4 py-3 shadow-lg">
        <div class="text-[11px] uppercase tracking-wide text-neutral-500">Last Scan</div>
        <div class="text-base font-semibold text-neutral-900">{{ lastScan.name }}</div>
        <div class="text-sm text-neutral-700">{{ lastScan.department || '—' }}</div>
      </div>
    </div>

    <StatusToast :ok="toast.ok" :message="toast.msg" :type="toast.type" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import {
  getLogs,
  getDepartmentSchedules,
  getDepartments,
  getUserById,
  resolveDepartmentForUser,
  findUserByRfidOrBarcode,
  getExistingAttendanceLog,
  updateLog,
  postLog
} from '../services/api.js'
import StatusToast from '../components/StatusToast.vue'
import { DISABLE_RFID, DISABLE_EMPLOYEE_NO } from '../config.js'

const busy = ref(false)

/** ---------------- Form / State ---------------- */
const form = ref({
  action: 'TIME_IN',
  departmentId: undefined,
  manualUserId: undefined,
  rfide: '',
  keyboard: ''
})

// Masked display for RFID (show # characters only)
const maskedRfid = computed(() => '#'.repeat(String(form.value.rfide || '').length))

const rfidInput = ref(null)
const lastLocalLogs = ref([])
const toast = ref({ ok: false, msg: '' })
const adminRows = ref([])
const showLateLabel = ref(false)
/** ---------------- Clock ---------------- */
const now = ref(new Date())
let t = null
onMounted(() => { t = setInterval(() => now.value = new Date(), 1000) })
onBeforeUnmount(() => { if (t) clearInterval(t) })

// Auto-focus RFID input
onMounted(() => {
  if (DISABLE_RFID) return
  nextTick(() => {
    setTimeout(() => { try { rfidInput?.value?.focus() } catch {} }, 0)
  })
})

/** ---------------- PH time strings ---------------- */
const timeString = computed(() =>
    now.value.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute:'2-digit', second:'2-digit', hour12: true })
)
const dateString = computed(() =>
    now.value.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday:'long', year:'numeric', month:'long', day:'numeric' })
)
const updatedOn = computed(() =>
    now.value.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })
)

/** ---------------- Displayed user ---------------- */
const fullName = ref('')
const lastScan = ref(null)
const selectedUser = ref(null)
const serverPhotoUrl = computed(() => {
  const u = selectedUser.value
  return u?.photoUrl || u?.avatar || u?.profilePhoto || u?.photo || ''
})
const displayPhoto = computed(() => serverPhotoUrl.value || '')
const initials = computed(() => {
  const u = selectedUser.value
  let name = String(fullName.value || '').trim()
  if (!name && (u?.fullName || u?.name)) name = u.fullName || u.name
  const parts = String(name || '').split(/\s+/).filter(Boolean)
  const s = (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
  return s ? s.toUpperCase() : 'EMP'
})

/** ---------------- Watch manual user id ---------------- */
watch(() => form.value.manualUserId, async (id) => {
  selectedUser.value = null
  if (id == null || id === '') { fullName.value = ''; form.value.departmentId = undefined; return }
  try {
    const user = await getUserById(id)
    if (user) {
      selectedUser.value = user
      const name = user.fullName || user.name || [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ').trim()
      if (name) fullName.value = name
      try {
        const directId = user.departmentId ?? user.department_id ?? user?.department?.departmentId ?? user?.department?.id
        if (directId != null) {
          form.value.departmentId = Number(directId)
        } else {
          const info = await resolveDepartmentForUser(user.userId ?? user.id ?? id)
          if (info?.departmentId != null) form.value.departmentId = Number(info.departmentId)
        }
      } catch {}
    } else {
      fullName.value = ''
      form.value.departmentId = undefined
    }
  } catch { fullName.value = ''; form.value.departmentId = undefined }
})

/** ---------------- RFID submit ---------------- */
async function onRfidSubmit() {
  if (DISABLE_RFID || busy.value) return
  const v = String(form.value.rfide || '').trim()
  if (!v) return
  try {
    const u = await findUserByRfidOrBarcode(v)
    if (u && (u.userId != null || u.id != null)) {
      form.value.manualUserId = Number(u.userId ?? u.id)
      const directId = u.departmentId ?? u.department_id ?? u?.department?.departmentId ?? u?.department?.id
      if (directId != null) form.value.departmentId = Number(directId)
      selectedUser.value = u
      const name = u.fullName || u.name || [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ').trim()
      if (name) fullName.value = name

      // auto-commit
      try {
        await commit({ departmentId: form.value.departmentId, manualUserId: form.value.manualUserId })
      } finally {
        // clear rfid field so the next tap doesn't append
        form.value.rfide = ''
      }
    } else {
      note(false, 'User not found for given RFID.')
      scheduleClearFields(2000)
    }
  } catch (e) {
    console.error('[Scanner] onRfidSubmit error:', e)
    note(false, 'Failed to resolve RFID.')
    scheduleClearFields(2000)
  }
}

/** ---------------- Manila helpers ---------------- */
const manilaDateYMD = () =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year:'numeric', month:'2-digit', day:'2-digit' })
        .format(new Date())

const manilaIsoWithOffset = () => {
  const parts = new Intl.DateTimeFormat('en-PH', {
    timeZone:'Asia/Manila', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
  }).formatToParts(new Date()).reduce((acc,p)=>{ acc[p.type]=p.value; return acc }, {})
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`
}

/** ---------------- UI helpers ---------------- */
function note(ok, msg, type = '') {
  toast.value = { ok, msg, type }
  setTimeout(() => { toast.value = { ok: false, msg: '', type: '' } }, 3000)
}
function pushLocal(entry) {
  lastLocalLogs.value.unshift(entry)
  if (lastLocalLogs.value.length > 12) lastLocalLogs.value.pop()
}
function clearForm() {
  form.value = { action: 'TIME_IN', departmentId: undefined, manualUserId: undefined, rfide: '', keyboard: '' }
  fullName.value = ''
  selectedUser.value = null
  try { if (!DISABLE_RFID) nextTick(() => setTimeout(() => rfidInput?.value?.focus?.(), 0)) } catch {}
}
let clearFieldsTimer = null
function scheduleClearFields(ms) {
  if (clearFieldsTimer) { clearTimeout(clearFieldsTimer); clearFieldsTimer = null }
  clearFieldsTimer = setTimeout(() => { try { clearForm() } finally { clearFieldsTimer = null } }, ms)
}

/** ---------------- Data loaders ---------------- */
async function loadAdminLogs() {
  try {
    const data = await getLogs({})
    adminRows.value = Array.isArray(data) ? data : (data?.content || [])
    console.log('[AdminLogs] rows:', adminRows.value.length)
  } catch (e) {
    console.error('[AdminLogs] load error:', e)
    adminRows.value = []
  }
}
loadAdminLogs()

/** ---------------- Department schedules ---------------- */
const schedules = ref([])
const schedulesLoading = ref(true)
const schedulesError = ref('')
const departments = ref([])

const deptMap = computed(() => {
  const map = {}
  for (const d of departments.value || []) {
    const key = String(d.departmentId ?? d.department_id ?? d.deptId ?? d.dept_id ?? d.id)
    map[key] = d
  }
  return map
})
function deptNameOf(d) {
  return d?.departmentName ?? d?.department_name ?? d?.deptName ?? d?.dept_name ?? d?.name ?? d?.title ?? null
}
function getDeptName(id) {
  if (id == null) return '—'
  const d = deptMap.value[String(id)]
  return deptNameOf(d) || '—'
}
const departmentNameDisplay = computed(() => {
  const id = form.value.departmentId;
  const u = selectedUser.value;

  // Prioritize the name from the selected user object, as it may be nested.
  const nameFromUserObject = u?.departmentName ?? u?.department_name ?? u?.deptName ?? u?.dept_name ?? u?.department?.departmentName ?? u?.department?.department_name ?? u?.department?.deptName ?? u?.department?.dept_name ?? u?.department?.name ?? u?.department?.title;
  if (nameFromUserObject) {
    console.log('[Scanner] departmentNameDisplay from user object:', nameFromUserObject)
    return nameFromUserObject;
  }

  // Fallback to looking up the ID in the general departments list.
  if (id != null) {
    const d = deptMap.value[String(id)];
    const deptName = deptNameOf(d) || '—';
    console.log('[Scanner] departmentNameDisplay from deptMap:', id, deptName)
    return deptName;
  }

  return '—'; // Default placeholder
})

async function loadSchedules() {
  schedulesLoading.value = true
  schedulesError.value = ''
  try {
    const data = await getDepartmentSchedules()
    const arr = Array.isArray(data) ? data : (data?.content || [])
    schedules.value = arr
  } catch (e) {
    console.error('[Scanner] loadSchedules error:', e)
    schedulesError.value = e?.message || 'Error loading schedules'
    schedules.value = []
  } finally {
    schedulesLoading.value = false
  }
}
async function loadDepartments() {
  try {
    const res = await getDepartments()
    const list = Array.isArray(res) ? res : (res?.content || [])
    departments.value = list
    console.log('[Scanner] Loaded departments:', list)
  } catch {
    departments.value = []
  }
}
onMounted(() => { loadSchedules(); loadDepartments() })

/** ---------------- Utilities ---------------- */
function titleCaseFromEnum(s = '') {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}
function hms12(s){
  if (!s && s !== 0) return ''
  const m = String(s).match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/)
  if (!m) return String(s || '')
  let hh = Number(m[1])
  const mm = String(m[2]).padStart(2,'0')
  const ss = m[3] != null ? String(m[3]).padStart(2,'0') : null
  const ap = hh >= 12 ? 'PM' : 'AM'
  hh = hh % 12
  if (hh === 0) hh = 12
  const sec = ss != null ? `:${ss}` : ''
  return `${hh}:${mm}${sec} ${ap}`
}
const ACTION_SEQUENCE = ['TIME_IN', 'LUNCH_START', 'LUNCH_END', 'BREAK_START', 'BREAK_END', 'TIME_OUT']

function toTs(v) {
  if (!v) return null
  // accept ISO, 'YYYY-MM-DD', or time strings
  if (typeof v === 'number') return v
  const s = String(v)
  // if only time provided, prefix with today's date in Manila
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    const date = manilaDateYMD()
    const iso = `${date}T${s.length === 5 ? s + ':00' : s}+08:00`
    return Date.parse(iso)
  }
  // if only date
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Date.parse(`${s}T00:00:00+08:00`)
  // otherwise try native parse
  const d = Date.parse(s)
  return isNaN(d) ? null : d
}
function latestActionTime(row) {
  if (!row) return null
  // Prefer the most recent fields first (out -> break end -> break start -> lunch end -> lunch start -> in)
  const order = [
    ['timeOut', 'time_out'],
    ['breakEnd', 'break_end'],
    ['breakStart', 'break_start'],
    ['lunchEnd', 'lunch_end'],
    ['lunchStart', 'lunch_start'],
    ['timeIn', 'time_in']
  ]
  for (const [camel, snake] of order) {
    const val = row[camel] ?? row[snake]
    if (val) {
      const ts = toTs(val)
      if (ts) return ts
    }
  }
  return null
}

async function getTodayLogForUser(userId) {
  const dateStr = manilaDateYMD()
  try {
    const res = await getLogs({ userId, from: dateStr, to: dateStr, useUserDateEndpoint: true })
    const arrRaw = Array.isArray(res) ? res : (res?.content || [])
    const arr = arrRaw.filter(r => {
      const uid = Number(r?.userId ?? r?.user_id ?? r?.user?.id)
      const ld = String(r?.logDate || '').slice(0, 10)
      return uid === Number(userId) && (!ld || ld === dateStr)
    })
    if (!arr?.length) return null
    if (arr.length === 1) return arr[0]
    return arr.reduce((best, r) => {
      const a = latestActionTime(best) ?? toTs(best?.updatedAt || best?.createdAt || best?.logDate)
      const b = latestActionTime(r)    ?? toTs(r?.updatedAt || r?.createdAt || r?.logDate)
      return (b || 0) > (a || 0) ? r : best
    }, arr[0])
  } catch {
    try {
      const res2 = await getLogs({ userId, from: dateStr, to: dateStr })
      const arr2Raw = Array.isArray(res2) ? res2 : (res2?.content || [])
      const arr2 = arr2Raw.filter(r => {
        const uid = Number(r?.userId ?? r?.user_id ?? r?.user?.id)
        const ld = String(r?.logDate || '').slice(0, 10)
        return uid === Number(userId) && (!ld || ld === dateStr)
      })
      if (!arr2?.length) return null
      if (arr2.length === 1) return arr2[0]
      return arr2.reduce((best, r) => {
        const a = latestActionTime(best) ?? toTs(best?.updatedAt || best?.createdAt || best?.logDate)
        const b = latestActionTime(r)    ?? toTs(r?.updatedAt || r?.createdAt || r?.logDate)
        return (b || 0) > (a || 0) ? r : best
      }, arr2[0])
    } catch { return null }
  }
}
function countRecordedActions(row) {
  if (!row) return 0
  const pairs = [
    ['timeIn', 'time_in'],
    ['lunchStart', 'lunch_start'],
    ['lunchEnd', 'lunch_end'],
    ['breakStart', 'break_start'],
    ['breakEnd', 'break_end'],
    ['timeOut', 'time_out']
  ]
  return pairs.reduce((n, [camel, snake]) => n + ((row[camel] ?? row[snake]) ? 1 : 0), 0)
}
function hasActionRecorded(row, action) {
  if (!row) return false
  const keyMap = {
    'TIME_IN': ['time_in', 'timeIn'],
    'LUNCH_START': ['lunch_start', 'lunchStart'],
    'LUNCH_END': ['lunch_end', 'lunchEnd'],
    'BREAK_START': ['break_start', 'breakStart'],
    'BREAK_END': ['break_end', 'breakEnd'],
    'TIME_OUT': ['time_out', 'timeOut']
  }
  const keys = keyMap[action] || []
  return keys.some(k => !!row[k])
}
async function determineNextAction(userId) {
  const today = await getTodayLogForUser(userId)
  // If no log yet for today, first scan is TIME_IN
  if (!today) return 'TIME_IN'
  // Walk the required sequence and return the first missing action
  for (const action of ACTION_SEQUENCE) {
    if (!hasActionRecorded(today, action)) return action
  }
  return null
}

/** ---------------- Form actions ---------------- */
const COOLDOWN_MINUTES = 5
const cooldownTimers = new Map()
function startCooldownFor(userId, minutes = COOLDOWN_MINUTES) {
  try {
    const ms = Math.max(0, Number(minutes) || COOLDOWN_MINUTES) * 60 * 1000
    const prev = cooldownTimers.get(userId)
    if (prev) clearTimeout(prev)
    const t = setTimeout(() => cooldownTimers.delete(userId), ms)
    cooldownTimers.set(userId, t)
  } catch {}
}

async function resolveUser({ manualUserId, keyboard }) {
  const userId = Number(manualUserId ?? keyboard) || null
  if (!userId) throw new Error('Please enter an Employee No.')
  const rfidStr = String(form.value.rfide || '').trim()
  const isRfid = !!rfidStr
  return { userId, type: isRfid ? 'RFID' : 'Manual', raw: isRfid ? { rfide: rfidStr } : null }
}

let lastSubmit = { key: '', ts: 0 }
async function commit({ action, departmentId, manualUserId, keyboard }) {
  if (busy.value) return
  busy.value = true
  let intendedUserId = Number(manualUserId) || null
  let success = false
  try {
    const { userId, type, raw } = await resolveUser({ manualUserId, keyboard })
    intendedUserId = userId

    const nextAction = await determineNextAction(userId)
    if (!nextAction) { note(false, 'All required scans for today are already recorded. Please do not scan again.'); return }

    const key = `${userId}|${nextAction}|${manilaDateYMD()}`
    const nowTs = Date.now()
    if (lastSubmit.key === key && (nowTs - lastSubmit.ts) < 1500) { note(false, 'Already recorded. Please do not scan twice.'); return }
    lastSubmit = { key, ts: nowTs }

    let resolvedDeptId = departmentId
    let resolvedDeptName
    try {
      const info = await resolveDepartmentForUser(userId)
      if (info) {
        resolvedDeptId = resolvedDeptId ?? info.departmentId
        resolvedDeptName = info.departmentName
      }
    } catch {}

    form.value.manualUserId = userId
    if (resolvedDeptId != null) form.value.departmentId = Number(resolvedDeptId)

    const workStart = getWorkStartForDepartment(resolvedDeptId)
    const payload = buildPayload({ userId, departmentId: resolvedDeptId, departmentName: resolvedDeptName, type, action: nextAction, raw, workStart })

    // 🔎 UI DEBUG: show what the component is sending into postLog (server will log final {data:...})
    console.debug('[Scanner] commit payload ->', payload)

    // --- Add debug logging and strict type handling before checking for existing log ---
    const logDateToCheck = (typeof payload.logDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payload.logDate))
      ? payload.logDate
      : (typeof payload.log_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payload.log_date))
        ? payload.log_date
        : (payload.logDate || payload.log_date || '').slice(0, 10);
    const userIdToCheck = Number(userId);
    console.debug('[Scanner] Checking for existing attendance log:', { userId: userIdToCheck, logDate: logDateToCheck });
    const existing = await getExistingAttendanceLog(userIdToCheck, logDateToCheck)
    let res
    if (existing && (existing.logId || existing.id)) {
      const id = existing.logId || existing.id
      // Use snake_case keys to match Supabase attendance_log columns
      const fieldMap = { 'TIME_IN':'time_in','TIME_OUT':'time_out','LUNCH_START':'lunch_start','LUNCH_END':'lunch_end','BREAK_START':'break_start','BREAK_END':'break_end' }
      const fieldName = fieldMap[nextAction] || 'time_in'
      const patch = { [fieldName]: payload[fieldName], user_id: userId, log_date: payload.log_date || payload.logDate, department_id: resolvedDeptId }
      res = await updateLog(id, patch)
    } else {
      res = await postLog(payload)
    }

    pushLocal({ time: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila', hour12: true }), userId, type, action: nextAction, departmentId: resolvedDeptId, departmentName: resolvedDeptName })
    if (payload.status === 'Late') {
      const scanName = fullName.value || (selectedUser.value && (selectedUser.value.fullName || selectedUser.value.name)) || `#${userId}`;
      note(false, `${scanName},\nLate`, 'late');
      showLateLabel.value = true;
      setTimeout(() => { showLateLabel.value = false }, 2000);
    } else {
      note(true, `${type} ${titleCaseFromEnum(nextAction)} logged for #${userId}`)
      showLateLabel.value = false;
    }
    success = true
    console.log('[Scanner] commit result ->', res)
    loadAdminLogs()

    const scanDept = resolvedDeptName || getDeptName(resolvedDeptId)
    const scanName = fullName.value || (selectedUser.value && (selectedUser.value.fullName || selectedUser.value.name)) || `#${userId}`
    lastScan.value = { name: String(scanName), department: String(scanDept || ''), status: payload.status }

    startCooldownFor(userId)
  } catch (e) {
    console.error('[Scanner] commit error:', e)
    const msg = e?.message || 'Failed to submit log.'
    const m = msg.match(/wait\s+(\d+)\s+minute/i)
    if (m && intendedUserId) startCooldownFor(intendedUserId, Number(m[1]) || COOLDOWN_MINUTES)
    note(false, msg)
  } finally {
    scheduleClearFields(success ? 0 : 2000)
    busy.value = false
  }
}

// Place buildPayload before simulateFingerprint and commit so it is always defined before use
function getWorkStartForDepartment(departmentId) {
  const sched = schedules.value.find(s => String(s.departmentId ?? s.department_id ?? s.id) === String(departmentId));
  return sched?.workStart || null;
}

function isLateForWorkStart(nowDate, workStart) {
  if (!workStart) return false;
  // nowDate: Date object in Manila time
  // workStart: 'HH:mm:ss' or 'HH:mm' string
  const [h, m, s] = workStart.split(':').map(Number);
  const workStartDate = new Date(nowDate);
  workStartDate.setHours(h, m, s || 0, 0);
  return nowDate > workStartDate;
}

function buildPayload({ userId, departmentId, departmentName, type, action, raw, workStart }) {
  const iso = manilaIsoWithOffset();
  const actionEnum = String(action || 'TIME_IN').trim().toUpperCase();
  let statusName = actionEnum;
  // Only check for late on TIME_IN
  if (actionEnum === 'TIME_IN' && workStart) {
    // Get Manila time as Date
    const nowPH = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    if (isLateForWorkStart(nowPH, workStart)) {
      statusName = 'Late';
    } else {
      statusName = 'OnTime';
    }
  }
  const fieldMap = {
    'TIME_IN': 'time_in',
    'TIME_OUT': 'time_out',
    'LUNCH_START': 'lunch_start',
    'LUNCH_END': 'lunch_end',
    'BREAK_START': 'break_start',
    'BREAK_END': 'break_end'
  };
  const fieldName = fieldMap[actionEnum] || 'time_in';
  const timed = { [fieldName]: iso };
  return {
    user_id: userId,
    department_id: departmentId || undefined,
    departmentName: departmentName || undefined,
    log_date: iso.slice(0, 10),
    ...timed,
    type,           // RFID only
    action: actionEnum,
    status: statusName,
    raw: raw || undefined
  };
}
function onManualScan() {
  if (busy.value) return
  const id = Number(form.value.manualUserId)
  if (!id) { note(false, 'Please enter an Employee No.') ; return }
  // do not require department to proceed; backend/resolveDepartment will fill if missing
  commit({ departmentId: form.value.departmentId, manualUserId: id }).catch(() => {})
}

</script>
