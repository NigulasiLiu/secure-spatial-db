/**
 * Web Worker for offloading RSKQ encryption operations from main thread.
 * Handles: updateAdd, updateDelete, generateSearchToken, decryptSearchResults, encryptDocument
 */
import * as wc from './webcrypto.js'
import * as blake from './blake2b-hash.js'
import * as bi from './bigint-util.js'
import { geoToHilbert, preCode, spatialRangeToPrefixes, prefixToString } from './hilbert.js'

const LAMBDA = 16

let rootKey = null
let keyI = null
let keyS = null
let stateCounters = new Map()
let updateCounters = new Map()
let stateTree = new Map()
let fileIdCounter = 0
let initialized = false

function makeIndexKey(keyword, prefix) {
  return keyword + '||' + prefixToString(prefix.prefix, prefix.length)
}

async function initFromKeys(rootKeyBytes, keyIBytes, keySBytes) {
  await blake.initBlake2b()
  rootKey = await wc.importHmacKey(rootKeyBytes)
  keyI = await wc.importAesKey(keyIBytes)
  keyS = await wc.importAesKey(keySBytes)
  initialized = true
}

function loadState(state) {
  fileIdCounter = state.fileIdCounter || 0
  stateCounters = new Map(Object.entries(state.stateCounters || {}))
  updateCounters = new Map(Object.entries(state.updateCounters || {}))
  stateTree = new Map()
  for (const [k, v] of Object.entries(state.stateTree || {})) {
    stateTree.set(k, bi.fromBase64(v))
  }
}

function getState() {
  const state = {
    stateCounters: {},
    updateCounters: {},
    stateTree: {},
    fileIdCounter: fileIdCounter
  }
  for (const [k, v] of stateCounters) state.stateCounters[k] = v
  for (const [k, v] of updateCounters) state.updateCounters[k] = v
  for (const [k, v] of stateTree) state.stateTree[k] = bi.toBase64(v)
  return state
}

async function updateAdd(fileId, keyword, lng, lat) {
  const hilbertIndex = geoToHilbert(lng, lat)
  const prefixes = preCode(hilbertIndex)
  const entries = []
  for (const prefix of prefixes) {
    const indexKey = makeIndexKey(keyword, prefix)
    const { kx, kxPrime } = await wc.prfSplit(rootKey, indexKey)
    const cnt = stateCounters.get(indexKey) || 0
    const cntU = updateCounters.get(indexKey) || 0
    const fIdBi = bi.fromInt(fileId)
    const opBi = bi.fromInt(1)
    const h1Input = blake.concatBytes(kx, bi.toBytes(bi.fromInt(cnt), LAMBDA))
    const h2Input = blake.concatBytes(kxPrime, bi.toBytes(bi.fromInt(cnt), LAMBDA))
    const h3Input = blake.concatBytes(kx, bi.toBytes(bi.fromInt(cnt), LAMBDA))
    const chainLink = bi.xor(bi.fromBytes(blake.h1(h1Input)), fIdBi)
    const eId = bi.xor(bi.fromBytes(blake.h2(h2Input)), fIdBi)
    const eOp = bi.xor(bi.fromBytes(blake.h3(h3Input)), opBi)
    const stateKey = indexKey + '_state'
    const prevState = stateTree.get(stateKey) || bi.ZERO
    const h4Input = blake.concatBytes(kx, bi.toBytes(bi.fromInt(cnt), LAMBDA))
    const newState = bi.xor(bi.fromBytes(blake.h4(h4Input)), bi.xor(prevState, fIdBi))
    stateTree.set(stateKey, newState)
    entries.push({ targetTable: 'edb_p', indexKey, chainLink: bi.toBase64(chainLink), eId: bi.toBase64(eId), eOp: bi.toBase64(eOp), cnt, cntU })
    stateCounters.set(indexKey, cnt + 1)
    updateCounters.set(indexKey, cntU + 1)
  }
  return entries
}

