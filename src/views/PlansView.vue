<template>
  <div class="page-container">
    <h2 class="page-title">每日计划</h2>

    <!-- 日期选择条 -->
    <div class="date-bar scroll-x">
      <van-button
        v-for="offset in offsets"
        :key="offset.value"
        size="small"
        :type="selectedOffset === offset.value ? 'primary' : 'default'"
        :plain="selectedOffset !== offset.value"
        round
        @click="switchDate(offset.value)"
      >
        {{ offset.label }}
      </van-button>
      <van-icon name="calendar-o" class="date-pick-icon" @click="showCalendar = true" />
    </div>

    <!-- 计划列表 -->
    <div v-if="loading" class="empty-box">加载中…</div>
    <EmptyState v-else-if="plans.length === 0" description="这一天还没有计划">
      <van-button size="small" type="primary" round @click="openEdit(null)">新增计划</van-button>
    </EmptyState>

    <template v-else>
      <div v-for="item in plans" :key="item.id" class="edu-card plan-card" :class="{ done: item.status === '已完成' }">
        <div class="plan-main" @click="openEdit(item)">
          <div class="plan-content">{{ item.content }}</div>
          <div class="plan-tags">
            <van-tag :type="priorityTagType(item.priority)" round>优先级{{ priorityName(item.priority) }}</van-tag>
            <van-tag plain round color="#9BBBF4">{{ item.plan_type }}</van-tag>
          </div>
        </div>
        <div class="plan-actions">
          <van-checkbox
            :model-value="item.status === '已完成'"
            :checked-color="checkedColor"
            @click="toggleStatus(item)"
          />
          <van-icon name="edit" color="#9BBBF4" @click="openEdit(item)" />
          <van-icon name="delete-o" color="#EE6161" @click="onDelete(item)" />
          <van-icon name="revoke" color="#7a7a7a" title="复制到明天" @click="copyToTomorrow(item)" />
        </div>
      </div>
      <van-button block type="primary" plain round @click="openEdit(null)" class="add-btn">
        + 新增计划
      </van-button>
    </template>

    <!-- 日期选择弹窗 -->
    <van-popup v-model:show="showCalendar" position="bottom" round>
      <van-date-picker
        v-model="pickerValue"
        :min-date="minDate"
        :max-date="maxDate"
        title="选择日期"
        @confirm="onPickDate"
        @cancel="showCalendar = false"
      />
    </van-popup>

    <!-- 新增 / 编辑弹窗 -->
    <van-popup v-model:show="showEdit" position="bottom" round>
      <div class="edit-pop">
        <h3>{{ editing.id ? '编辑计划' : '新增计划' }}</h3>
        <van-form @submit="onSave">
          <van-field
            v-model="editing.content"
            label="内容"
            type="textarea"
            rows="2"
            autosize
            placeholder="今天要做什么"
            :rules="[{ required: true, message: '请输入计划内容' }]"
          />
          <van-field label="类型" readonly>
            <template #input>
              <van-radio-group v-model="editing.plan_type" direction="horizontal">
                <van-radio name="教学">教学</van-radio>
                <van-radio name="班主任">班主任</van-radio>
                <van-radio name="其他">其他</van-radio>
              </van-radio-group>
            </template>
          </van-field>
          <van-field label="优先级" readonly>
            <template #input>
              <van-radio-group v-model="editing.priority" direction="horizontal">
                <van-radio :name="1">高</van-radio>
                <van-radio :name="2">中</van-radio>
                <van-radio :name="3">低</van-radio>
              </van-radio-group>
            </template>
          </van-field>
          <van-field label="日期">
            <template #input>
              <van-date-picker
                v-model="editDateValue"
                :min-date="minDate"
                :max-date="maxDate"
                :columns-type="['year', 'month', 'day']"
                @confirm="onEditDate"
                class="inline-picker"
              />
            </template>
          </van-field>
          <div class="edit-btns">
            <van-button round block type="primary" native-type="submit">保存</van-button>
            <van-button round block plain @click="showEdit = false">取消</van-button>
          </div>
        </van-form>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showConfirmDialog, showSuccessToast, showFailToast } from 'vant'
import { supabase } from '@/api/supabase'
import { useAuthStore } from '@/stores/auth'
import EmptyState from '@/components/EmptyState.vue'
import {
  todayStr, dateByOffset, formatDate, dateDesc, priorityName, priorityTagType
} from '@/utils'

