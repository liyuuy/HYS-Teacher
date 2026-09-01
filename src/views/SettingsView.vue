<template>
  <div class="page-container">
    <h2 class="page-title">设置</h2>

    <!-- 账号信息 -->
    <div class="edu-card">
      <div class="account-row">
        <van-icon name="user-circle-o" size="40" color="#9BBBF4" />
        <div class="account-info">
          <div class="account-name">{{ displayName }}</div>
          <div class="account-email">{{ auth.user?.email }}</div>
        </div>
      </div>
    </div>

    <!-- 数据备份 -->
    <div class="edu-card">
      <div class="section-title">数据备份</div>
      <p class="section-desc">
        将全部业务数据（每日计划 / 待办 / 课表 / 教学进度 / 班级日志）导出为 JSON 文件，可随时导入恢复。
      </p>
      <div class="backup-btns">
        <van-button round type="primary" icon="down" :loading="exporting" @click="onExport">导出备份</van-button>
        <van-button round plain type="primary" icon="up" @click="fileInput?.click()">导入恢复</van-button>
        <input ref="fileInput" type="file" accept="application/json,.json" style="display: none" @change="onImport" />
      </div>
    </div>

    <!-- 关于 -->
    <div class="edu-card">
      <div class="section-title">关于</div>
      <p class="section-desc">
        教师工作台 v1.0 · Vue 3 + Vant 4 + Supabase<br />
        数据存储于你的 Supabase 项目，仅本人可见。
      </p>
    </div>

    <!-- 登出 -->
    <van-button block round type="danger" plain @click="onLogout">退出登录</van-button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showSuccessToast, showFailToast, showLoadingToast, closeToast } from 'vant'
import { supabase } from '@/api/supabase'
import { useAuthStore } from '@/stores/auth'
import { downloadJson } from '@/utils'

const auth = useAuthStore()
const router = useRouter()

const exporting = ref(false)
const fileInput = ref(null)

const displayName = computed(() => {
  const meta = auth.user?.user_metadata
  return meta?.display_name || auth.user?.email?.split('@')[0] || '老师'
})

const TABLES = ['daily_plans', 'todos', 'schedule', 'teaching_progress', 'class_logs']

async function onExport() {
  exporting.value = true
  showLoadingToast({ message: '正在导出…', forbidClick: true })
  const uid = auth.user.id
  const result = {}
  try {
    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select('*').eq('user_id', uid)
      if (error) throw error
      result[table] = data || []
    }
  } catch (e) {
    closeToast()
    exporting.value = false
    showFailToast(e.message || '导出失败')
    return
  }
  const payload = {
    app: 'teacher-workbench',
    version: 1,
    exported_at: new Date().toISOString(),
    tables: result
  }
  const dateStr = new Date().toISOString().slice(0, 10)
  downloadJson(payload, `教师工作台-备份-${dateStr}.json`)
  closeToast()
  exporting.value = false
  showSuccessToast('导出成功')
}

async function onImport(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result)
      if (!parsed?.tables || !Array.isArray(parsed.tables.daily_plans)) {
        showFailToast('文件格式不正确')
        return
      }
      await doImport(parsed.tables)
    } catch {
      showFailToast('解析文件失败')
    }
  }
  reader.readAsText(file)
  // 重置 input 以便重复选择同一文件
  e.target.value = ''
}

async function doImport(tables) {
  try {
    await showConfirmDialog({
      title: '导入数据',
      message: '导入将合并到当前数据（重复记录会新增），确认继续？'
    })
  } catch {
    return
  }
  showLoadingToast({ message: '正在导入…', forbidClick: true })
  const uid = auth.user.id
  try {
    for (const table of TABLES) {
      const rows = (tables[table] || []).map((r) => {
        // 去除旧 id / user_id / 时间戳，由数据库重新生成
        const { id, user_id, created_at, completed_at, ...rest } = r
        return { ...rest, user_id: uid }
      })
      if (rows.length === 0) continue
      const { error } = await supabase.from(table).insert(rows)
      if (error) throw error
    }
  } catch (err) {
    closeToast()
    showFailToast(err.message || '导入失败')
    return
  }
  closeToast()
  showSuccessToast('导入完成')
}

async function onLogout() {
  try {
    await showConfirmDialog({ title: '退出登录', message: '确定要退出当前账号吗？' })
  } catch {
    return
  }
  await auth.logout()
  showSuccessToast('已退出')
  router.replace('/login')
}
</script>

<style scoped>
.account-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.account-info .account-name {
  font-size: 17px;
  font-weight: 600;
}

.account-email {
  font-size: 13px;
  color: var(--edu-text-light);
  margin-top: 4px;
}

.section-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 8px;
}

.section-desc {
  font-size: 13px;
  color: var(--edu-text-light);
  line-height: 1.7;
  margin: 0 0 14px;
}

.backup-btns {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
