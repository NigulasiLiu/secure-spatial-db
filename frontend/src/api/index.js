import axios from 'axios'
import { ElMessage } from 'element-plus'
import { dedupRequest, generateRequestKey } from '@/utils/perf-utils'
import { retryWithBackoff, classifyError } from '@/utils/error-handler'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => {
    const data = response.data
    // 后端 ApiResponseDto 返回结构: { success, message, data }
    // success===true 视为业务成功
    if (data && data.success === true) {
      return data
    }
    ElMessage.error(data?.message || 'request failed')
    return Promise.reject(data)
  },
  (error) => {
    if (error.response) {
      const status = error.response.status
      if (status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('username')
        window.location.href = '/login'
        return
      }
      const errType = classifyError(error)
      if (errType === 'server' && !error.config.__retried) {
        error.config.__retried = true
        return retryWithBackoff(
          (attempt) => {
            ElMessage.info(`服务器错误，正在重试(${attempt + 1}/3)...`)
            return api.request(error.config)
          },
          3, 1000
        ).catch(() => {
          ElMessage.error('重试失败，请稍后再试')
          return Promise.reject(error)
        })
      }
      if (errType === 'rateLimit') {
        ElMessage.warning('请求过于频繁，请稍后再试')
      } else {
        const msg = error.response.data?.message || 'server error'
        ElMessage.error(msg)
      }
    } else if (classifyError(error) === 'offline') {
      ElMessage.warning('网络已断开，请检查网络连接')
    } else {
      ElMessage.error('network error')
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  register: (username, password) => api.post('/auth/register', { username, password }),
  login: (username, password) => api.post('/auth/login', { username, password })
}

export const documentApi = {
  upload: (encryptedFile, encryptedName) => {
    const formData = new FormData()
    formData.append('encryptedFile', encryptedFile)
    if (encryptedName) formData.append('encryptedName', encryptedName)
    return api.post('/document/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    })
  },
  download: (fileId) => api.get('/document/download/' + fileId, { responseType: 'arraybuffer' }),
  list: () => dedupRequest(
    generateRequestKey('/document/list', 'GET'),
    () => api.get('/document/list')
  ),
  delete: (fileId) => api.delete('/document/' + fileId)
}

export const edbApi = {
  update: (entries) => api.post('/edb/update', { entries }),
  search: (tokens) => dedupRequest(
    generateRequestKey('/edb/search', tokens),
    () => api.post('/edb/search', { tokens })
  ),
  sync: (states) => api.post('/edb/sync', { states })
}

export default api
