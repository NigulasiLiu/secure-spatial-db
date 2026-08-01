<template>
  <slot v-if="!hasError" />
  <div v-else class="error-boundary">
    <el-result icon="error" title="页面发生错误" :sub-title="errorMessage">
      <template #extra>
        <el-button type="primary" @click="retry">重试</el-button>
        <el-button @click="goHome">返回首页</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'

const hasError = ref(false)
const errorMessage = ref('')
const router = useRouter()

onErrorCaptured((err) => {
  hasError.value = true
  errorMessage.value = err.message || '未知错误'
  console.error('[ErrorBoundary]', err)
  return false
})

function retry() {
  hasError.value = false
  errorMessage.value = ''
}

function goHome() {
  hasError.value = false
  errorMessage.value = ''
  router.push('/')
}
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}
</style>
