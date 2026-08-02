import blake2b from 'blake2b-wasm'

let initialized = false

export async function initBlake2b() {
  if (!initialized) {
    await blake2b.ready()
    initialized = true
  }
}

// 域分离常量：H_i(x) = Blake2b-128(domain_i || x)
const DOMAIN_H1 = new Uint8Array([0x01])
const DOMAIN_H2 = new Uint8Array([0x02])
const DOMAIN_H3 = new Uint8Array([0x03])
const DOMAIN_H4 = new Uint8Array([0x04])
const DOMAIN_H5 = new Uint8Array([0x05])

function _hashWithDomain(domain, input) {
  const hash = blake2b(16, null, null)
  hash.update(domain)
  hash.update(typeof input === 'string' ? new TextEncoder().encode(input) : input)
  return new Uint8Array(hash.digest())
}

export function h1(input) {
  return _hashWithDomain(DOMAIN_H1, input)
}

export function h2(input) {
  return _hashWithDomain(DOMAIN_H2, input)
}

export function h3(input) {
  return _hashWithDomain(DOMAIN_H3, input)
}

export function h4(input) {
  return _hashWithDomain(DOMAIN_H4, input)
}

export function h5(input) {
  return _hashWithDomain(DOMAIN_H5, input)
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
