import { createRouter, createWebHistory } from 'vue-router'
import Scanner from '../views/Scanner.vue'
import AdminLogs from '../views/AdminLogs.vue'

const routes = [
  { path: '/', name: 'Scanner', component: Scanner },
  { path: '/admin/logs', name: 'AdminLogs', component: AdminLogs },
]

export default createRouter({ history: createWebHistory(), routes })
