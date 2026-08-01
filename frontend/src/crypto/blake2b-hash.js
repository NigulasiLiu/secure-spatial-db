import blake2b from 'blake2b-wasm'

let initialized = false

export async function initBlake2b() {
  if (!initialized) {
    await blake2b.ready()
    initialized = true
  }
}

export function h1(input) {
  const hash = blake2b(16, null, null)
  hash.update(typeof input === 'string' ? new TextEncoder().encode(input) : input)
  return new Uint8Array(hash.digest())
}

export function h2(input) {
  const hash = blake2b(16, null, null)
  hash.update(typeof input === 'string' ? new TextEncoder().encode(input) : input)
  return new Uint8Array(hash.digest())
}

export function h3(input) {
  const hash = blake2b(16, null, null)
  hash.update(typeof input === 'string' ? new TextEncoder().encode(input) : input)
  return new Uint8Array(hash.digest())
}

export function h4(input) {
  const hash = blake2b(16, null, null)
  hash.update(typeof input === 'string' ? new TextEncoder().encode(input) : input)
  return new Uint8Array(hash.digest())
}

export function h5(input) {
  const hash = blake2b(16, null, null)
  hash.update(typeof input === 'string' ? new TextEncoder().encode(input) : input)
  return new Uint8Array(hash.digest())
}

export function concatBytes(...arrays) {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

export function bytesEqual(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}