const auth = useAuthStore()
const checkedColor = '#9BBBF4'

const selectedOffset = ref(0)
const selectedDate = ref(todayStr())
const plans = ref([])
const loading = ref(true)

const showCalendar = ref(false)
const pickerValue = ref([])
const showEdit = ref(false)
const editing = ref(createEmpty())
const editDateValue = ref([])

const minDate = new Date(2020, 0, 1)
const maxDate = new Date(2035, 11, 31)

// 日期条：近 7 天
const offsets = computed(() => {
  const arr = []
  for (let i = -3; i <= 3; i++) {
    const d = dateByOffset(i)
    arr.push({ value: i, label: dateDesc(formatDate(d)) })
  }
  return arr
})

function createEmpty() {
  return { id: null, content: '', plan_type: '教学', priority: 2, status: '待办', plan_date: selectedDate.value }
}

function switchDate(offset) {
  selectedOffset.value = offset
  selectedDate.value = formatDate(dateByOffset(offset))
  load()
}

function onPickDate({ selectedValues }) {
  const [y, m, d] = selectedValues
  selectedDate.value = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  selectedOffset.value = 99 // 自定义日期不匹配偏移
  showCalendar.value = false
  load()
}

function onEditDate({ selectedValues }) {
  const [y, m, d] = selectedValues
  editing.value.plan_date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function openEdit(item) {
  editing.value = item
    ? { ...item }
    : { id: null, content: '', plan_type: '教学', priority: 2, status: '待办', plan_date: selectedDate.value }
  showEdit.value = true
}

async function onSave() {
  const payload = {
    plan_date: editing.value.plan_date || selectedDate.value,
    content: editing.value.content,
    plan_type: editing.value.plan_type,
    priority: editing.value.priority,
    status: editing.value.status
  }
  let error = null
  if (editing.value.id) {
    const res = await supabase.from('daily_plans').update(payload).eq('id', editing.value.id)
    error = res.error
  } else {
    const res = await supabase.from('daily_plans').insert({ ...payload, user_id: auth.user.id })
    error = res.error
  }
  if (error) {
    showFailToast(error.message || '保存失败')
    return
  }
  showSuccessToast('已保存')
  showEdit.value = false
  load()
}

async function toggleStatus(item) {
  const next = item.status === '已完成' ? '待办' : '已完成'
  const { error } = await supabase.from('daily_plans').update({ status: next }).eq('id', item.id)
  if (!error) item.status = next
}

async function onDelete(item) {
  try {
    await showConfirmDialog({ title: '删除计划', message: '确定删除这条计划吗？' })
  } catch {
    return
  }
  const { error } = await supabase.from('daily_plans').delete().eq('id', item.id)
  if (error) {
    showFailToast('删除失败')
    return
  }
  showSuccessToast('已删除')
  load()
}

// 复制到明天
async function copyToTomorrow(item) {
  const tomorrow = formatDate(dateByOffset(1))
  const { error } = await supabase.from('daily_plans').insert({
    user_id: auth.user.id,
    plan_date: tomorrow,
    content: item.content,
    plan_type: item.plan_type,
    priority: item.priority,
    status: '待办'
  })
  if (error) {
    showFailToast('复制失败')
    return
  }
  showSuccessToast(`已复制到 ${tomorrow}`)
}

async function load() {
  loading.value = true
  const { data, error } = await supabase
    .from('daily_plans')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('plan_date', selectedDate.value)
    .order('priority', { ascending: true })
  if (!error) plans.value = data || []
  loading.value = false
}

onMounted(load)
</script>

<style scoped>
.date-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  white-space: nowrap;
}

.date-pick-icon {
  font-size: 22px;
  color: var(--edu-primary-dark);
  padding: 8px;
}

.plan-card {
  display: flex;
  align-items: center;
  gap: 12px;
}

.plan-main {
  flex: 1;
  cursor: pointer;
}

.plan-content {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 8px;
}

.plan-tags {
  display: flex;
  gap: 6px;
}

.plan-card.done .plan-content {
  text-decoration: line-through;
  color: var(--edu-text-light);
}

.plan-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 20px;
}

.add-btn {
  margin-top: 8px;
}

.edit-pop {
  padding: 20px 16px 24px;
  max-height: 80vh;
  overflow-y: auto;
}

.edit-pop h3 {
  margin: 0 0 16px;
}

.edit-btns {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.inline-picker {
  width: 100%;
}
</style>
