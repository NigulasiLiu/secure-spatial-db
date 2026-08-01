/**
 * Security utilities:
 * - Encrypted localStorage (XOR-based lightweight encryption for sensitive data)
 * - Key rotation reminder
 * - XSS sanitization
 * - Session lock
 */

const SECRET_SEED = 'dsse-rskq-v1-security-salt'

function xorEncrypt(text, key) {
  const result = []
  for (let i = 0; i < text.length; i++) {
    result.push(String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length)))
  }
  return btoa(result.join(''))
}

function xorDecrypt(encrypted, key) {
  try {
    const text = atob(encrypted)
    const result = []
    for (let i = 0; i < text.length; i++) {
      result.push(String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length)))
    }
    return result.join('')
  } catch (e) {
    return null
  }
}

function getDeviceKey() {
  let dk = localStorage.getItem('_dk')
  if (!dk) {
    dk = Math.random().toString(36).substring(2) + Date.now().toString(36)
    localStorage.setItem('_dk', dk)
  }
  return dk + SECRET_SEED
}

export const secureStorage = {
  set(key, value) {
    const json = JSON.stringify(value)
    const encrypted = xorEncrypt(json, getDeviceKey())
    localStorage.setItem('sec_' + key, encrypted)
  },

  get(key) {
    const encrypted = localStorage.getItem('sec_' + key)
    if (!encrypted) return null
    const decrypted = xorDecrypt(encrypted, getDeviceKey())
    if (!decrypted) return null
    try { return JSON.parse(decrypted) } catch (e) { return null }
  },

  remove(key) {
    localStorage.removeItem('sec_' + key)
  },

  has(key) {
    return localStorage.getItem('sec_' + key) !== null
  }
}

const KEY_ROTATION_INTERVAL = 90 * 24 * 60 * 60 * 1000

export function checkKeyRotation() {
  const lastRotation = parseInt(localStorage.getItem('rskq_key_created') || '0')
  if (lastRotation === 0) return { needed: false, reason: 'no_keys' }
  const elapsed = Date.now() - lastRotation
  if (elapsed > KEY_ROTATION_INTERVAL) {
    return { needed: true, daysOverdue: Math.floor((elapsed - KEY_ROTATION_INTERVAL) / (24 * 60 * 60 * 1000)) }
  }
  const remaining = KEY_ROTATION_INTERVAL - elapsed
  return { needed: false, daysRemaining: Math.floor(remaining / (24 * 60 * 60 * 1000)) }
}

export function recordKeyCreation() {
  localStorage.setItem('rskq_key_created', Date.now().toString())
}

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
}

export function sanitizeHtml(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[&<>"'/]/g, c => HTML_ESCAPE_MAP[c] || c)
}

export function sanitizeText(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}

export function validateInput(input, maxLength = 1000) {
  if (typeof input !== 'string') return ''
  let cleaned = input.slice(0, maxLength)
  cleaned = sanitizeText(cleaned)
  return cleaned
}

let locked = false
const lockListeners = []

export function lockSession() {
  locked = true
  lockListeners.forEach(fn => fn(true))
}

export function unlockSession() {
  locked = false
  lockListeners.forEach(fn => fn(false))
}

export function isLocked() {
  return locked
}

export function onLockChange(callback) {
  lockListeners.push(callback)
  return () => {
    const idx = lockListeners.indexOf(callback)
    if (idx >= 0) lockListeners.splice(idx, 1)
  }
}
