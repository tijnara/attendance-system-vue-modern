<template>
  <div class="rounded-2xl p-6 border border-black/5 dark:border-white/10 bg-white/70 dark:bg-neutral-900/70 backdrop-blur shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">Recent Logs</h3>
      <button class="btn" @click="$emit('refresh')">Refresh</button>
    </div>
    <div class="overflow-auto">
      <table class="min-w-full text-sm">
        <thead class="text-left border-b border-black/10 dark:border-white/10">
          <tr class="[&>*]:py-2 [&>*]:pr-4">
            <th>Log ID</th><th>User</th><th>Department</th><th>Date</th><th>Time In</th><th>Time Out</th><th>Lunch Start</th><th>Lunch End</th><th>Break Start</th><th>Break End</th><th>Type</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.logId || row.id" class="border-b border-black/5 dark:border-white/5">
            <td class="py-2 pr-4">{{ row.logId || row.id }}</td>
            <td class="py-2 pr-4">#{{ row.userId }}</td>
            <td class="py-2 pr-4">
              {{ row.departmentName || row.department?.departmentName || row.department || (row.departmentId ? ('#' + row.departmentId) : '-') }}
            </td>
            <td class="py-2 pr-4">{{ row.logDate }}</td>
            <td class="py-2 pr-4">{{ row.timeIn || '-' }}</td>
            <td class="py-2 pr-4">{{ row.timeOut || '-' }}</td>
            <td class="py-2 pr-4">{{ row.lunchStart || '-' }}</td>
            <td class="py-2 pr-4">{{ row.lunchEnd || '-' }}</td>
            <td class="py-2 pr-4">{{ row.breakStart || '-' }}</td>
            <td class="py-2 pr-4">{{ row.breakEnd || '-' }}</td>
            <td class="py-2 pr-4">{{ row.type || '-' }}</td>
            <td class="py-2 pr-4">{{ row.action || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
defineProps({ rows: { type: Array, default: () => [] } })
</script>

<style scoped>
.btn{ @apply rounded-xl px-3 py-1.5 border border-black/10 dark:border-white/10 bg-white/60 dark:bg-neutral-900/60 hover:bg-white/80 dark:hover:bg-neutral-800/80; }
</style>
