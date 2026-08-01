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
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  background-color: #f0f2f5;
  color: #303133;
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
