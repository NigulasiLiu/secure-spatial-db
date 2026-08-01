import axios from 'axios'
import { ElMessage } from 'element-plus'

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
    if (data.code === 200) {
      return data
    }
    ElMessage.error(data.message || 'request failed')
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
      const msg = error.response.data?.message || 'server error'
      ElMessage.error(msg)
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
  list: () => api.get('/document/list'),
  delete: (fileId) => api.delete('/document/' + fileId)
}

export const edbApi = {
  update: (entries) => api.post('/edb/update', { entries }),
  search: (tokens) => api.post('/edb/search', { tokens }),
  sync: (states) => api.post('/edb/sync', { states })
}

export default api
