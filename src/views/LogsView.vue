<template>
  <div class="page-container">
    <div class="page-toolbar">
      <h2 class="page-title" style="margin: 0">班级日志</h2>
      <van-button size="small" type="primary" round icon="plus" @click="openEdit(null)">写日志</van-button>
    </div>

    <!-- 类型筛选 -->
    <van-tabs v-model:active="typeFilter" @change="load">
      <van-tab title="全部" name="__all__" />
      <van-tab title="日常" name="日常" />
      <van-tab title="班会" name="班会" />
      <van-tab title="事件" name="事件" />
    </van-tabs>

    <!-- 时间线 -->
    <div v-if="loading" class="empty-box">加载中…</div>
    <EmptyState v-else-if="logs.length === 0" description="还没有日志，写一篇吧" />

    <div v-else class="timeline">
      <div v-for="item in logs" :key="item.id" class="tl-item">
        <div class="tl-left">
          <span class="tl-date">{{ item.log_date }}</span>
          <div class="tl-line"></div>
        </div>
        <div class="edu-card tl-card">
          <div class="tl-head">
            <van-tag :type="logType(item.log_type)" round>{{ item.log_type }}</van-tag>
            <span class="tl-class">{{ item.class_name || '未填班级' }}</span>
            <div class="tl-actions">
              <van-icon name="edit" color="#9BBBF4" @click="openEdit(item)" />
              <van-icon name="delete-o" color="#EE6161" @click="onDelete(item)" />
            </div>
          </div>
          <div class="tl-content">{{ item.content }}</div>
        </div>
      </div>
    </div>

    <!-- 新增 / 编辑弹窗 -->
    <van-popup v-model:show="showEdit" position="bottom" round>
      <div class="edit-pop">
        <h3>{{ editing.id ? '编辑日志' : '写日志' }}</h3>
        <van-form @submit="onSave">
          <van-field label="日期">
            <template #input>
              <van-date-picker
                v-model="dateValue"
                :min-date="minDate"
                :max-date="maxDate"
                :columns-type="['year', 'month', 'day']"
                @confirm="onPickDate"
                class="inline-picker"
              />
            </template>
          </van-field>
          <van-field v-model="editing.class_name" label="班级" placeholder="如：高二（3）班" />
          <van-field label="类型" readonly>
            <template #input>
              <van-radio-group v-model="editing.log_type" direction="horizontal">
                <van-radio name="日常">日常</van-radio>
                <van-radio name="班会">班会</van-radio>
                <van-radio name="事件">事件</van-radio>
              </van-radio-group>
            </template>
          </van-field>
          <van-field
            v-model="editing.content"
            label="内容"
            type="textarea"
            rows="4"
            autosize
            placeholder="记录今天班级发生了什么"
            :rules="[{ required: true, message: '请输入日志内容' }]"
          />
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
import { ref, onMounted } from 'vue'
import { showConfirmDialog, showSuccessToast, showFailToast } from 'vant'
import { supabase } from '@/api/supabase'
import { useAuthStore } from '@/stores/auth'
import EmptyState from '@/components/EmptyState.vue'
import { todayStr } from '@/utils'

const auth = useAuthStore()

const logs = ref([])
const loading = ref(true)
const typeFilter = ref('__all__')
const showEdit = ref(false)
const editing = ref(createEmpty())
const dateValue = ref([])

const minDate = new Date(2020, 0, 1)
const maxDate = new Date(2035, 11, 31)

function logType(t) {
  const map = { '日常': 'primary', '班会': 'warning', '事件': 'danger' }
  return map[t] || 'primary'
}

function createEmpty() {
  return { id: null, log_date: todayStr(), class_name: '', log_type: '日常', content: '' }
}

function openEdit(item) {
  editing.value = item ? { ...item } : createEmpty()
  showEdit.value = true
}

function onPickDate({ selectedValues }) {
  const [y, m, d] = selectedValues
  editing.value.log_date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

async function onSave() {
  const payload = {
    log_date: editing.value.log_date,
    class_name: editing.value.class_name,
    log_type: editing.value.log_type,
    content: editing.value.content
  }
  let error = null
  if (editing.value.id) {
    const res = await supabase.from('class_logs').update(payload).eq('id', editing.value.id)
    error = res.error
  } else {
    const res = await supabase.from('class_logs').insert({ ...payload, user_id: auth.user.id })
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

async function onDelete(item) {
  try {
    await showConfirmDialog({ title: '删除日志', message: '确定删除这条日志吗？' })
  } catch {
    return
  }
  const { error } = await supabase.from('class_logs').delete().eq('id', item.id)
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
    .from('class_logs')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (typeFilter.value !== '__all__') query = query.eq('log_type', typeFilter.value)
  const { data, error } = await query
  if (!error) logs.value = data || []
  loading.value = false
}

onMounted(load)
</script>

<style scoped>
.timeline {
  margin-top: 12px;
}

.tl-item {
  display: flex;
  gap: 12px;
}

.tl-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 60px;
  flex-shrink: 0;
}

.tl-date {
  font-size: 12px;
  color: var(--edu-text-light);
  white-space: nowrap;
  padding-top: 6px;
}

.tl-line {
  width: 2px;
  flex: 1;
  background: #e3e3e3;
  margin: 6px 0;
}

.tl-card {
  flex: 1;
  margin-bottom: 12px;
}

.tl-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.tl-class {
  font-size: 13px;
  color: var(--edu-text-light);
}

.tl-actions {
  margin-left: auto;
  display: flex;
  gap: 14px;
  font-size: 20px;
}

.tl-content {
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
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
