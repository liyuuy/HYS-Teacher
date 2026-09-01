import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// 部署在 GitHub Pages 时，将 base 改为 '/<仓库名>/'，例如 '/teacher-workbench/'
export default defineConfig({
  base: '/HYS-Teacher',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png'],
      manifest: {
        name: '教师工作台',
        short_name: '教师工作台',
        description: '教师个人工作台：今日概览、每日计划、待办、课表、教学进度、班级日志',
        lang: 'zh-CN',
        theme_color: '#9BBBF4',
        background_color: '#F4F3EE',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallback: 'index.html'
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true,
    port: 5173
  },
  build: {
    // 拆包：第三方库单独分包，优化首屏加载并消除大 chunk 警告
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          vant: ['vant'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
})
