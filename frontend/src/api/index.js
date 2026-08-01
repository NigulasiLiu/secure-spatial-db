import axios from 'axios'
import { dedupRequest, generateRequestKey } from '@/utils/perf-utils'
import { retryWithBackoff, classifyError } from '@/utils/error-handler'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
  // 注意: 这里不要设置全局默认 Content-Type。
  // 若默认 application/json，会把 FormData(multipart) 请求错误地序列化成 JSON，
  // 导致后端 MultipartException('not a multipart request') 而 500。
  // 让 axios 根据 data 类型自动设置(JSON 用 application/json，FormData 用 multipart/form-data;boundary=...)。
})

// 前端 axios 链路追踪日志（排障用，可在 Console 看到每个请求的完整信息）
function traceLog(tag, info) {
  // eslint-disable-next-line no-console
  console.log(`[API-TRACE] ${tag}`, info)
}
const startedAt = new Map()

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token
    } else {
      traceLog('请求发出', { note: '⚠️ 未从 localStorage 取到 token', url: config.url, method: config.method })
    }
    startedAt.set(config, Date.now())
    traceLog('请求发出', {
      method: config.method,
      url: config.url,
      hasAuth: !!config.headers['Authorization'],
      tokenPreview: config.headers['Authorization'] ? String(config.headers['Authorization']).slice(0, 30) : '(无)',
      isFormData: config.data instanceof FormData
    })
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => {
    const data = response.data
    const ms = Date.now() - (startedAt.get(response.config) || Date.now())
    startedAt.delete(response.config)
    traceLog('响应成功', {
      method: response.config.method,
      url: response.config.url,
      status: response.status,
      ms: ms + 'ms',
      success: data?.success,
      dataPreview: JSON.stringify(data?.data)?.slice(0, 80)
    })
    // 后端 ApiResponseDto 返回结构: { success, message, data }
    // success===true 视为业务成功
    if (data && data.success === true) {
      return data
    }
    // 业务失败（success!==true）：仅 reject，由调用方决定是否提示
    return Promise.reject(data)
  },
  (error) => {
    const cfg = error.config
    const ms = cfg ? Date.now() - (startedAt.get(cfg) || Date.now()) : '-'
    if (cfg) startedAt.delete(cfg)
    const status = error.response?.status
    const tokenPreview = cfg?.headers?.Authorization ? String(cfg.headers.Authorization).slice(0, 30) : '(无)'
    traceLog('❌ 响应失败', {
      method: cfg?.method,
      url: cfg?.url,
      status: status ?? 'network',
      ms: (typeof ms === 'number' ? ms + 'ms' : ms),
      hasAuth: !!cfg?.headers?.Authorization,
      tokenPreview,
      isFormData: cfg?.data instanceof FormData,
      respBody: JSON.stringify(error.response?.data)?.slice(0, 200)
    })
    // 401: 登录失效，跳转登录页（保留在拦截器统一处理）
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('expiresAt')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    // 5xx: 静默指退重试 3 次，重试仍失败则 reject 交调用方处理
    const errType = classifyError(error)
    if (errType === 'server' && !error.config?.__retried) {
      error.config.__retried = true
      return retryWithBackoff(
        (attempt) => api.request(error.config),
        3, 1000
      ).catch((e) => Promise.reject(e))
    }
    // 其余错误（403/429/client/network 等）：不在此弹窗，reject 交调用方
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
    // 注意: 不要手动设置 Content-Type, 让 axios 为 FormData 自动生成带 boundary 的
    // multipart/form-data 头, 否则后端无法解析 multipart 边界导致请求失败
    return api.post('/document/upload', formData, {
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
