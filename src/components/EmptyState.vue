<template>
  <div class="empty-state">
    <van-empty :image="image" :image-size="imageSize" :description="description">
      <template v-if="$slots.default" #default>
        <slot />
      </template>
    </van-empty>
  </div>
</template>

<script setup>
// 统一空态组件：包裹 van-empty，保持页面风格一致
defineProps({
  description: { type: String, default: '暂无数据' },
  image: { type: String, default: 'default' },
  imageSize: { type: [Number, String], default: 80 }
})
</script>

<style scoped>
.empty-state {
  padding: 24px 0;
}
</style>
