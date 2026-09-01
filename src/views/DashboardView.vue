<template>
  <div class="page-container">
    <div class="dash-header">
      <div>
        <h2 class="page-title">{{ greeting() }}，{{ displayName }}</h2>
        <p class="dash-date">{{ todayStr() }} · {{ weekdayName(todayWeekday()) }}</p>
      </div>
    </div>

    <!-- 今日课表 -->
    <div class="edu-card dash-card" @click="go('/schedule')">
      <div class="card-head">
        <span class="card-title">今日课表</span>
        <van-tag round color="#9BBBF4">共 {{ todaySchedule.length }} 节</van-tag>
      </div>
      <van-empty v-if="loading" description="加载中…" :image-size="60" />
      <van-empty v-else-if="todaySchedule.length === 0" description="今天没有课" :image-size="60" />
      <div v-else class="sch-list">
        <div v-for="item in todaySchedule" :key="item.id" class="sch-item">
          <span class="sch-period">第{{ item.period }}节</span>
          <span class="sch-dot" :style="{ background: item.color || '#9BBBF4' }"></span>
          <span class="sch-course">{{ item.course }}</span>
          <span class="sch-meta">
            {{ item.class_name || '' }} {{ item.location ? '· ' + item.location : '' }}
          </span>
        </div>
      </div>
    </div>

    <!-- 今日计划 -->
    <div class="edu-card dash-card" @click="go('/plans')">
      <div class="card-head">
        <span class="card-title">今日计划</span>
        <van-tag round color="#67C23A">完成 {{ donePlanCount }}/{{ todayPlans.length }}</van-tag>
      </div>
      <van-empty v-if="loading" description="加载中…" :image-size="60" />
      <van-empty v-else-if="todayPlans.length === 0" description="今天还没有计划" :image-size="60" />
      <van-cell-group v-else inset>
        <van-cell
          v-for="item in todayPlans"
          :key="item.id"
          :title="item.content"
          :label="planLabel(item)"
          clickable
          @click.stop="togglePlan(item)"
        >
          <template #right-icon>
            <van-checkbox
              :model-value="item.status === '已完成'"
              :checked-color="checkedColor"
              @click.stop="togglePlan(item)"
            />
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 未完成待办 -->
    <div class="edu-card dash-card" @click="go('/todos')">
      <div class="card-head">
        <span class="card-title">待办事项</span>
        <van-tag round :color="overdueCount > 0 ? '#EE6161' : '#F2A84B'">
          未完成 {{ pendingTodos.length }} · 逾期 {{ overdueCount }}
        </van-tag>
      </div>
      <van-empty v-if="loading" description="加载中…" :image-size="60" />
      <van-empty v-else-if="pendingTodos.length === 0" description="没有未完成的待办" :image-size="60" />
      <van-cell-group v-else inset>
        <van-cell
          v-for="item in pendingTodos"
          :key="item.id"
          :title="item.title"
          :label="todoLabel(item)"
          :class="{ overdue: isOverdue(item) }"
          clickable
          @click.stop="go('/todos')"
        >
          <template #right-icon>
            <van-checkbox
              :model-value="false"
              :checked-color="checkedColor"
              @click.stop="toggleTodo(item)"
            />
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { supabase } from '@/api/supabase'
import { useAuthStore } from '@/stores/auth'
import { todayStr, todayWeekday, weekdayName, greeting, dateDesc, priorityName, priorityTagType } from '@/utils'

const auth = useAuthStore()
const router = useRouter()
const checkedColor = '#9BBBF4'

const loading = ref(true)
const todaySchedule = ref([])
const todayPlans = ref([])
const pendingTodos = ref([])

const displayName = computed(() => {
  const meta = auth.user?.user_metadata
  return meta?.display_name || auth.user?.email?.split('@')[0] || '老师'
})

const donePlanCount = computed(() => todayPlans.value.filter((p) => p.status === '已完成').length)
const overdueCount = computed(() => pendingTodos.value.filter((t) => isOverdue(t)).length)

function isOverdue(t) {
  return t.status !== 'done' && t.due_date && t.due_date < todayStr()
}

function planLabel(item) {
  return `${item.plan_type} · 优先级${priorityName(item.priority)}`
}

function todoLabel(item) {
  const overdue = isOverdue(item) ? '【逾期】' : ''
  return `${overdue}${item.due_date ? dateDesc(item.due_date) : '无截止日期'} · ${priorityName(item.priority)}`
}

function go(path) {
  router.push(path)
}

// 快速勾选完成今日计划
async function togglePlan(item) {
  const next = item.status === '已完成' ? '待办' : '已完成'
  const { error } = await supabase.from('daily_plans').update({ status: next }).eq('id', item.id)
  if (error) {
    showToast('操作失败')
    return
  }
  item.status = next
}

// 快速勾选完成待办
async function toggleTodo(item) {
  const { error } = await supabase
    .from('todos')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', item.id)
  if (error) {
    showToast('操作失败')
    return
  }
  pendingTodos.value = pendingTodos.value.filter((t) => t.id !== item.id)
  showToast('已完成')
}

async function load() {
  loading.value = true
  const today = todayStr()
  const weekday = todayWeekday()
  const uid = auth.user.id

  const [sch, plans, todos] = await Promise.all([
    supabase
      .from('schedule')
      .select('*')
      .eq('user_id', uid)
      .eq('weekday', weekday)
      .order('period', { ascending: true }),
    supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', uid)
      .eq('plan_date', today)
      .order('priority', { ascending: true }),
    supabase
      .from('todos')
      .select('*')
      .eq('user_id', uid)
      .neq('status', 'done')
      .order('priority', { ascending: true })
      .order('due_date', { ascending: true })
  ])

  todaySchedule.value = sch.data || []
  todayPlans.value = plans.data || []
  pendingTodos.value = (todos.data || []).filter((t) => !t.due_date || t.due_date <= today)
  loading.value = false
}

onMounted(load)
</script>

<style scoped>
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.dash-date {
  color: var(--edu-text-light);
  margin: 0;
  font-size: 14px;
}

.dash-card {
  cursor: pointer;
  transition: transform 0.1s;
}

.dash-card:active {
  transform: scale(0.99);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
}

/* 课表列表 */
.sch-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sch-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f8f9fc;
  border-radius: 10px;
}

.sch-period {
  font-size: 12px;
  color: var(--edu-text-light);
  flex-shrink: 0;
}

.sch-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sch-course {
  font-weight: 600;
  font-size: 15px;
}

.sch-meta {
  margin-left: auto;
  font-size: 12px;
  color: var(--edu-text-light);
}

/* 逾期待办标红 */
.overdue :deep(.van-cell__title),
.overdue :deep(.van-cell__label) {
  color: var(--edu-danger);
}
</style>
