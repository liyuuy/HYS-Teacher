import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Vant from 'vant'
import 'vant/lib/index.css'
import App from './App.vue'
import router from './router'

// 全局样式
import './styles/global.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(Vant)
app.mount('#app')

// PWA Service Worker 由 vite-plugin-pwa 在构建产物中自动注册（registerSW.js）
