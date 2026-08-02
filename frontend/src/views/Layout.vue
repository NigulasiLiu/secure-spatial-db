<template>
  <el-container class="layout-container">
    <el-aside :width="collapsed ? '64px' : '220px'" class="layout-aside">
      <div class="logo">
        <h2 v-if="!collapsed">DSSE-RSKQ</h2>
        <h2 v-else>DR</h2>
        <p v-if="!collapsed">V1.0</p>
      </div>
      <el-menu :default-active="activeMenu" router class="layout-menu" :collapse="collapsed">
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/upload">
          <el-icon><Upload /></el-icon>
          <span>文档上传</span>
        </el-menu-item>
        <el-menu-item index="/search-brq">
          <el-icon><Search /></el-icon>
          <span>布尔范围检索</span>
        </el-menu-item>
        <el-menu-item index="/search-grq">
          <el-icon><MapLocation /></el-icon>
          <span>地理范围检索</span>
        </el-menu-item>
        <el-menu-item index="/documents">
          <el-icon><Document /></el-icon>
          <span>文档列表</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="layout-header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="collapsed = !collapsed">
            <Fold v-if="!collapsed" />
            <Expand v-else />
          </el-icon>
          <span>{{ currentTitle }}</span>
        </div>
        <div class="header-right">
          <el-tooltip content="深色/浅色主题" placement="bottom">
            <el-icon class="header-icon" @click="toggleTheme">
              <Moon v-if="!isDark" />
              <Sunny v-else />
            </el-icon>
          </el-tooltip>
          <el-tooltip content="快捷搜索 (Ctrl+K)" placement="bottom">
            <el-icon class="header-icon" @click="goSearch">
              <Search />
            </el-icon>
          </el-tooltip>
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><UserFilled /></el-icon>
              {{ authStore.username }}
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="layout-main">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Fold, Expand, Moon, Sunny } from '@element-plus/icons-vue'
import { ElMessageBox, ElNotification } from 'element-plus'
import { startSessionMonitor, stopSessionMonitor } from '@/utils/error-handler'
import { lockSession, checkKeyRotation } from '@/utils/security'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const collapsed = ref(false)
const isDark = ref(localStorage.getItem('theme') === 'dark')

const activeMenu = computed(() => route.path)
const titleMap = {
  '/': '仪表盘',
  '/upload': '文档上传',
  '/search-brq': '布尔范围检索',
  '/search-grq': '地理范围检索',
  '/documents': '文档列表',
  '/settings': '系统设置'
}
const currentTitle = computed(() => titleMap[route.path] || 'DSSE-RSKQ')

function toggleTheme() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

function goSearch() {
  router.push('/search-brq')
}

function handleCommand(cmd) {
  if (cmd === 'logout') {
    authStore.logout()
    router.push('/login')
  }
}

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    goSearch()
  }
  if (e.key === 'Escape') {
    collapsed.value = true
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  if (isDark.value) document.documentElement.classList.add('dark')
  startSessionMonitor(
    30 * 60 * 1000,
    () => {
      ElNotification.warning({
        title: '会话即将过期',
        message: '您的会话将在 1 分钟后过期，请保存当前操作。',
        duration: 0,
        showClose: true
      })
    },
    () => {
      lockSession()
    }
  )

  const rotation = checkKeyRotation()
  if (rotation.needed) {
    ElNotification.warning({
      title: '密钥轮换提醒',
      message: `加密密钥已超过 90 天未轮换（逾期 ${rotation.daysOverdue} 天），建议前往设置页面重新生成密钥以保障安全。`,
      duration: 0,
      showClose: true
    })
  } else if (rotation.daysRemaining !== undefined && rotation.daysRemaining <= 7) {
    ElNotification.info({
      title: '密钥轮换提醒',
      message: `加密密钥将在 ${rotation.daysRemaining} 天后建议轮换，请及时关注。`,
      duration: 10000
    })
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  stopSessionMonitor()
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
}
.layout-aside {
  background: #072B61;
  overflow: hidden;
  transition: width 0.3s;
}
.logo {
  height: 64px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #fff;
}
.logo h2 {
  font-size: 20px;
  margin: 0;
  letter-spacing: 0.5px;
}
.logo p {
  font-size: 12px;
  color: rgba(255,255,255,0.45);
}
.layout-menu {
  border-right: none;
  background: #072B61;
}
.layout-menu .el-menu-item {
  color: rgba(255,255,255,0.85);
}
.layout-menu .el-menu-item:hover {
  background: #1677FF;
  color: #fff;
}
.layout-menu .el-menu-item.is-active {
  background: #1677FF;
  color: #fff;
  font-weight: 500;
}
.layout-header {
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #E5E8EB;
  box-shadow: 0 1px 4px rgba(7,43,97,0.06);
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-left span {
  font-size: 18px;
  font-weight: 600;
  color: #1A1A1A;
}
.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #595959;
  transition: color 0.2s;
}
.collapse-btn:hover {
  color: #1677FF;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.header-icon {
  font-size: 18px;
  cursor: pointer;
  color: #595959;
  transition: color 0.2s;
}
.header-icon:hover {
  color: #1677FF;
}
.user-info {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #595959;
}
.user-info:hover {
  color: #1677FF;
}
.layout-main {
  background: #F5F7FA;
  padding: 20px;
  overflow-y: auto;
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
</style>
