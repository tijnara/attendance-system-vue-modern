import { createRouter, createWebHistory } from 'vue-router'
import Scanner from '../views/Scanner.vue'
import AdminLogs from '../views/AdminLogs.vue'
import Login from '../views/Login.vue'

const routes = [
  { path: '/', name: 'Scanner', component: Scanner },
  { path: '/admin/logs', name: 'AdminLogs', component: AdminLogs },
  { path: '/login', name: 'Login', component: Login },
]

export default createRouter({ history: createWebHistory(), routes })
