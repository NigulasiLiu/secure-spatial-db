import { defineStore } from 'pinia'
import { authApi } from '@/api'
import { ElMessage } from 'element-plus'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    username: localStorage.getItem('username') || '',
    expiresAt: localStorage.getItem('expiresAt') || ''
  }),
  getters: {
    isAuthenticated: (state) => {
      if (!state.token) return false
      if (state.expiresAt && Date.now() > parseInt(state.expiresAt)) return false
      return true
    }
  },
  actions: {
    async login(username, password) {
      const res = await authApi.login(username, password)
      if (res && res.data) {
        this.token = res.data.token
        this.username = username
        this.expiresAt = String(Date.now() + res.data.expiresIn * 1000)
        localStorage.setItem('token', this.token)
        localStorage.setItem('username', this.username)
        localStorage.setItem('expiresAt', this.expiresAt)
        ElMessage.success('login success')
        return true
      }
      return false
    },
    async register(username, password) {
      const res = await authApi.register(username, password)
      if (res) {
        ElMessage.success('register success')
        return true
      }
      return false
    },
    logout() {
      this.token = ''
      this.username = ''
      this.expiresAt = ''
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('expiresAt')
    }
  }
})
