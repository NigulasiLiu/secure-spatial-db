/**
 * CryptoWorkerWrapper: manages the Web Worker for encryption operations.
 * Falls back to main-thread RSKQClient if Worker is unavailable.
 */
import { RSKQClient } from './rskq-client.js'

let worker = null
let msgId = 0
const pending = new Map()
let useWorker = false
let fallbackClient = null

function getWorker() {
  if (!worker) {
    try {
      worker = new Worker(new URL('./crypto-worker.js', import.meta.url), { type: 'module' })
      worker.onmessage = (e) => {
        const { id, ok, result, error } = e.data
        const resolver = pending.get(id)
        if (resolver) {
          pending.delete(id)
          if (ok) resolver.resolve(result)
          else resolver.reject(new Error(error))
        }
      }
      worker.onerror = () => {
        useWorker = false
        console.warn('[CryptoWorker] Worker error, falling back to main thread')
      }
      useWorker = true
    } catch (e) {
      console.warn('[CryptoWorker] Cannot create Worker, using main thread:', e.message)
      useWorker = false
    }
  }
  return worker
}

function sendToWorker(action, payload) {
  return new Promise((resolve, reject) => {
    const w = getWorker()
    if (!w || !useWorker) {
      reject(new Error('Worker not available'))
      return
    }
    const id = ++msgId
    pending.set(id, { resolve, reject })
    w.postMessage({ id, action, payload })
  })
}

export class CryptoWorkerClient {
  constructor() {
    this.initialized = false
  }

  async initFromKeys(rootKeyBytes, keyIBytes, keySBytes) {
    try {
      await sendToWorker('initFromKeys', { rootKeyBytes, keyIBytes, keySBytes })
      this.initialized = true
    } catch (e) {
      if (!fallbackClient) {
        fallbackClient = new RSKQClient()
      }
      await fallbackClient.initFromKeys(rootKeyBytes, keyIBytes, keySBytes)
      this.initialized = true
      useWorker = false
    }
  }

  async loadState(state) {
    if (useWorker) {
      try { await sendToWorker('loadState', { state }); return } catch (e) { /* fallback */ }
    }
    if (fallbackClient) fallbackClient.loadState(state)
  }

  async getState() {
    if (useWorker) {
      try { return await sendToWorker('getState', {}) } catch (e) { /* fallback */ }
    }
    return fallbackClient ? fallbackClient.getState() : null
  }

  async updateAdd(fileId, keyword, lng, lat) {
    if (useWorker) {
      try { return await sendToWorker('updateAdd', { fileId, keyword, lng, lat }) } catch (e) { /* fallback */ }
    }
    return fallbackClient.updateAdd(fileId, keyword, lng, lat)
  }

  async generateSearchToken(keyword, lngMin, latMin, lngMax, latMax) {
    if (useWorker) {
      try { return await sendToWorker('generateSearchToken', { keyword, lngMin, latMin, lngMax, latMax }) } catch (e) { /* fallback */ }
    }
    return fallbackClient.generateSearchToken(keyword, lngMin, latMin, lngMax, latMax)
  }

  async decryptSearchResults(serverResults, keyword, lngMin, latMin, lngMax, latMax) {
    if (useWorker) {
      try { return await sendToWorker('decryptSearchResults', { serverResults, keyword, lngMin, latMin, lngMax, latMax }) } catch (e) { /* fallback */ }
    }
    return fallbackClient.decryptSearchResults(serverResults, keyword, lngMin, latMin, lngMax, latMax)
  }

  async encryptDocument(plaintext) {
    if (useWorker) {
      try { return await sendToWorker('encryptDocument', { plaintext }) } catch (e) { /* fallback */ }
    }
    return fallbackClient.encryptDocument(plaintext)
  }

  nextFileId() {
    if (fallbackClient) return fallbackClient.nextFileId()
    return ++msgId
  }

  terminate() {
    if (worker) {
      worker.terminate()
      worker = null
    }
    useWorker = false
    pending.clear()
  }
}
