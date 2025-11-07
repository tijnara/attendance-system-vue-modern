<template>
  <div class="rounded-2xl p-6 border border-black/5 dark:border-white/10 bg-white/70 dark:bg-neutral-900/70 backdrop-blur shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h3 class="text-lg font-semibold">Recent Logs</h3>
      <button class="btn" @click="$emit('refresh')">Refresh</button>
    </div>
    <div class="overflow-auto">
      <table class="min-w-[800px] w-full text-sm">
        <thead class="text-left border-b border-black/10 dark:border-white/10">
          <tr class="[&>*]:py-2 [&>*]:pr-4">
            <th>Log ID</th><th>User</th><th>Department</th><th>Date</th><th>Time In</th><th>Time Out</th><th class="hidden sm:table-cell">Lunch Start</th><th class="hidden sm:table-cell">Lunch End</th><th class="hidden sm:table-cell">Break Start</th><th class="hidden sm:table-cell">Break End</th><th class="hidden sm:table-cell">Type</th><th class="hidden sm:table-cell">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.logId || row.id" class="border-b border-black/5 dark:border-white/5">
            <td class="py-2 pr-4">{{ row.logId || row.id }}</td>
            <td class="py-2 pr-4">#{{ row.userId ?? row.user_id }}</td>
            <td class="py-2 pr-4">
              {{ row.departmentName || row.department?.departmentName || row.department || (row.departmentId ? ('#' + row.departmentId) : '-') }}
            </td>
            <td class="py-2 pr-4">{{ row.logDate ?? row.log_date }}</td>
            <td class="py-2 pr-4">{{ showTime(row.timeIn ?? row.time_in) }}</td>
            <td class="py-2 pr-4">{{ showTime(row.timeOut ?? row.time_out) }}</td>
            <td class="py-2 pr-4 hidden sm:table-cell">{{ showTime(row.lunchStart ?? row.lunch_start) }}</td>
            <td class="py-2 pr-4 hidden sm:table-cell">{{ showTime(row.lunchEnd ?? row.lunch_end) }}</td>
            <td class="py-2 pr-4 hidden sm:table-cell">{{ showTime(row.breakStart ?? row.break_start) }}</td>
            <td class="py-2 pr-4 hidden sm:table-cell">{{ showTime(row.breakEnd ?? row.break_end) }}</td>
            <td class="py-2 pr-4 hidden sm:table-cell">{{ row.type || '-' }}</td>
            <td class="py-2 pr-4 hidden sm:table-cell">{{ row.action || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
defineProps({ rows: { type: Array, default: () => [] } })
function toHms12(s){
  if (!s && s !== 0) return ''
  // If s is a valid ISO string, parse as PH time
  let dateObj = null;
  if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s)) {
    try {
      // Convert to PH time
      dateObj = new Date(new Date(s).toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    } catch {}
  }
  if (dateObj && !isNaN(dateObj)) {
    let hh = dateObj.getHours()
    const mm = String(dateObj.getMinutes()).padStart(2, '0')
    const ss = String(dateObj.getSeconds()).padStart(2, '0')
    const ap = hh >= 12 ? 'PM' : 'AM'
    hh = hh % 12
    if (hh === 0) hh = 12
    return `${hh}:${mm}${ss ? ':' + ss : ''} ${ap}`
  }
  // fallback: parse as HH:mm:ss
  const m = String(s).match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/)
  if (!m) return ''
  let hh = Number(m[1])
  const mm = String(m[2]).padStart(2,'0')
  const ss = m[3] != null ? String(m[3]).padStart(2,'0') : '00'
  const ap = hh >= 12 ? 'PM' : 'AM'
  hh = hh % 12
  if (hh === 0) hh = 12
  const sec = m[3] != null ? `:${ss}` : ''
  return `${hh}:${mm}${sec} ${ap}`
}
function showTime(v){
  const t = toHms12(v)
  return t || (v ? String(v) : '-')
}
</script>

<style scoped>
.btn{ @apply rounded-xl px-3 py-1.5 border border-black/10 dark:border-white/10 bg-white/60 dark:bg-neutral-900/60 hover:bg-white/80 dark:hover:bg-neutral-800/80; }
</style>
