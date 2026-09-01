<template>
  <div class="page-container">
    <div class="page-toolbar">
      <h2 class="page-title" style="margin: 0">教学进度</h2>
      <van-button size="small" type="primary" round icon="plus" @click="openEdit(null)">新增进度</van-button>
    </div>

    <!-- 课程筛选 -->
    <van-tabs v-model:active="activeCourse" sticky offset-top="0" @change="onCourseChange">
      <van-tab v-for="c in courses" :key="c" :title="c" :name="c" />
      <van-tab title="全部" name="__all__" />
    </van-tabs>

    <!-- 总体进度 -->
    <div v-if="activeCourse !== '__all__' && courses.includes(activeCourse)" class="edu-card progress-summary">
      <div class="summary-row">
        <span class="summary-label">《{{ activeCourse }}》总体进度</span>
        <span class="summary-num">{{ progressPercent }}%</span>
      </div>
      <van-progress :percentage="progressPercent" :show-pivot="false" color="#9BBBF4" stroke-width="8" />
      <div class="summary-detail">
        已完成 {{ doneCount }} / 共 {{ filteredItems.length }} 章
      </div>
    </div>

    <!-- 进度列表 -->
    <div v-if="loading" class="empty-box">加载中…</div>
    <EmptyState v-else-if="filteredItems.length === 0" description="暂无进度记录">
      <van-button size="small" type="primary" round @click="openEdit(null)">新增进度</van-button>
    </EmptyState>

    <div v-else class="progress-list">
      <div v-for="item in filteredItems" :key="item.id" class="edu-card progress-card">
        <div class="progress-head" @click="openEdit(item)">
          <div class="chapter-name">
            <van-tag :type="progressStatusType(item.status)" round>{{ item.status }}</van-tag>
            <span class="chapter-title">{{ item.chapter }}</span>
          </div>
          <div class="status-switch" @click.stop="cycleStatus(item)">
            <van-icon name="replay" />
          </div>
        </div>
        <div class="progress-body" @click="openEdit(item)">
          <div class="topic-line" v-if="item.topic">主题：{{ item.topic }}</div>
          <div class="meta-line">
            <span v-if="item.class_name">班级：{{ item.class_name }}</span>
            <span v-if="item.planned_date">计划：{{ item.planned_date }}</span>
            <span v-if="item.actual_date" :class="{ 'actual-done': item.status === '已完成' }">实际：{{ item.actual_date }}</span>
          </div>
          <div class="remark-line" v-if="item.remark">{{ item.remark }}</div>
        </div>
        <div class="progress-actions">
          <van-button size="mini" type="primary" plain @click="setStatus(item, '未开始')">未开始</van-button>
          <van-button size="mini" type="warning" plain @click="setStatus(item, '进行中')">进行中</van-button>
          <van-button size="mini" type="success" plain @click="setStatus(item, '已完成')">已完成</van-button>
          <van-icon name="delete-o" color="#EE6161" @click="onDelete(item)" />
        </div>
      </div>
      <van-button v-if="filteredItems.length" block type="primary" plain round @click="openEdit(null)" class="add-btn">
        + 新增进度
      </van-button>
    </div>

    <!-- 新增 / 编辑弹窗 -->
    <van-popup v-model:show="showEdit" position="bottom" round>
      <div class="edit-pop">
        <h3>{{ editing.id ? '编辑进度' : '新增进度' }}</h3>
        <van-form @submit="onSave">
          <van-field
            v-model="editing.course"
            label="课程"
            placeholder="如：数学"
            :rules="[{ required: true, message: '请输入课程名称' }]"
          />
          <van-field v-model="editing.class_name" label="班级" placeholder="如：高二（3）班" />
          <van-field
            v-model="editing.chapter"
            label="章节"
            placeholder="如：第三章 函数"
            :rules="[{ required: true, message: '请输入章节' }]"
          />
          <van-field v-model="editing.topic" label="主题" placeholder="可选" />
          <van-field label="计划日期" readonly is-link :model-value="editing.planned_date || '未设置'" @click="pickField = 'planned'" />
          <van-field label="实际日期" readonly is-link :model-value="editing.actual_date || '未设置'" @click="pickField = 'actual'" />
          <van-field label="状态" readonly>
            <template #input>
              <van-radio-group v-model="editing.status" direction="horizontal">
                <van-radio name="未开始">未开始</van-radio>
                <van-radio name="进行中">进行中</van-radio>
                <van-radio name="已完成">已完成</van-radio>
              </van-radio-group>
            </template>
          </van-field>
          <van-field v-model="editing.remark" label="备注" type="textarea" rows="2" autosize placeholder="可选" />
          <div class="edit-btns">
            <van-button round block type="primary" native-type="submit">保存</van-button>
            <van-button round block plain @click="showEdit = false">取消</van-button>
          </div>
        </van-form>
      </div>
    </van-popup>

    <!-- 日期选择 -->
    <van-popup v-model:show="showDate" position="bottom" round>
      <van-date-picker
        v-model="dateValue"
        :min-date="minDate"
        :max-date="maxDate"
        title="选择日期"
        @confirm="onPickDate"
        @cancel="showDate = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showConfirmDialog, showSuccessToast, showFailToast } from 'vant'
