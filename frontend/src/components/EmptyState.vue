<template>
  <div class="empty-state">
    <el-icon class="empty-icon"><component :is="icon" /></el-icon>
    <p class="empty-text">{{ text }}</p>
    <p v-if="subtext" class="empty-subtext">{{ subtext }}</p>
    <el-button v-if="actionText" type="primary" plain @click="$emit('action')">{{ actionText }}</el-button>
  </div>
</template>

<script setup>
import { Search } from '@element-plus/icons-vue'

const props = defineProps({
  icon: { type: Object, default: () => Search },
  text: { type: String, default: '暂无数据' },
  subtext: { type: String, default: '' },
  actionText: { type: String, default: '' }
})

defineEmits(['action'])
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 8px;
}
.empty-icon {
  font-size: 48px;
  color: #BFBFBF;
}
.empty-text {
  font-size: 16px;
  color: #8C8C8C;
}
.empty-subtext {
  font-size: 13px;
  color: #BFBFBF;
}
</style>
