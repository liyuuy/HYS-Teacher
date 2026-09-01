// ==================== 通用工具 ====================

/** 日期格式化为 YYYY-MM-DD */
export function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 今天的 YYYY-MM-DD */
export function todayStr() {
  return formatDate(new Date())
}

/** 根据偏移量获取日期（offset=0 今天，-1 昨天，1 明天） */
export function dateByOffset(offset) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d
}

/** 周几中文，weekday 1-7 对应 周一~周日 */
export function weekdayName(weekday) {
  const map = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return map[weekday] || ''
}

/** 今天星期几（JS getDay 转 1-7） */
export function todayWeekday() {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

/** 拼接问候语 */
export function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

/** 日期描述：今天 / 明天 / 昨天 / YYYY-MM-DD */
export function dateDesc(str) {
  const t = todayStr()
  if (str === t) return '今天'
  if (str === formatDate(dateByOffset(1))) return '明天'
  if (str === formatDate(dateByOffset(-1))) return '昨天'
  return str
}

/** 优先级中文 */
export function priorityName(p) {
  const map = { 1: '高', 2: '中', 3: '低' }
  return map[p] || '中'
}

/** 优先级对应的 Vant 徽标类型 */
export function priorityTagType(p) {
  const map = { 1: 'danger', 2: 'primary', 3: 'default' }
  return map[p] || 'primary'
}

/** 待办状态标签类型 */
export function todoStatusType(s) {
  const map = { todo: 'default', doing: 'warning', done: 'success' }
  return map[s] || 'default'
}

/** 待办状态中文 */
export function todoStatusName(s) {
  const map = { todo: '待办', doing: '进行中', done: '已完成' }
  return map[s] || '待办'
}

/** 进度状态中文转标签类型 */
export function progressStatusType(s) {
  const map = { '未开始': 'default', '进行中': 'warning', '已完成': 'success' }
  return map[s] || 'default'
}

/** 导出数据为 JSON 文件 */
export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
