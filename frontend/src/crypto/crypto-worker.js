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
    // 论文: eOp = op ⊕ H3(K'x, cnt) — 使用 kxPrime 加密
    const h3Input = blake.concatBytes(kxPrime, bi.toBytes(bi.fromInt(cnt), LAMBDA))
    const h1Val = blake.h1(h1Input)
    const tableKey = wc.bytesToHex(h1Val)
    const chainLink = bi.xor(bi.fromBytes(h1Val), fIdBi)
    const eId = bi.xor(bi.fromBytes(blake.h2(h2Input)), fIdBi)
    const eOp = bi.xor(bi.fromBytes(blake.h3(h3Input)), opBi)
    const stateKey = indexKey + '_state'
    const prevState = stateTree.get(stateKey) || bi.ZERO
    const h4Input = blake.concatBytes(kx, bi.toBytes(bi.fromInt(cnt), LAMBDA))
    const newState = bi.xor(bi.fromBytes(blake.h4(h4Input)), bi.xor(prevState, fIdBi))
    stateTree.set(stateKey, newState)
    entries.push({ targetTable: 'edb_p', indexKey: tableKey, chainLink: bi.toBase64(chainLink), eId: bi.toBase64(eId), eOp: bi.toBase64(eOp), cnt, cntU })
    stateCounters.set(indexKey, cnt + 1)
    // cntU 不变 — 论文: update 只递增 cnt, cnt_u 保持不变
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
    tokens.push({ targetTable: 'edb_p', kx: wc.bytesToBase64(kx), rcnt: wc.bytesToBase64(rcnt), cnt, cntU })
  }
  return tokens
}

async function decryptSearchResults(serverResults, keyword, lngMin, latMin, lngMax, latMax) {
  const BITMAP_SIZE = 20
  const prefixes = spatialRangeToPrefixes(lngMin, latMin, lngMax, latMax)
  const resultFileIds = new Set()
  const syncStates = []
  for (let i = 0; i < serverResults.length && i < prefixes.length; i++) {
    const serverResult = serverResults[i]
    const prefix = prefixes[i]
    const indexKey = makeIndexKey(keyword, prefix)
    const { kx, kxPrime } = await wc.prfSplit(rootKey, indexKey)
    const cnt = stateCounters.get(indexKey) || 0
    const cntU = updateCounters.get(indexKey) || 0

    // === 论文 Step 3: 解密 SS 获取上一轮聚合位图 ===
    let bsp = bi.ZERO
    if (serverResult.encryptedState) {
      const ex = bi.fromBase64(serverResult.encryptedState)
      if (!ex.equals(bi.ZERO)) {
        const h5DecInput = blake.concatBytes(kxPrime, bi.toBytes(bi.fromInt(cntU), LAMBDA))
        const h5DecVal = bi.fromBytes(blake.h5(h5DecInput))
        bsp = bi.xor(ex, h5DecVal)
      }
    }

    // === 解密新条目并聚合到位图 ===
    const encryptedBitmaps = serverResult.encryptedBitmaps || {}
    for (const [cntStr, pair] of Object.entries(encryptedBitmaps)) {
      const entryCnt = parseInt(cntStr)
      const eIdBi = bi.fromBase64(pair[0])
      const eOpBi = bi.fromBase64(pair[1])
      const h2Input = blake.concatBytes(kxPrime, bi.toBytes(bi.fromInt(entryCnt), LAMBDA))
      // 论文: op = eOp ⊕ H3(K'x, cnt) — 使用 kxPrime 解密
      const h3Input = blake.concatBytes(kxPrime, bi.toBytes(bi.fromInt(entryCnt), LAMBDA))
      const fIdBi = bi.xor(eIdBi, bi.fromBytes(blake.h2(h2Input)))
      const opBi = bi.xor(eOpBi, bi.fromBytes(blake.h3(h3Input)))
      const fileId = parseInt(fIdBi.toString())
      const op = parseInt(opBi.toString())
      // 位图聚合: op=1 设置位, op=0 清除位
      const bId = bi.shiftLeft(bi.ONE, fileId)
      if (op === 1) {
        bsp = bi.or(bsp, bId)
      } else {
        bsp = bi.xor(bsp, bi.and(bsp, bId))
      }
    }

    // === 从聚合位图提取文件 ID ===
    for (let f = 1; f <= BITMAP_SIZE; f++) {
      if (bi.testBit(bsp, f)) {
        resultFileIds.add(f)
      }
    }

    // === 论文 Step 3: 计算新 ex = bsp ⊕ H5(Kx', cnt) ===
    const h5EncInput = blake.concatBytes(kxPrime, bi.toBytes(bi.fromInt(cnt), LAMBDA))
    const h5EncVal = bi.fromBytes(blake.h5(h5EncInput))
    const newEx = bi.xor(bsp, h5EncVal)

    // === 论文 Step 4: 准备同步到服务器 SS[Kx] = ex ===
    syncStates.push({
      keyX: wc.bytesToBase64(kx),
      stateValue: bi.toBase64(newEx)
    })

    // === 论文 Step 3: 更新本地状态 SC[x] = (cnt, cnt, R_cnt) ===
    updateCounters.set(indexKey, cnt)
  }
  return { fileIds: Array.from(resultFileIds).sort((a, b) => a - b), syncStates }
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
