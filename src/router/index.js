import { createRouter, createWebHistory } from 'vue-router'
import Scanner from '../views/Scanner.vue'
import AdminLogs from '../views/AdminLogs.vue'
import Login from '../views/Login.vue'
import AdminDashboard from '../views/AdminDashboard.vue'

const routes = [
  { path: '/', name: 'Scanner', component: Scanner },
  { path: '/admin/logs', name: 'AdminLogs', component: AdminLogs },
  { path: '/login', name: 'Login', component: Login },
  { path: '/admin/dashboard', name: 'AdminDashboard', component: AdminDashboard },
]

export default createRouter({ history: createWebHistory(), routes })