async function generateSearchToken(keyword, lngMin, latMin, lngMax, latMax) {
  const prefixes = spatialRangeToPrefixes(lngMin, latMin, lngMax, latMax)
  const tokens = []
  for (const prefix of prefixes) {
    const indexKey = makeIndexKey(keyword, prefix)
    const { kx, kxPrime } = await wc.prfSplit(rootKey, indexKey)
    const cnt = stateCounters.get(indexKey) || 0
    const cntU = updateCounters.get(indexKey) || 0
    const rcnt = wc.randomBytes(LAMBDA)
    tokens.push({ targetTable: 'edb_p', kx: wc.bytesToBase64(kx), kxPrime: wc.bytesToBase64(kxPrime), rcnt: wc.bytesToBase64(rcnt), cnt, cntU })
  }
  return tokens
}

async function decryptSearchResults(serverResults, keyword, lngMin, latMin, lngMax, latMax) {
  const prefixes = spatialRangeToPrefixes(lngMin, latMin, lngMax, latMax)
  const resultFileIds = new Set()
  for (let i = 0; i < serverResults.length && i < prefixes.length; i++) {
    const serverResult = serverResults[i]
    const prefix = prefixes[i]
    const indexKey = makeIndexKey(keyword, prefix)
    const { kx, kxPrime } = await wc.prfSplit(rootKey, indexKey)
    const encryptedBitmaps = serverResult.encryptedBitmaps || {}
    for (const [cntStr, pair] of Object.entries(encryptedBitmaps)) {
      const cnt = parseInt(cntStr)
      const eIdBi = bi.fromBase64(pair[0])
      const eOpBi = bi.fromBase64(pair[1])
      const h2Input = blake.concatBytes(kxPrime, bi.toBytes(bi.fromInt(cnt), LAMBDA))
      const h3Input = blake.concatBytes(kx, bi.toBytes(bi.fromInt(cnt), LAMBDA))
      const fIdBi = bi.xor(eIdBi, bi.fromBytes(blake.h2(h2Input)))
      const opBi = bi.xor(eOpBi, bi.fromBytes(blake.h3(h3Input)))
      const fileId = parseInt(fIdBi.toString())
      const op = parseInt(opBi.toString())
      if (op === 1) resultFileIds.add(fileId)
      else resultFileIds.delete(fileId)
    }
  }
  return Array.from(resultFileIds).sort((a, b) => a - b)
}

async function encryptDocument(plaintext) {
  const ptBytes = typeof plaintext === 'string' ? new TextEncoder().encode(plaintext) : plaintext
  return await wc.aesEncrypt(keyI, ptBytes)
}

self.onmessage = async (e) => {
  const { id, action, payload } = e.data
  try {
    let result
    switch (action) {
      case 'initFromKeys':
        await initFromKeys(payload.rootKeyBytes, payload.keyIBytes, payload.keySBytes)
        result = { ok: true }
        break
      case 'loadState':
        loadState(payload.state)
        result = { ok: true }
        break
      case 'getState':
        result = getState()
        break
      case 'updateAdd':
        result = await updateAdd(payload.fileId, payload.keyword, payload.lng, payload.lat)
        break
      case 'generateSearchToken':
        result = await generateSearchToken(payload.keyword, payload.lngMin, payload.latMin, payload.lngMax, payload.latMax)
        break
      case 'decryptSearchResults':
        result = await decryptSearchResults(payload.serverResults, payload.keyword, payload.lngMin, payload.latMin, payload.lngMax, payload.latMax)
        break
      case 'encryptDocument':
        result = await encryptDocument(payload.plaintext)
        break
      default:
        throw new Error('Unknown action: ' + action)
    }
    self.postMessage({ id, ok: true, result })
  } catch (err) {
    self.postMessage({ id, ok: false, error: err.message || String(err) })
  }
}
