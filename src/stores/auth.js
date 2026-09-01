import { defineStore } from 'pinia'
import { supabase } from '@/api/supabase'

// 登录态 Store：只负责用户信息与登录/登出，保持轻量
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,          // 当前用户对象
    loading: false,      // 是否正在初始化 / 登录
    ready: false         // 是否已完成会话恢复（避免刷新时误跳登录页）
  }),

  getters: {
    isLoggedIn: (state) => !!state.user
  },

  actions: {
    // 应用启动时恢复会话（Supabase 默认 localStorage 持久化）
    async init() {
      this.loading = true
      const { data } = await supabase.auth.getUser()
      this.user = data?.user || null
      this.ready = true
      this.loading = false
      return this.user
    },

    // 邮箱 + 密码登录
    async login(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      this.user = data.user
      return data.user
    },

    // 邮箱 + 密码注册
    async register(email, password) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      // 注册成功后若会话已建立则同步登录态
      this.user = data.session ? data.user : null
      return data
    },

    // 登出
    async logout() {
      await supabase.auth.signOut()
      this.user = null
    }
  }
})
