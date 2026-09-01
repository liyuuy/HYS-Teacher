<template>
  <div class="page-container">
    <h2 class="page-title">更多</h2>
    <div class="more-grid">
      <div
        v-for="item in entries"
        :key="item.path"
        class="more-item"
        @click="router.push(item.path)"
      >
        <div class="more-icon" :style="{ background: item.bg }">
          <van-icon :name="item.icon" size="26" color="#fff" />
        </div>
        <span class="more-name">{{ item.title }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

// 移动端「更多」入口：进度 / 日志 / 设置
const entries = [
  { title: '教学进度', path: '/progress', icon: 'bar-chart-o', bg: '#9BBBF4' },
  { title: '班级日志', path: '/logs', icon: 'chat-o', bg: '#67C23A' },
  { title: '设置', path: '/settings', icon: 'setting-o', bg: '#F2A84B' }
]
</script>

<style scoped>
.more-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.more-item {
  background: #fff;
  border-radius: var(--edu-radius);
  padding: 20px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.more-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.more-name {
  font-size: 14px;
  color: var(--edu-text);
}
</style>
