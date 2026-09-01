<template>
  <div class="page-container">
    <h2 class="page-title">待办事项</h2>

    <!-- 分类 Tab -->
    <van-tabs v-model:active="category" @change="load">
      <van-tab title="教学" name="teaching" />
      <van-tab title="班主任" name="head_teacher" />
      <van-tab title="其他" name="other" />
    </van-tabs>

    <!-- 视图切换 -->
    <div class="view-switch">
      <van-radio-group v-model="view" direction="horizontal" @change="load">
        <van-radio name="all">全部</van-radio>
        <van-radio name="pending">未完成</van-radio>
        <van-radio name="done">已完成</van-radio>
      </van-radio-group>
      <van-button size="small" type="primary" round icon="plus" @click="openEdit(null)">新增</van-button>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="empty-box">加载中…</div>
    <EmptyState v-else-if="todos.length === 0" description="暂无待办" />

    <van-cell-group v-else inset class="todo-group">
      <van-swipe-cell v-for="item in todos" :key="item.id">
        <van-cell
          :title="item.title"
          :label="todoLabel(item)"
          :class="{ 'is-done': item.status === 'done', overdue: isOverdue(item) }"
          clickable
          @click="openEdit(item)"
        >
          <template #title>
            <div class="cell-title">
              <van-checkbox
                :model-value="item.status === 'done'"
                :checked-color="checkedColor"
                @click.stop="toggleDone(item)"
              />
              <span :class="{ 'line-through': item.status === 'done' }">{{ item.title }}</span>
            </div>
          </template>
          <template #label>
            <div class="cell-label">
              <van-tag :type="priorityTagType(item.priority)" round>优先级{{ priorityName(item.priority) }}</van-tag>
              <van-tag :type="todoStatusType(item.status)" round>{{ todoStatusName(item.status) }}</van-tag>
              <span class="due-text" :class="{ 'due-overdue': isOverdue(item) }">
                {{ item.due_date ? dateDesc(item.due_date) : '无截止' }}
              </span>
            </div>
          </template>
        </van-cell>
        <template #right>
          <van-button square type="danger" text="删除" @click="onDelete(item)" />
        </template>
      </van-swipe-cell>
    </van-cell-group>

    <!-- 新增 / 编辑弹窗 -->
    <van-popup v-model:show="showEdit" position="bottom" round>
      <div class="edit-pop">
        <h3>{{ editing.id ? '编辑待办' : '新增待办' }}</h3>
        <van-form @submit="onSave">
          <van-field
            v-model="editing.title"
            label="标题"
            placeholder="要做的事"
            :rules="[{ required: true, message: '请输入标题' }]"
          />
          <van-field v-model="editing.description" label="备注" type="textarea" rows="2" autosize placeholder="补充说明（可选）" />
          <van-field label="分类" readonly>
            <template #input>
              <van-radio-group v-model="editing.category" direction="horizontal">
                <van-radio name="teaching">教学</van-radio>
                <van-radio name="head_teacher">班主任</van-radio>
                <van-radio name="other">其他</van-radio>
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
          <van-field label="截止日期" readonly is-link :model-value="editing.due_date || '不限'" @click="showDate = true" />
          <van-cell title="状态">
            <template #right-icon>
              <van-radio-group v-model="editing.status" direction="horizontal">
                <van-radio name="todo">待办</van-radio>
                <van-radio name="doing">进行中</van-radio>
                <van-radio name="done">已完成</van-radio>
              </van-radio-group>
            </template>
          </van-cell>
          <div class="edit-btns">
            <van-button round block type="primary" native-type="submit">保存</van-button>
            <van-button round block plain @click="showEdit = false">取消</van-button>
          </div>
        </van-form>
      </div>
    </van-popup>

    <!-- 截止日期选择 -->
    <van-popup v-model:show="showDate" position="bottom" round>
      <van-date-picker
        v-model="dateValue"
        :min-date="minDate"
        :max-date="maxDate"
        title="选择截止日期"
        @confirm="onPickDate"
        @cancel="showDate = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showConfirmDialog, showSuccessToast, showFailToast } from 'vant'
