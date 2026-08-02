<template>
  <transition name="fade">
    <div v-if="locked" class="session-lock-overlay">
      <div class="lock-card">
        <el-icon class="lock-icon"><Lock /></el-icon>
        <h2>会话已锁定</h2>
        <p>为保护您的数据安全，会话已自动锁定。</p>
        <el-input
          v-model="password"
          type="password"
          placeholder="请输入登录密码以解锁"
          show-password
          @keyup.enter="unlock"
        />
        <el-button type="primary" class="unlock-btn" @click="unlock" :loading="loading">
          解锁
        </el-button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue'
import { Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { unlockSession } from '@/utils/security'

const locked = ref(false)
const password = ref('')
const loading = ref(false)

import { onLockChange } from '@/utils/security'
onLockChange((isLocked) => {
  locked.value = isLocked
})

function unlock() {
  if (!password.value) {
    ElMessage.warning('请输入密码')
    return
  }
  loading.value = true
  const storedToken = localStorage.getItem('token')
  if (storedToken) {
    unlockSession()
    password.value = ''
    loading.value = false
    ElMessage.success('已解锁')
  } else {
    loading.value = false
    ElMessage.error('会话已过期，请重新登录')
    window.location.href = '/login'
  }
}
</script>

<style scoped>
.session-lock-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99999;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.lock-card {
  background: #fff;
  border-radius: 12px;
  padding: 40px;
  width: 360px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.lock-icon {
  font-size: 48px;
  color: #8C8C8C;
  margin-bottom: 16px;
}

.lock-card h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #1A1A1A;
}

.lock-card p {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: #8C8C8C;
}

.unlock-btn {
  width: 100%;
  margin-top: 16px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
