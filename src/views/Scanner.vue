<template>
  <div class="space-y-8">
    <!-- Page Title -->
    <div class="text-center">
      <h1 class="text-3xl md:text-4xl font-bold">Employee Time Tracking System</h1>
      <p class="mt-1 text-neutral-600">Digital time recording and attendance management</p>
    </div>

    <!-- Clock / Date Card -->
    <div class="rounded-2xl p-6 md:p-8 border border-black/5 bg-white/70 backdrop-blur shadow-sm">
      <div class="flex items-center gap-4 text-2xl md:text-3xl font-semibold">
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' class="w-7 h-7 text-indigo-600"><path fill="currentColor" d="M12 1a11 11 0 1 0 11 11A11 11 0 0 0 12 1m1 11H7v-2h4V5h2z"/></svg>
        <div class="tabular-nums">{{ timeString }}</div>
      </div>
      <div class="mt-2 flex items-center gap-2 text-sm text-neutral-700">
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' class="w-4 h-4 text-indigo-600"><path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3m1 15H4V10h16z"/></svg>
        <span>{{ dateString }}</span>
      </div>
    </div>

    <!-- Main grid -->
    <div class="grid lg:grid-cols-7 gap-6">
      <!-- Left column -->
      <div class="space-y-6 lg:col-span-2">
        <!-- Employee Information card -->
        <div class="rounded-2xl p-6 border border-black/5 bg-white/70 backdrop-blur shadow-sm">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' class="w-5 h-5"><path fill="currentColor" d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5m-7 8a7 7 0 0 1 14 0z"/></svg>
            </div>
            <h3 class="text-lg font-semibold">Employee Information</h3>
          </div>
          <!-- Photo placeholder / preview (no upload) -->
          <div class="mb-4 flex items-center gap-4">
            <div class="w-20 h-20 rounded-full bg-neutral-200 overflow-hidden flex items-center justify-center text-neutral-600 border border-black/10">
              <img v-if="displayPhoto" :src="displayPhoto" alt="Employee photo" class="w-full h-full object-cover" />
              <span v-else class="font-semibold">{{ initials }}</span>
            </div>
            <div>
              <label class="block text-sm mb-1 opacity-80">Photo</label>
              <div class="text-xs text-neutral-600">Photo will appear here when available from the database.</div>
            </div>
          </div>
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm mb-1 opacity-80">Employee No:</label>
              <input class="w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400" type="number" v-model.number="form.manualUserId" placeholder="Enter employee number" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm mb-1 opacity-80">Full Name:</label>
              <div class="w-full rounded-xl border border-black/10 bg-white/50 px-3 py-2 text-base font-medium min-h-[40px] flex items-center">
                {{ fullName || (selectedUser && (selectedUser.fullName || selectedUser.name)) || '—' }}
              </div>
            </div>
            <div>
              <label class="block text-sm mb-1 opacity-80">Department:</label>
              <div class="w-full rounded-xl border border-black/10 bg-white/50 px-3 py-2 text-base font-medium min-h-[40px] flex items-center">
                {{ departmentNameDisplay }}
              </div>
            </div>
          </div>
        </div>

        <!-- Fingerprint Scan card -->
        <ScanCard
          kiosk
          v-model="form"
          :busy="busy"
          @simulate-fp="simulateFingerprint"
          @submit="onKeyboardSubmit"
          @commit="commit"
          @clear="clearForm"
        />
      </div>

      <!-- Department Schedule table -->
      <div class="lg:col-span-5">
        <div class="rounded-2xl p-0 border border-black/5 bg-white/70 backdrop-blur shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-black/10"><h3 class="text-lg font-semibold">Department Schedule</h3></div>
          <div class="p-4">
            <div v-if="schedulesLoading" class="text-sm text-neutral-600">Loading schedules...</div>
            <div v-else-if="schedulesError" class="text-sm text-red-600">Failed to load schedules: {{ schedulesError }}</div>
            <div v-else>
              <table class="w-full table-fixed text-xs">
                <thead class="text-left border-b border-black/10 bg-black/[.03]">
                  <tr class="[&>*]:py-1 [&>*]:px-2 [&>*]:align-top">
                    <th>Department</th>
                    <th>Working Days</th>
                    <th>Work Start</th>
                    <th>Work End</th>
                    <th>Lunch Start</th>
                    <th>Lunch End</th>
                    <th>Break Start</th>
                    <th>Break End</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in schedules" :key="s.scheduleId ?? s.departmentId" class="border-b border-black/5">
                    <td class="py-1 px-2 whitespace-normal break-words align-top">{{ getDeptName(s.departmentId) }}</td>
                    <td class="py-1 px-2 whitespace-normal break-words align-top">{{ s.workingDays ?? '' }}</td>
                    <td class="py-1 px-2 whitespace-normal break-words align-top">{{ s.workStart ?? '' }}</td>
                    <td class="py-1 px-2 whitespace-normal break-words align-top">{{ s.workEnd ?? '' }}</td>
                    <td class="py-1 px-2 whitespace-normal break-words align-top">{{ s.lunchStart ?? '' }}</td>
                    <td class="py-1 px-2 whitespace-normal break-words align-top">{{ s.lunchEnd ?? '' }}</td>
                    <td class="py-1 px-2 whitespace-normal break-words align-top">{{ s.breakStart ?? '' }}</td>
                    <td class="py-1 px-2 whitespace-normal break-words align-top">{{ s.breakEnd ?? '' }}</td>
                    <td class="py-1 px-2 whitespace-normal break-words align-top">{{ s.workdaysNote ?? '' }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-if="schedules.length === 0" class="text-sm text-neutral-600 p-4">No schedules available.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <StatusToast :ok="toast.ok" :message="toast.msg" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import ScanCard from '../components/ScanCard.vue'
import StatusToast from '../components/StatusToast.vue'
// LogTable removed from this view to match the provided UI
import {
  postLog,
  findUserByRfidOrBarcode,
  getLogs,
  resolveDepartmentForUser,
  getUserById,
  normalizeStatus,
  getDepartmentSchedules,
  getDepartments
} from '../services/api.js'

const form = ref({
    action: 'TIME_IN',
  departmentId: undefined,
  manualUserId: undefined,
  keyboard: ''
})

const busy = ref(false)
const lastLocalLogs = ref([])
const toast = ref({ ok: false, msg: '' })
const adminRows = ref([])

// clock
const now = ref(new Date())
let t = null
onMounted(() => { t = setInterval(() => now.value = new Date(), 1000) })
onBeforeUnmount(() => { if (t) clearInterval(t) })
// Always format display in Philippines time
const timeString = computed(() => now.value.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute:'2-digit', second:'2-digit', hour12: true }))
const dateString = computed(() => now.value.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday:'long', year:'numeric', month:'long', day:'numeric' }))

