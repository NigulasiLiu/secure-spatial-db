/**
 * Error handling & resilience utilities:
 * - Auto-retry with exponential backoff (max 3 retries)
 * - Online/offline detection
 * - Session expiry detection
 */

export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt)
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

export function isOnline() {
  return navigator.onLine
}

const onlineListeners = []
let onlineInitialized = false

export function onOnlineStatusChange(callback) {
  if (!onlineInitialized) {
    window.addEventListener('online', () => {
      onlineListeners.forEach(cb => cb(true))
    })
    window.addEventListener('offline', () => {
      onlineListeners.forEach(cb => cb(false))
    })
    onlineInitialized = true
  }
  onlineListeners.push(callback)
  callback(navigator.onLine)
  return () => {
    const idx = onlineListeners.indexOf(callback)
    if (idx >= 0) onlineListeners.splice(idx, 1)
  }
}

let sessionTimeoutMs = 30 * 60 * 1000
let sessionTimer = null
let sessionWarningTimer = null
const sessionListeners = []

export function startSessionMonitor(timeoutMs, onWarning, onTimeout) {
  sessionTimeoutMs = timeoutMs || 30 * 60 * 1000
  if (onWarning) sessionListeners.push({ type: 'warning', fn: onWarning })
  if (onTimeout) sessionListeners.push({ type: 'timeout', fn: onTimeout })

  resetSessionTimer()

  const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']
  events.forEach(evt => {
    document.addEventListener(evt, resetSessionTimer, { passive: true })
  })
}

function resetSessionTimer() {
  if (sessionTimer) clearTimeout(sessionTimer)
  if (sessionWarningTimer) clearTimeout(sessionWarningTimer)

  const warningMs = sessionTimeoutMs - 60 * 1000
  sessionWarningTimer = setTimeout(() => {
    sessionListeners.filter(l => l.type === 'warning').forEach(l => l.fn())
  }, warningMs)

  sessionTimer = setTimeout(() => {
    sessionListeners.filter(l => l.type === 'timeout').forEach(l => l.fn())
  }, sessionTimeoutMs)
}

export function stopSessionMonitor() {
  if (sessionTimer) clearTimeout(sessionTimer)
  if (sessionWarningTimer) clearTimeout(sessionWarningTimer)
  const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']
  events.forEach(evt => {
    document.removeEventListener(evt, resetSessionTimer)
  })
  sessionListeners.length = 0
}

export class AppError extends Error {
  constructor(message, type = 'unknown', details = null) {
    super(message)
    this.name = 'AppError'
    this.type = type
    this.details = details
  }
}

export function classifyError(err) {
  if (!navigator.onLine) return 'offline'
  if (err.response) {
    const status = err.response.status
    if (status === 401) return 'auth'
    if (status === 403) return 'forbidden'
    if (status >= 500) return 'server'
    if (status === 429) return 'rateLimit'
    return 'client'
  }
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) return 'timeout'
  return 'unknown'
}