import { supabase } from '@/api/supabase'
import { useAuthStore } from '@/stores/auth'
import EmptyState from '@/components/EmptyState.vue'
import { progressStatusType } from '@/utils'

const auth = useAuthStore()

const items = ref([])
const loading = ref(true)
const activeCourse = ref('__all__')
const showEdit = ref(false)
const editing = ref(createEmpty())
const showDate = ref(false)
const pickField = ref('')
const dateValue = ref([])

const minDate = new Date(2020, 0, 1)
const maxDate = new Date(2035, 11, 31)

const courses = computed(() => [...new Set(items.value.map((i) => i.course))])

const filteredItems = computed(() => {
  if (activeCourse.value === '__all__' || !courses.value.includes(activeCourse.value)) return items.value
  return items.value.filter((i) => i.course === activeCourse.value)
})

const doneCount = computed(() => filteredItems.value.filter((i) => i.status === '已完成').length)
const progressPercent = computed(() => {
  const total = filteredItems.value.length
  if (total === 0) return 0
  return Math.round((doneCount.value / total) * 100)
})

function createEmpty() {
  return {
    id: null,
    term: '2026秋',
    course: activeCourse.value === '__all__' ? '' : activeCourse.value,
    class_name: '',
    chapter: '',
    topic: '',
    planned_date: null,
    actual_date: null,
    status: '未开始',
    remark: ''
  }
}

function onCourseChange(name) {
  activeCourse.value = name
}

function openEdit(item) {
  editing.value = item ? { ...item } : createEmpty()
  showEdit.value = true
}

function onPickDate({ selectedValues }) {
  const [y, m, d] = selectedValues
  const val = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  if (pickField.value === 'planned') editing.value.planned_date = val
  else if (pickField.value === 'actual') editing.value.actual_date = val
  showDate.value = false
}

async function onSave() {
  const payload = {
    term: editing.value.term,
    course: editing.value.course,
    class_name: editing.value.class_name,
    chapter: editing.value.chapter,
    topic: editing.value.topic,
    planned_date: editing.value.planned_date,
    actual_date: editing.value.actual_date,
    status: editing.value.status,
    remark: editing.value.remark
  }
  // 标记完成时自动补实际日期
  if (payload.status === '已完成' && !payload.actual_date) payload.actual_date = new Date().toISOString().slice(0, 10)

  let error = null
  if (editing.value.id) {
    const res = await supabase.from('teaching_progress').update(payload).eq('id', editing.value.id)
    error = res.error
  } else {
    const res = await supabase.from('teaching_progress').insert({ ...payload, user_id: auth.user.id })
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

async function setStatus(item, status) {
  const payload = { status }
  if (status === '已完成' && !item.actual_date) payload.actual_date = new Date().toISOString().slice(0, 10)
  const { error } = await supabase.from('teaching_progress').update(payload).eq('id', item.id)
  if (!error) {
    item.status = status
    if (payload.actual_date) item.actual_date = payload.actual_date
  }
}

function cycleStatus(item) {
  const order = ['未开始', '进行中', '已完成']
  const next = order[(order.indexOf(item.status) + 1) % 3]
  setStatus(item, next)
}

async function onDelete(item) {
  try {
    await showConfirmDialog({ title: '删除进度', message: `确定删除「${item.chapter}」吗？` })
  } catch {
    return
  }
  const { error } = await supabase.from('teaching_progress').delete().eq('id', item.id)
  if (error) {
    showFailToast('删除失败')
    return
  }
  showSuccessToast('已删除')
  load()
}

async function load() {
  loading.value = true
  const { data, error } = await supabase
    .from('teaching_progress')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('course', { ascending: true })
    .order('created_at', { ascending: true })
  if (!error) items.value = data || []
  loading.value = false
}

onMounted(load)
</script>

<style scoped>
.progress-summary {
  margin-top: 12px;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.summary-label {
  font-weight: 600;
}

.summary-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--edu-primary-dark);
}

.summary-detail {
  margin-top: 8px;
  font-size: 13px;
  color: var(--edu-text-light);
}

.progress-list {
  margin-top: 12px;
}

.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.chapter-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chapter-title {
  font-weight: 600;
  font-size: 15px;
}

.status-switch {
  color: var(--edu-primary-dark);
  font-size: 20px;
  padding: 4px;
}

.progress-body {
  cursor: pointer;
  margin-top: 8px;
  color: var(--edu-text);
}

.topic-line {
  font-size: 14px;
  margin-bottom: 4px;
}

.meta-line {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--edu-text-light);
}

.actual-done {
  color: var(--edu-success);
}

.remark-line {
  margin-top: 6px;
  font-size: 13px;
  color: var(--edu-text-light);
  background: var(--edu-bg);
  padding: 6px 8px;
  border-radius: 8px;
}

.progress-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.progress-actions .van-icon {
  margin-left: auto;
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
</style>
