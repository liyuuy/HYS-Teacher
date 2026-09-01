<template>
  <router-view v-if="!auth.ready" />
  <div v-else-if="auth.isLoggedIn" class="app-layout">
    <!-- PC 端左侧固定菜单 -->
    <aside class="side-menu" v-if="isDesktop">
      <div class="side-brand">
        <span class="brand-dot"></span>
        教师工作台
      </div>
      <nav class="side-nav">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="side-nav-item"
          :class="{ active: route.path === item.path }"
        >
          <van-icon :name="item.icon" />
          <span>{{ item.title }}</span>
        </router-link>
      </nav>
      <div class="side-footer">
        <router-link to="/settings" class="side-nav-item" :class="{ active: route.path === '/settings' }">
          <van-icon name="setting-o" />
          <span>设置</span>
        </router-link>
      </div>
    </aside>

    <!-- 内容区 -->
    <main class="app-main">
      <router-view />
    </main>

    <!-- 移动端底部 TabBar -->
    <van-tabbar v-model="activeTab" route fixed placeholder safe-area-inset-bottom v-if="!isDesktop">
      <van-tabbar-item v-for="item in tabItems" :key="item.path" :to="item.path" :icon="item.icon">
        {{ item.title }}
      </van-tabbar-item>
    </van-tabbar>
  </div>
  <router-view v-else />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()

// PC / 移动端判定（<768px 为移动端）
const isDesktop = computed(() => window.innerWidth >= 768)

// 顶部 TabBar 当前项（跟随路由）
const activeTab = ref(0)

// 菜单项
const menuItems = [
  { path: '/', title: '今日概览', icon: 'wap-home-o' },
  { path: '/plans', title: '每日计划', icon: 'notes-o' },
  { path: '/todos', title: '待办事项', icon: 'todo-list-o' },
  { path: '/schedule', title: '课表', icon: 'calendar-o' },
  { path: '/progress', title: '教学进度', icon: 'bar-chart-o' },
  { path: '/logs', title: '班级日志', icon: 'chat-o' }
]

// 移动端底部 Tab：今日 / 计划 / 待办 / 课表 / 更多
const tabItems = [
  { path: '/', title: '今日', icon: 'wap-home-o' },
  { path: '/plans', title: '计划', icon: 'notes-o' },
  { path: '/todos', title: '待办', icon: 'todo-list-o' },
  { path: '/schedule', title: '课表', icon: 'calendar-o' },
  { path: '/more', title: '更多', icon: 'apps-o' }
]

// 「更多」Tab 映射到进度页（更多页面内的进度/日志/设置通过菜单进入）
watch(
  () => route.path,
  (p) => {
    const idx = tabItems.findIndex((t) => t.path === p)
    if (idx >= 0) activeTab.value = idx
    // 进度/日志/设置等归属「更多」
    else if (['/progress', '/logs', '/settings'].includes(p)) activeTab.value = 4
  },
  { immediate: true }
)
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}

/* ---- PC 左菜单 ---- */
.side-menu {
  position: fixed;
  top: 0;
  left: 0;
  width: 220px;
  height: 100vh;
  background: #fff;
  border-right: 1px solid #ececec;
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  z-index: 100;
}

.side-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--edu-primary-dark);
  padding: 8px 12px 20px;
}

.brand-dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  background: var(--edu-primary);
  display: inline-block;
}

.side-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.side-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 10px;
  color: var(--edu-text);
  text-decoration: none;
  font-size: 15px;
  transition: background 0.15s;
  min-height: 44px;
}

.side-nav-item .van-icon {
  font-size: 18px;
  color: var(--edu-text-light);
}

.side-nav-item:hover {
  background: var(--edu-bg);
}

.side-nav-item.active {
  background: var(--edu-primary-light);
  color: var(--edu-primary-dark);
  font-weight: 600;
}

.side-nav-item.active .van-icon {
  color: var(--edu-primary-dark);
}

.side-footer {
  border-top: 1px solid #f0f0f0;
  padding-top: 8px;
}

/* ---- 内容区 ---- */
.app-main {
  margin-left: 0;
  min-height: 100vh;
}

@media (min-width: 768px) {
  .app-main {
    margin-left: 220px;
  }
}
</style>