// dummy form fields for UI only
const fullName = ref('')

// Employee photo handling (no upload)
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

watch(() => form.value.manualUserId, async (id) => {
  selectedUser.value = null
  if (id == null || id === '') { fullName.value = ''; form.value.departmentId = undefined; return }
  try {
    const user = await getUserById(id)
    if (user) {
      selectedUser.value = user
      const name = user.fullName || user.name || [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ').trim()
      if (name) fullName.value = name
      // Auto-populate department based on user record or department name
      try {
        const directId = user.departmentId ?? user.department_id ?? user?.department?.departmentId ?? user?.department?.id
        if (directId != null) {
          form.value.departmentId = Number(directId)
        } else {
          const info = await resolveDepartmentForUser(user.userId ?? user.id ?? id)
          if (info?.departmentId != null) form.value.departmentId = Number(info.departmentId)
        }
      } catch (_) {}
    } else {
      fullName.value = ''
      form.value.departmentId = undefined
    }
  } catch (_) { fullName.value = ''; form.value.departmentId = undefined }
})


// Manila timezone helpers
const manilaDateYMD = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date())
const manilaIsoWithOffset = () => {
  const parts = new Intl.DateTimeFormat('en-PH', { timeZone:'Asia/Manila', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).formatToParts(new Date()).reduce((acc,p)=>{ acc[p.type]=p.value; return acc; }, {})
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`
}

// ---------- UI helpers ----------
function note(ok, msg) {
  toast.value = { ok, msg }
  setTimeout(() => { toast.value = { ok: false, msg: '' } }, 3000)
}

function pushLocal(entry) {
  lastLocalLogs.value.unshift(entry)
  if (lastLocalLogs.value.length > 12) lastLocalLogs.value.pop()
}

function clearForm() {
  form.value = {
    action: 'TIME_IN',
    departmentId: undefined,
    manualUserId: undefined,
    keyboard: ''
  }
}

// ---------- Data loaders ----------
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

// -------- Department Schedules --------
const schedules = ref([])
const schedulesLoading = ref(true)
const schedulesError = ref('')

// Departments used to resolve department names per schedule
const departments = ref([])
const deptMap = computed(() => {
  const map = {}
  for (const d of departments.value || []) {
    const key = String(d.departmentId ?? d.id)
    map[key] = d
  }
  return map
})
function getDeptName(id) {
  if (id == null) return 'Unknown'
  const d = deptMap.value[String(id)]
  return d?.departmentName || `Dept ${id}`
}

// Display name for the Department label (read-only), similar to Full Name
const departmentNameDisplay = computed(() => {
  const id = form.value.departmentId
  if (id != null) {
    const d = deptMap.value[String(id)]
    return (d?.departmentName || d?.name || `Dept ${id}`)
  }
  const u = selectedUser.value
  const nm = u?.departmentName ?? u?.department?.departmentName ?? u?.department?.name
  return nm || '—'
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
  } catch (e) {
    departments.value = []
  }
}

onMounted(() => { loadSchedules(); loadDepartments() })

// simple sample data for UI table only
const sampleRecord = ref({
  1: { in1: '08:00', out1: '12:00', in2: '13:00', out2: '17:00', hrs: 8, mins: '' },
  2: { in1: '08:00', out1: '12:00', in2: '13:00', out2: '17:00', hrs: 8, mins: '' },
  3: { in1: '08:00', out1: '12:00', in2: '13:00', out2: '17:00', hrs: 8, mins: '' }
})

// ---------- Core helpers ----------
function titleCaseFromEnum(s = '') {
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

async function verifyUserExists(id) {
  try {
    const user = await getUserById(id, { noMock: true })
    return !!(user && (user.userId != null || user.id != null))
  } catch (_) {
    return false
  }
}

// Determine the user's next action for today based on existing logs
const ACTION_SEQUENCE = ['TIME_IN', 'LUNCH_START', 'LUNCH_END', 'BREAK_START', 'BREAK_END', 'TIME_OUT']

async function getTodayLogForUser(userId) {
  const dateStr = manilaDateYMD()
  try {
    const res = await getLogs({ userId, from: dateStr, to: dateStr })
    const arr = Array.isArray(res) ? res : (res?.content || [])
    const match = arr.find(r => {
      const uid = String(r.userId ?? r.user?.userId ?? r.user?.id ?? r.user_id)
      const d = (r.logDate || (r.timeIn || r.timeOut || r.lunchStart || r.lunchEnd || r.breakStart || r.breakEnd || '')).slice(0,10)
      return uid === String(userId) && d === dateStr
    })
    return match || null
  } catch (e) {
    return null
  }
}

function countRecordedActions(row) {
  if (!row) return 0
  const fields = ['timeIn','lunchStart','lunchEnd','breakStart','breakEnd','timeOut']
  return fields.reduce((n, f) => n + (row[f] ? 1 : 0), 0)
}

async function determineNextAction(userId) {
  const today = await getTodayLogForUser(userId)
  const count = countRecordedActions(today)
  return ACTION_SEQUENCE[count] || null
}

/**
 * Resolve the user from either manual id or scanned value.
 * Returns { userId, type, raw }
 */
async function resolveUser({ manualUserId, keyboard }) {
  let userId = manualUserId
  let type = 'BARCODE'
  const raw = (keyboard || '').trim()

  // manual id wins, but verify existence
  if (userId && !Number.isNaN(Number(userId))) {
    const ok = await verifyUserExists(userId)
    if (!ok) throw new Error(`User #${userId} not found.`)
    return { userId: Number(userId), type, raw }
  }

  if (!raw) throw new Error('Provide a User ID or scan an RFID/Barcode value.')

  // guess rfid vs barcode
  const looksHex = /^[0-9A-Fa-f]+$/.test(raw) && raw.length >= 8
  type = looksHex ? 'RFID' : 'BARCODE'

  const user = await findUserByRfidOrBarcode(raw)
  if (user?.id || user?.userId) {
    userId = user.id || user.userId
    return { userId: Number(userId), type, raw }
  }

  throw new Error('User not found for given RFID/Barcode.')
}

