const subtle = window.crypto.subtle

const AES_KEY_LENGTH = 256
const AES_IV_LENGTH = 12
const HMAC_KEY_LENGTH = 256

export async function generateRootKey() {
  return await subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256', length: HMAC_KEY_LENGTH },
    true,
    ['sign', 'verify']
  )
}

export async function generateAesKey() {
  return await subtle.generateKey(
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function exportKey(key) {
  const raw = await subtle.exportKey('raw', key)
  return new Uint8Array(raw)
}

export async function importHmacKey(rawBytes) {
  return await subtle.importKey(
    'raw',
    rawBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    true,
    ['sign']
  )
}

export async function importAesKey(rawBytes) {
  return await subtle.importKey(
    'raw',
    rawBytes,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function prf(rootKey, input) {
  const inputBytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  const sig = await subtle.sign('HMAC', rootKey, inputBytes)
  return new Uint8Array(sig)
}

export async function prfSplit(rootKey, input) {
  const full = await prf(rootKey, input)
  const lambda = 16
  const kx = full.slice(0, lambda)
  const kxPrime = full.slice(lambda, lambda * 2)
  return { kx, kxPrime }
}

export async function aesEncrypt(key, plaintext) {
  const iv = window.crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH))
  const ptBytes = typeof plaintext === 'string' ? new TextEncoder().encode(plaintext) : plaintext
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, ptBytes)
  const result = new Uint8Array(AES_IV_LENGTH + ct.byteLength)
  result.set(iv, 0)
  result.set(new Uint8Array(ct), AES_IV_LENGTH)
  return result
}

export async function aesDecrypt(key, ciphertext) {
  const iv = ciphertext.slice(0, AES_IV_LENGTH)
  const ct = ciphertext.slice(AES_IV_LENGTH)
  const pt = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new Uint8Array(pt)
}

export function randomBytes(length) {
  return window.crypto.getRandomValues(new Uint8Array(length))
}

export async function sha256(data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const hash = await subtle.digest('SHA-256', bytes)
  return new Uint8Array(hash)
}

export function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function hexToBytes(hex) {
  const result = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    result[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return result
}

export function bytesToBase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToBytes(b64) {
  const binary = atob(b64)
  const result = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    result[i] = binary.charCodeAt(i)
  }
  return result
}

export function xorBytes(a, b) {
  const len = Math.min(a.length, b.length)
  const result = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    result[i] = a[i] ^ b[i]
  }
  return result
}
