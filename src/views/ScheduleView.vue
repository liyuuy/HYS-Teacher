<template>
  <div class="page-container">
    <div class="page-toolbar">
      <h2 class="page-title" style="margin: 0">课表</h2>
      <van-dropdown-menu v-if="terms.length > 0" class="term-drop">
        <van-dropdown-item v-model="term" :options="termOptions" @change="load" />
      </van-dropdown-menu>
      <van-button size="small" type="primary" plain round icon="plus" @click="addTerm">学期</van-button>
      <van-switch
        v-model="todayOnly"
        size="20px"
        @change="load"
      />
      <span class="today-label">只看今天</span>
    </div>

    <div class="edu-card sch-card scroll-x">
      <table class="sch-table">
        <thead>
          <tr>
            <th class="corner"></th>
            <th v-for="w in 7" :key="w" :class="{ today: !todayOnly && w === todayWeekday() }">
              {{ weekdayName(w) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in 12" :key="p">
            <td class="period-cell">第{{ p }}节</td>
            <td
              v-for="w in 7"
              :key="w"
              class="sch-cell"
              @click="onCellClick(w, p)"
            >
              <div
                v-if="cellOf(w, p)"
                class="course-chip"
                :style="{ background: cellOf(w, p).color || '#9BBBF4' }"
              >
                <div class="chip-course">{{ cellOf(w, p).course }}</div>
                <div class="chip-meta">{{ cellOf(w, p).class_name || '' }} {{ cellOf(w, p).location ? '· ' + cellOf(w, p).location : '' }}</div>
              </div>
              <div v-else class="cell-add">+</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新增 / 编辑弹窗 -->
    <van-popup v-model:show="showEdit" position="bottom" round>
      <div class="edit-pop">
        <h3>{{ editing.id ? '编辑课程' : '新增课程' }}</h3>
        <van-form @submit="onSave">
          <van-field
            v-model="editing.course"
            label="课程"
            placeholder="如：语文"
            :rules="[{ required: true, message: '请输入课程名称' }]"
          />
          <van-field v-model="editing.class_name" label="班级" placeholder="如：高二（3）班" />
          <van-field v-model="editing.location" label="地点" placeholder="如：教学楼 A301" />
          <van-field label="星期" readonly>
            <template #input>
              <van-radio-group v-model="editing.weekday" direction="horizontal">
                <van-radio v-for="w in 7" :key="w" :name="w">{{ w }}</van-radio>
              </van-radio-group>
            </template>
          </van-field>
          <van-field label="节次" readonly>
            <template #input>
              <van-radio-group v-model="editing.period" direction="horizontal">
                <van-radio v-for="p in 12" :key="p" :name="p">{{ p }}</van-radio>
              </van-radio-group>
            </template>
          </van-field>
          <van-field label="颜色">
            <template #input>
              <div class="color-row">
                <span
                  v-for="c in colors"
                  :key="c"
                  class="color-dot"
                  :class="{ active: editing.color === c }"
                  :style="{ background: c }"
                  @click="editing.color = c"
                ></span>
              </div>
            </template>
          </van-field>
          <van-field v-model="editing.notes" label="备注" placeholder="可选" />
          <div class="edit-btns">
            <van-button v-if="editing.id" round block plain type="danger" @click="onDelete(editing)">删除</van-button>
            <van-button round block type="primary" native-type="submit">保存</van-button>
            <van-button round block plain @click="showEdit = false">取消</van-button>
          </div>
        </van-form>
      </div>
    </van-popup>

    <!-- 新增学期 -->
    <van-dialog v-model:show="showTerm" title="新增学期" show-cancel-button @confirm="onAddTerm">
      <van-field v-model="newTerm" placeholder="如：2027春" style="margin: 12px 0" />
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showConfirmDialog, showSuccessToast, showFailToast } from 'vant'
import { supabase } from '@/api/supabase'
import { useAuthStore } from '@/stores/auth'
import { weekdayName, todayWeekday } from '@/utils'

const auth = useAuthStore()

const colors = ['#9BBBF4', '#7AA3E8', '#F2A84B', '#67C23A', '#EE6161', '#B39DDB', '#F06292', '#4DB6AC', '#90A4AE']

// 学期列表存 localStorage（简单持久化，也可在数据库建 term 表，但非必需）
const terms = ref(['2026秋'])
const term = ref('2026秋')
const todayOnly = ref(false)

const cells = ref([]) // 当前学期的课程列表
const loading = ref(true)

const showEdit = ref(false)
const editing = ref(createEmpty())
const showTerm = ref(false)
const newTerm = ref('')

const termOptions = computed(() => terms.value.map((t) => ({ text: t, value: t })))

function createEmpty() {
  return {
    id: null, term: term.value, weekday: todayWeekday(), period: 1,
    course: '', class_name: '', location: '', color: '#9BBBF4', notes: ''
  }
}

// 取某格课程（todayOnly 时只看今天这一列）
function cellOf(w, p) {
  if (todayOnly.value && w !== todayWeekday()) return null
  return cells.value.find((c) => c.weekday === w && c.period === p)
}

function loadTerms() {
  try {
    const saved = JSON.parse(localStorage.getItem('tw_terms') || 'null')
    if (Array.isArray(saved) && saved.length) {
      terms.value = saved
      if (!terms.value.includes(term.value)) term.value = terms.value[0]
    } else {
      terms.value = ['2026秋']
      term.value = '2026秋'
    }
  } catch {
    terms.value = ['2026秋']
    term.value = '2026秋'
  }
  localStorage.setItem('tw_terms', JSON.stringify(terms.value))
}

function addTerm() {
  newTerm.value = ''
  showTerm.value = true
}

function onAddTerm() {
  const t = newTerm.value.trim()
  if (!t) {
    showFailToast('请输入学期名称')
    return
  }
  if (terms.value.includes(t)) {
    showFailToast('学期已存在')
    return
  }
  terms.value.push(t)
  localStorage.setItem('tw_terms', JSON.stringify(terms.value))
  term.value = t
  showSuccessToast('已新增学期')
  load()
}

function onCellClick(w, p) {
  const existing = cellOf(w, p)
  if (existing) {
    editing.value = { ...existing }
  } else {
    editing.value = { ...createEmpty(), weekday: w, period: p }
  }
  showEdit.value = true
}

async function onSave() {
  const payload = {
    term: term.value,
    weekday: editing.value.weekday,
    period: editing.value.period,
    course: editing.value.course,
    class_name: editing.value.class_name,
    location: editing.value.location,
    color: editing.value.color,
    notes: editing.value.notes
  }
  let error = null
  if (editing.value.id) {
    const res = await supabase.from('schedule').update(payload).eq('id', editing.value.id)
    error = res.error
  } else {
    const res = await supabase.from('schedule').insert({ ...payload, user_id: auth.user.id })
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
    await showConfirmDialog({ title: '删除课程', message: `确定删除「${item.course}」吗？` })
  } catch {
    return
  }
  const { error } = await supabase.from('schedule').delete().eq('id', item.id)
  if (error) {
    showFailToast('删除失败')
    return
  }
  showSuccessToast('已删除')
  showEdit.value = false
  load()
}

async function load() {
  loading.value = true
  const { data, error } = await supabase
    .from('schedule')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('term', term.value)
  if (!error) cells.value = data || []
  loading.value = false
}

onMounted(() => {
  loadTerms()
  load()
})
</script>

<style scoped>
.page-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.term-drop {
  margin-right: 4px;
}

.today-label {
  font-size: 13px;
  color: var(--edu-text-light);
}

.sch-card {
  overflow: hidden;
  padding: 12px;
}

.sch-table {
  border-collapse: separate;
  border-spacing: 4px;
  width: 100%;
  min-width: 640px;
}

.sch-table th {
  font-size: 13px;
  font-weight: 600;
  color: var(--edu-text);
  padding: 6px 0;
  text-align: center;
  background: var(--edu-bg);
  border-radius: 8px;
}

.sch-table th.today {
  background: var(--edu-primary);
  color: #fff;
}

.sch-table td {
  vertical-align: top;
}

.period-cell {
  font-size: 12px;
  color: var(--edu-text-light);
  text-align: center;
  width: 52px;
  white-space: nowrap;
  padding-top: 8px;
}

.sch-cell {
  min-width: 86px;
  min-height: 52px;
  background: #fafafc;
  border-radius: 8px;
  padding: 4px;
  cursor: pointer;
}

.sch-cell .cell-add {
  color: #c8c8d0;
  font-size: 18px;
  text-align: center;
  line-height: 44px;
}

.course-chip {
  border-radius: 8px;
  padding: 6px 8px;
  color: #fff;
  height: 100%;
  min-height: 44px;
}

.chip-course {
  font-weight: 600;
  font-size: 14px;
}

.chip-meta {
  font-size: 11px;
  opacity: 0.92;
  margin-top: 2px;
}

.edit-pop {
  padding: 20px 16px 24px;
  max-height: 80vh;
  overflow-y: auto;
}

.edit-pop h3 {
  margin: 0 0 16px;
}

.color-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.color-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
}

.color-dot.active {
  border-color: #333;
  transform: scale(1.1);
}

.edit-btns {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}
</style>
