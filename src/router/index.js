import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// hash 模式：GitHub Pages 无需额外配置即可刷新
const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
  { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
  { path: '/plans', name: 'plans', component: () => import('@/views/PlansView.vue') },
  { path: '/todos', name: 'todos', component: () => import('@/views/TodosView.vue') },
  { path: '/schedule', name: 'schedule', component: () => import('@/views/ScheduleView.vue') },
  { path: '/progress', name: 'progress', component: () => import('@/views/ProgressView.vue') },
  { path: '/logs', name: 'logs', component: () => import('@/views/LogsView.vue') },
  { path: '/more', name: 'more', component: () => import('@/views/MoreView.vue') },
  { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 全局守卫：未登录访问受保护页面时重定向到登录页
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  // 等待会话恢复完成，避免刷新瞬间误判
  if (!auth.ready) {
    await auth.init()
  }
  if (!to.meta.public && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // 已登录访问登录页则回首页
  if (to.name === 'login' && auth.isLoggedIn) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
