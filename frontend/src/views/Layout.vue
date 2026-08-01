<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="layout-aside">
      <div class="logo">
        <h2>DSSE-RSKQ</h2>
        <p>V1.0</p>
      </div>
      <el-menu :default-active="activeMenu" router class="layout-menu">
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
          <span>{{ currentTitle }}</span>
        </div>
        <div class="header-right">
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
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

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

function handleCommand(cmd) {
  if (cmd === 'logout') {
    authStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}
.layout-aside {
  background: #001529;
  overflow: hidden;
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
}
.logo p {
  font-size: 12px;
  color: #999;
}
.layout-menu {
  border-right: none;
  background: #001529;
}
.layout-menu .el-menu-item {
  color: #fff;
}
.layout-menu .el-menu-item:hover {
  background: #1890ff;
}
.layout-menu .el-menu-item.is-active {
  background: #1890ff;
}
.layout-header {
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e8e8e8;
  box-shadow: 0 1px 4px rgba(0,21,41,0.08);
}
.header-left span {
  font-size: 18px;
  font-weight: 600;
}
.user-info {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}
.layout-main {
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>
