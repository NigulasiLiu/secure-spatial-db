<template>
  <transition name="slide-down">
    <div v-if="!isOnline" class="offline-banner">
      <el-icon><WarningFilled /></el-icon>
      <span>网络已断开，部分功能不可用。正在尝试重新连接…</span>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'
import { onOnlineStatusChange } from '@/utils/error-handler'

const isOnline = ref(true)
let cleanup = null

onMounted(() => {
  cleanup = onOnlineStatusChange((online) => {
    isOnline.value = online
  })
})

onBeforeUnmount(() => {
  if (cleanup) cleanup()
})
</script>

<style scoped>
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: #FF6A00;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
