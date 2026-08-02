<template>
  <OfflineIndicator />
  <SessionLock />
  <ErrorBoundary>
    <router-view v-slot="{ Component }">
      <transition name="fade-slide" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </ErrorBoundary>
</template>

<script setup>
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import OfflineIndicator from '@/components/OfflineIndicator.vue'
import SessionLock from '@/components/SessionLock.vue'
</script>

<style>
/* ===== 阿里云品牌色板 (Alibaba Cloud Design System) ===== */
:root {
  /* 主色 - 云蓝 */
  --el-color-primary: #1677FF;
  --el-color-primary-light-3: #4096FF;
  --el-color-primary-light-5: #8CBFFF;
  --el-color-primary-light-7: #B3D4FF;
  --el-color-primary-light-9: #E8F3FF;
  --el-color-primary-dark-2: #0E66CC;
  /* 功能色 */
  --el-color-success: #00C7C7;
  --el-color-success-light-9: #E0F7F7;
  --el-color-warning: #FFCB00;
  --el-color-warning-light-9: #FFF8E0;
  --el-color-danger: #FF6A00;
  --el-color-danger-light-9: #FFEFE0;
  --el-color-info: #595959;
  /* 文字色 */
  --el-text-color-primary: #1A1A1A;
  --el-text-color-regular: #595959;
  --el-text-color-secondary: #8C8C8C;
  --el-text-color-placeholder: #BFBFBF;
  /* 边框色 */
  --el-border-color: #E5E8EB;
  --el-border-color-light: #E5E8EB;
  --el-border-color-lighter: #F5F7FA;
  /* 填充色 */
  --el-fill-color: #F5F7FA;
  --el-fill-color-light: #F5F7FA;
  --el-fill-color-blank: #FFFFFF;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  background-color: #F5F7FA;
  color: #1A1A1A;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: 100%;
  min-height: 100vh;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

html.dark {
  filter: invert(1) hue-rotate(180deg);
}

html.dark img,
html.dark .leaflet-tile,
html.dark .leaflet-container {
  filter: invert(1) hue-rotate(180deg);
}
</style>
