/**
 * Performance utilities: debounce, throttle, request dedup
 */

export function debounce(fn, delay = 300) {
  let timer = null
  const debounced = function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
  debounced.cancel = () => {
    if (timer) { clearTimeout(timer); timer = null }
  }
  return debounced
}

export function throttle(fn, interval = 200) {
  let lastTime = 0
  let timer = null
  return function (...args) {
    const now = Date.now()
    if (now - lastTime >= interval) {
      lastTime = now
      fn.apply(this, args)
    } else {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        lastTime = Date.now()
        fn.apply(this, args)
      }, interval - (now - lastTime))
    }
  }
}

const pendingRequests = new Map()

export function dedupRequest(key, requestFn) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)
  }
  const promise = requestFn().finally(() => {
    pendingRequests.delete(key)
  })
  pendingRequests.set(key, promise)
  return promise
}

export function generateRequestKey(url, params) {
  const paramStr = typeof params === 'object' ? JSON.stringify(params) : String(params || '')
  return url + '|' + paramStr
}