import { supabase } from '@/api/supabase'
import { useAuthStore } from '@/stores/auth'
import EmptyState from '@/components/EmptyState.vue'
import { todayStr, dateDesc, priorityName, priorityTagType, todoStatusName, todoStatusType } from '@/utils'

const auth = useAuthStore()
const checkedColor = '#9BBBF4'

const category = ref('teaching')
const view = ref('all')
const todos = ref([])
const loading = ref(true)

const showEdit = ref(false)
const showDate = ref(false)
const dateValue = ref([])
const editing = ref(createEmpty())

const minDate = new Date(2020, 0, 1)
const maxDate = new Date(2035, 11, 31)

function createEmpty() {
  return { id: null, title: '', description: '', category: category.value, priority: 2, status: 'todo', due_date: null }
}

function isOverdue(item) {
  return item.status !== 'done' && item.due_date && item.due_date < todayStr()
}

function todoLabel(item) {
  const due = item.due_date ? dateDesc(item.due_date) : '无截止日期'
  return item.description ? `${due} · ${item.description}` : due
}

function openEdit(item) {
  editing.value = item ? { ...item } : createEmpty()
  showEdit.value = true
}

function onPickDate({ selectedValues }) {
  const [y, m, d] = selectedValues
  editing.value.due_date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  showDate.value = false
}

async function onSave() {
  const payload = {
    title: editing.value.title,
    description: editing.value.description,
    category: editing.value.category,
    priority: editing.value.priority,
    status: editing.value.status,
    due_date: editing.value.due_date
  }
  if (payload.status === 'done' && !editing.value.completed_at) {
    payload.completed_at = new Date().toISOString()
  }
  let error = null
  if (editing.value.id) {
    const res = await supabase.from('todos').update(payload).eq('id', editing.value.id)
    error = res.error
  } else {
    const res = await supabase.from('todos').insert({ ...payload, user_id: auth.user.id })
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

async function toggleDone(item) {
  const next = item.status === 'done' ? 'todo' : 'done'
  const { error } = await supabase
    .from('todos')
    .update({ status: next, completed_at: next === 'done' ? new Date().toISOString() : null })
    .eq('id', item.id)
  if (!error) {
    item.status = next
    if (view.value === 'pending' && next === 'done') {
      todos.value = todos.value.filter((t) => t.id !== item.id)
    }
    if (view.value === 'done' && next === 'todo') {
      todos.value = todos.value.filter((t) => t.id !== item.id)
    }
  }
}

async function onDelete(item) {
  try {
    await showConfirmDialog({ title: '删除待办', message: '确定删除这条待办吗？' })
  } catch {
    return
  }
  const { error } = await supabase.from('todos').delete().eq('id', item.id)
  if (error) {
    showFailToast('删除失败')
    return
  }
  showSuccessToast('已删除')
  load()
}

async function load() {
  loading.value = true
  let query = supabase
    .from('todos')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('category', category.value)
    .order('priority', { ascending: true })
    .order('due_date', { ascending: true })

  if (view.value === 'pending') query = query.neq('status', 'done')
  if (view.value === 'done') query = query.eq('status', 'done')

  const { data, error } = await query
  if (!error) todos.value = data || []
  loading.value = false
}

onMounted(load)
</script>

<style scoped>
.view-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0;
}

.todo-group {
  border-radius: var(--edu-radius);
  overflow: hidden;
}

.cell-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.line-through {
  text-decoration: line-through;
  color: var(--edu-text-light);
}

.cell-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.due-text {
  font-size: 12px;
  color: var(--edu-text-light);
}

.due-overdue {
  color: var(--edu-danger);
  font-weight: 600;
}

.is-done {
  opacity: 0.7;
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
</style>
