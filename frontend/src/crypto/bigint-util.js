import { BigInteger } from 'jsbn'

export function fromBytes(bytes) {
  return new BigInteger(Array.from(bytes))
}

export function toBytes(bi, length) {
  const result = bi.toByteArray()
  if (length && result.length < length) {
    const padded = new Uint8Array(length)
    padded.set(result, length - result.length)
    return padded
  }
  return new Uint8Array(result)
}

export function fromHex(hex) {
  return new BigInteger(hex, 16)
}

export function toHex(bi) {
  return bi.toString(16)
}

export function fromInt(num) {
  return new BigInteger(String(num))
}

export function xor(a, b) {
  return a.xor(b)
}

export function and(a, b) {
  return a.and(b)
}

export function or(a, b) {
  return a.or(b)
}

export function not(a, bitLength) {
  const mask = BigInteger.ONE.shiftLeft(bitLength).subtract(BigInteger.ONE)
  return a.xor(mask)
}

export function shiftLeft(a, n) {
  return a.shiftLeft(n)
}

export function shiftRight(a, n) {
  return a.shiftRight(n)
}

export function testBit(a, n) {
  return a.testBit(n)
}

export function bitLength(a) {
  return a.bitLength()
}

export function add(a, b) {
  return a.add(b)
}

export function subtract(a, b) {
  return a.subtract(b)
}

export function compare(a, b) {
  return a.compareTo(b)
}

export function max(a, b) {
  return a.max(b)
}

export function min(a, b) {
  return a.min(b)
}

export function mod(a, n) {
  return a.mod(n)
}

export function random(bitLength) {
  const byteLen = Math.ceil(bitLength / 8)
  const bytes = window.crypto.getRandomValues(new Uint8Array(byteLen))
  let result = new BigInteger('0')
  for (let i = 0; i < bytes.length; i++) {
    result = result.shiftLeft(8).or(new BigInteger(String(bytes[i])))
  }
  const mask = BigInteger.ONE.shiftLeft(bitLength).subtract(BigInteger.ONE)
  return result.and(mask)
}

export function toBase64(bi) {
  const bytes = toBytes(bi)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function fromBase64(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return fromBytes(bytes)
}

export const ZERO = BigInteger.ZERO
export const ONE = BigInteger.ONE
export const TWO = new BigInteger('2')
