<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">
        <span class="logo-dot"></span>
        <h1>教师工作台</h1>
        <p>教学 · 班级 · 事务，一站管理</p>
      </div>

      <van-form @submit="onSubmit">
        <van-cell-group inset>
          <van-field
            v-model="form.email"
            name="email"
            label="邮箱"
            placeholder="请输入邮箱"
            :rules="[{ required: true, message: '请输入邮箱' }]"
          />
          <van-field
            v-model="form.password"
            type="password"
            name="password"
            label="密码"
            placeholder="请输入密码（至少 6 位）"
            :rules="[{ required: true, message: '请输入密码' }]"
          />
        </van-cell-group>

        <div class="login-actions">
          <van-button round block type="primary" native-type="submit" :loading="auth.loading">
            {{ isRegister ? '注册并登录' : '登 录' }}
          </van-button>
          <van-button round block plain type="primary" @click="toggleMode" class="switch-btn">
            {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
          </van-button>
        </div>
      </van-form>

      <p class="login-tip" v-if="isRegister">
        注册后需在 Supabase 中确认邮箱（若未开启自动确认），或直接返回登录。
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showSuccessToast, showFailToast } from 'vant'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const isRegister = ref(false)
const form = ref({ email: '', password: '' })

function toggleMode() {
  isRegister.value = !isRegister.value
}

async function onSubmit() {
  try {
    if (isRegister.value) {
      await auth.register(form.value.email, form.value.password)
      showSuccessToast('注册成功')
      // 注册后若无会话则直接跳登录页
      if (!auth.isLoggedIn) {
        isRegister.value = false
        return
      }
    } else {
      await auth.login(form.value.email, form.value.password)
      showSuccessToast('登录成功')
    }
    router.replace(route.query.redirect || '/')
  } catch (e) {
    showFailToast(e.message || '操作失败，请重试')
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(160deg, #eaf1fd 0%, #f4f3ee 60%);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 16px;
  padding: 28px 20px 24px;
  box-shadow: 0 8px 30px rgba(120, 150, 220, 0.15);
}

.login-logo {
  text-align: center;
  margin-bottom: 24px;
}

.logo-dot {
  display: inline-block;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #9bbbf4, #7aa3e8);
}

.login-logo h1 {
  margin: 12px 0 4px;
  font-size: 22px;
  color: #3a3a3a;
}

.login-logo p {
  margin: 0;
  color: var(--edu-text-light);
  font-size: 13px;
}

.login-actions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.switch-btn {
  color: var(--edu-primary-dark);
}

.login-tip {
  margin-top: 16px;
  text-align: center;
  color: var(--edu-text-light);
  font-size: 12px;
  line-height: 1.6;
}
</style>