function buildPayload({ userId, departmentId, departmentName, type, action, raw }) {
  // Use Philippines time for timestamps
  const iso = manilaIsoWithOffset()
  const actionEnum = String(action || 'TIME_IN').trim().toUpperCase()
  const statusName = normalizeStatus(actionEnum)
  // Decide which time field to populate based on action
  const fieldMap = {
    'TIME_IN': 'timeIn',
    'TIME_OUT': 'timeOut',
    'LUNCH_START': 'lunchStart',
    'LUNCH_END': 'lunchEnd',
    'BREAK_START': 'breakStart',
    'BREAK_END': 'breakEnd'
  }
  const fieldName = fieldMap[actionEnum] || 'timeIn'
  const timed = { [fieldName]: iso }
  return {
    userId,
    departmentId: departmentId || undefined,
    departmentName: departmentName || undefined,
    logDate: iso.slice(0, 10),
    ...timed,                    // set the corresponding time field (same logic as timeIn)
    type,                        // FINGERPRINT | RFID | BARCODE
    action: actionEnum,          // keep the literal action (TIME_IN, LUNCH_START, etc.)
    status: statusName,          // normalized status for servers that need it
    raw: raw || undefined
  }
}

// ---------- Actions ----------
// Throttle state to avoid rapid duplicate scans
let lastSubmit = { key: '', ts: 0 }

