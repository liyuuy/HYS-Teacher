import { createClient } from '@supabase/supabase-js'

// 从环境变量读取 Supabase 配置（构建时注入）
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 未配置时给出明确提示，避免静默报错
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[教师工作台] 未检测到 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY，' +
      '请复制 .env.example 为 .env 并填写配置后再启动。'
  )
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')

/** 获取当前登录用户，未登录返回 null */
export function getCurrentUser() {
  return supabase.auth.getUser()
}

/** 生成当前用户 id（用于调试或兜底） */
export function getUserId() {
  return supabase.auth.getUser().then(({ data }) => data?.user?.id || null)
}