async function simulateFingerprint() {
  const targetUserId = Number(form.value.manualUserId) || 133
  const nextAction = await determineNextAction(targetUserId)
  if (!nextAction) {
    note(false, 'All required scans for today are already recorded (TIME_OUT logged).')
    return
  }
  const key = `${targetUserId}|${nextAction}|${manilaDateYMD()}`
  const now = Date.now()
  if (lastSubmit.key === key && (now - lastSubmit.ts) < 1500) {
    note(false, 'Duplicate scan ignored.')
    return
  }
  lastSubmit = { key, ts: now }

  if (busy.value) return
  busy.value = true
  try {
    // verify user exists via API
    const ok = await verifyUserExists(targetUserId)
    if (!ok) {
      note(false, `User #${targetUserId} not found.`)
      return
    }

    // fetch and display user full name
    try {
      const u = await getUserById(targetUserId)
      if (u) {
        selectedUser.value = u
        const name = u.fullName || u.name || [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ').trim()
        if (name) fullName.value = name
      }
    } catch (_) {}

    let autoDeptId = form.value.departmentId
    let autoDeptName = undefined
    if (autoDeptId == null) {
      const info = await resolveDepartmentForUser(targetUserId)
      autoDeptId = info?.departmentId
      autoDeptName = info?.departmentName
    }

    // Reflect auto-detected department and user in the UI
    form.value.manualUserId = targetUserId
    if (autoDeptId != null) form.value.departmentId = Number(autoDeptId)

    const payload = buildPayload({
      userId: targetUserId,
      departmentId: autoDeptId,
      departmentName: autoDeptName,
      type: 'FINGERPRINT',
      action: nextAction,
      raw: 'SIMULATED_FP_4500'
    })

    const res = await postLog(payload)
    pushLocal({ time: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }), userId: targetUserId, type: 'FINGERPRINT', action: nextAction, departmentId: autoDeptId, departmentName: autoDeptName })
    note(true, `Fingerprint ${titleCaseFromEnum(nextAction)} logged for #${targetUserId}`)
    console.log('[Scanner] simulateFingerprint ->', res)
    form.value.action = nextAction
    loadAdminLogs()
  } catch (e) {
    console.error('[Scanner] simulateFingerprint error:', e)
    note(false, e?.message || 'Failed to log fingerprint.')
  } finally {
    busy.value = false
  }
}

async function onKeyboardSubmit(value) {
  form.value.keyboard = value
  await commit(form.value)
}

async function commit({ action, departmentId, manualUserId, keyboard }) {
  // Per user/action/date throttle
  try {
    const tentativeUser = Number(manualUserId) || undefined
    const keyUser = tentativeUser || 0
    const key = `${keyUser}|${String(action || '').toUpperCase()}|${manilaDateYMD()}`
    const now = Date.now()
    if (lastSubmit.key === key && (now - lastSubmit.ts) < 1500) {
      note(false, 'Duplicate scan ignored.')
      return
    }
    lastSubmit = { key, ts: now }
  } catch (_) {}

  if (busy.value) return
  busy.value = true
  try {
    const { userId, type, raw } = await resolveUser({ manualUserId, keyboard })
    let resolvedDeptId = departmentId
    let resolvedDeptName = undefined
    // Always attempt to resolve department info for display purposes
    try {
      const info = await resolveDepartmentForUser(userId)
      if (info) {
        resolvedDeptId = resolvedDeptId ?? info.departmentId
        resolvedDeptName = info.departmentName
      }
    } catch (_) {}

    // Reflect resolved user and department in the UI
    form.value.manualUserId = userId
    if (resolvedDeptId != null) form.value.departmentId = Number(resolvedDeptId)

    const payload = buildPayload({ userId, departmentId: resolvedDeptId, departmentName: resolvedDeptName, type, action, raw })
    const res = await postLog(payload)
    pushLocal({ time: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }), userId, type, action, departmentId: resolvedDeptId, departmentName: resolvedDeptName })
    note(true, `${type} ${titleCaseFromEnum(action)} logged for #${userId}`)
    console.log('[Scanner] commit payload ->', payload)
    console.log('[Scanner] commit result  ->', res)
    clearForm()
    loadAdminLogs()
  } catch (e) {
    console.error('[Scanner] commit error:', e)
    note(false, e?.message || 'Failed to submit log.')
  } finally {
    busy.value = false
  }
}
</script>
