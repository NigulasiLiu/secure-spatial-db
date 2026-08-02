import * as wc from './webcrypto.js'
import * as blake from './blake2b-hash.js'
import * as bi from './bigint-util.js'
import { geoToHilbert, preCode, spatialRangeToPrefixes, prefixToString } from './hilbert.js'

const LAMBDA = 16
const BITMAP_SIZE = 20

export class RSKQClient {
  constructor() {
    this.rootKey = null
    this.keyI = null
    this.keyS = null
    this.stateCounters = new Map()
    this.updateCounters = new Map()
    this.stateTree = new Map()
    this.fileIdCounter = 0
    this.initialized = false
  }

  async init() {
    await blake.initBlake2b()
    this.rootKey = await wc.generateRootKey()
    this.keyI = await wc.generateAesKey()
    this.keyS = await wc.generateAesKey()
    this.initialized = true
  }

  async initFromKeys(rootKeyBytes, keyIBytes, keySBytes) {
    await blake.initBlake2b()
    this.rootKey = await wc.importHmacKey(rootKeyBytes)
    this.keyI = await wc.importAesKey(keyIBytes)
    this.keyS = await wc.importAesKey(keySBytes)
    this.initialized = true
  }

  async exportKeys() {
    return {
      rootKey: await wc.exportKey(this.rootKey),
      keyI: await wc.exportKey(this.keyI),
      keyS: await wc.exportKey(this.keyS)
    }
  }

  _makeIndexKey(keyword, prefix) {
    return keyword + '||' + prefixToString(prefix.prefix, prefix.length)
  }

  _getCounter(key) {
    return this.stateCounters.get(key) || 0
  }

  _setCounter(key, val) {
    this.stateCounters.set(key, val)
  }

  _getUpdateCounter(key) {
    return this.updateCounters.get(key) || 0
  }

  _setUpdateCounter(key, val) {
    this.updateCounters.set(key, val)
  }

  async updateAdd(fileId, keyword, lng, lat) {
    const hilbertIndex = geoToHilbert(lng, lat)
    const prefixes = preCode(hilbertIndex)
    const entries = []

    for (const prefix of prefixes) {
      const indexKey = this._makeIndexKey(keyword, prefix)
      const { kx, kxPrime } = await wc.prfSplit(this.rootKey, indexKey)

      const cnt = this._getCounter(indexKey)
      const cntU = this._getUpdateCounter(indexKey)

      const fIdBi = bi.fromInt(fileId)
      const opBi = bi.fromInt(1)

      const cntBytes = bi.toBytes(bi.fromInt(cnt), LAMBDA)
      const h1Input = blake.concatBytes(kx, cntBytes)
      const h2Input = blake.concatBytes(kxPrime, cntBytes)
      // 论文: eOp = op ⊕ H3(K'x, cnt) — 使用 kxPrime 加密，与 kx 密钥分离
      const h3Input = blake.concatBytes(kxPrime, cntBytes)

      const h1Val = blake.h1(h1Input)
      const tableKey = wc.bytesToHex(h1Val)
      const chainLink = bi.xor(bi.fromBytes(h1Val), fIdBi)
      const eId = bi.xor(bi.fromBytes(blake.h2(h2Input)), fIdBi)
      const eOp = bi.xor(bi.fromBytes(blake.h3(h3Input)), opBi)

      const stateKey = indexKey + '_state'
      const prevState = this.stateTree.get(stateKey) || bi.ZERO
      const h4Input = blake.concatBytes(kx, cntBytes)
      const newState = bi.xor(bi.fromBytes(blake.h4(h4Input)), bi.xor(prevState, fIdBi))
      this.stateTree.set(stateKey, newState)

      entries.push({
        targetTable: 'edb_p',
        indexKey: tableKey,
        chainLink: bi.toBase64(chainLink),
        eId: bi.toBase64(eId),
        eOp: bi.toBase64(eOp),
        cnt: cnt,
        cntU: cntU
      })

      this._setCounter(indexKey, cnt + 1)
      // cntU 不变 — 论文: update 只递增 cnt, cnt_u 保持不变
    }

    return entries
  }

  async updateDelete(fileId, keyword, lng, lat) {
    const hilbertIndex = geoToHilbert(lng, lat)
    const prefixes = preCode(hilbertIndex)
    const entries = []

    for (const prefix of prefixes) {
      const indexKey = this._makeIndexKey(keyword, prefix)
      const { kx, kxPrime } = await wc.prfSplit(this.rootKey, indexKey)

      const cnt = this._getCounter(indexKey)
      const cntU = this._getUpdateCounter(indexKey)

      const fIdBi = bi.fromInt(fileId)
      const opBi = bi.fromInt(0)

      const cntBytes = bi.toBytes(bi.fromInt(cnt), LAMBDA)
      const h1Input = blake.concatBytes(kx, cntBytes)
      const h2Input = blake.concatBytes(kxPrime, cntBytes)
      // 论文: eOp = op ⊕ H3(K'x, cnt) — 使用 kxPrime 加密，与 kx 密钥分离
      const h3Input = blake.concatBytes(kxPrime, cntBytes)

      const h1Val = blake.h1(h1Input)
      const tableKey = wc.bytesToHex(h1Val)
      const chainLink = bi.xor(bi.fromBytes(h1Val), fIdBi)
      const eId = bi.xor(bi.fromBytes(blake.h2(h2Input)), fIdBi)
      const eOp = bi.xor(bi.fromBytes(blake.h3(h3Input)), opBi)

      const stateKey = indexKey + '_state'
      const prevState = this.stateTree.get(stateKey) || bi.ZERO
      const h4Input = blake.concatBytes(kx, cntBytes)
      const newState = bi.xor(bi.fromBytes(blake.h4(h4Input)), bi.xor(prevState, fIdBi))
      this.stateTree.set(stateKey, newState)

      entries.push({
        targetTable: 'edb_p',
        indexKey: tableKey,
        chainLink: bi.toBase64(chainLink),
        eId: bi.toBase64(eId),
        eOp: bi.toBase64(eOp),
        cnt: cnt,
        cntU: cntU
      })

      this._setCounter(indexKey, cnt + 1)
      // cntU 不变 — 论文: update 只递增 cnt, cnt_u 保持不变
    }

    return entries
  }

  async generateSearchToken(keyword, lngMin, latMin, lngMax, latMax) {
    const prefixes = spatialRangeToPrefixes(lngMin, latMin, lngMax, latMax)
    const tokens = []

    for (const prefix of prefixes) {
      const indexKey = this._makeIndexKey(keyword, prefix)
      const { kx, kxPrime } = await wc.prfSplit(this.rootKey, indexKey)

      const cnt = this._getCounter(indexKey)
      const cntU = this._getUpdateCounter(indexKey)

      const rcnt = wc.randomBytes(LAMBDA)

      tokens.push({
        targetTable: 'edb_p',
        kx: wc.bytesToBase64(kx),
        // kxPrime 不发送到服务端 — 论文要求 K'x 仅保留客户端
        rcnt: wc.bytesToBase64(rcnt),
        cnt: cnt,
        cntU: cntU
      })
    }

    return tokens
  }

  async decryptSearchResults(serverResults, keyword, lngMin, latMin, lngMax, latMax) {
    const prefixes = spatialRangeToPrefixes(lngMin, latMin, lngMax, latMax)
    const resultFileIds = new Set()
    const syncStates = []

    for (let i = 0; i < serverResults.length && i < prefixes.length; i++) {
      const serverResult = serverResults[i]
      const prefix = prefixes[i]
      const indexKey = this._makeIndexKey(keyword, prefix)
      const { kx, kxPrime } = await wc.prfSplit(this.rootKey, indexKey)

      const cnt = this._getCounter(indexKey)
      const cntU = this._getUpdateCounter(indexKey)

      // === 论文 Step 3: 解密 SS 获取上一轮聚合位图 ===
      // bsp = ex ⊕ H5(Kx', cntU)
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
        // 论文: op = eOp ⊕ H3(K'x, cnt) — 使用 kxPrime 解密，与加密侧一致
        const h3Input = blake.concatBytes(kxPrime, bi.toBytes(bi.fromInt(entryCnt), LAMBDA))

        const fIdBi = bi.xor(eIdBi, bi.fromBytes(blake.h2(h2Input)))
        const opBi = bi.xor(eOpBi, bi.fromBytes(blake.h3(h3Input)))

        const fileId = parseInt(fIdBi.toString())
        const op = parseInt(opBi.toString())

        // 位图聚合（等价论文 Boolean circuit: bsp = (bsp ∧ ¬bId) ⊕ (bId ∧ bOp)）
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
      // new cntU = cnt, new cnt = cnt（不变）
      this._setUpdateCounter(indexKey, cnt)
    }

    return { fileIds: Array.from(resultFileIds).sort((a, b) => a - b), syncStates }
  }

  async encryptDocument(plaintext) {
    const ptBytes = typeof plaintext === 'string' ? new TextEncoder().encode(plaintext) : plaintext
    return await wc.aesEncrypt(this.keyI, ptBytes)
  }

  async decryptDocument(ciphertext) {
    return await wc.aesDecrypt(this.keyI, ciphertext)
  }

  nextFileId() {
    this.fileIdCounter++
    return this.fileIdCounter
  }

  getState() {
    const state = {
      stateCounters: {},
      updateCounters: {},
      stateTree: {},
      fileIdCounter: this.fileIdCounter
    }
    for (const [k, v] of this.stateCounters) state.stateCounters[k] = v
    for (const [k, v] of this.updateCounters) state.updateCounters[k] = v
    for (const [k, v] of this.stateTree) state.stateTree[k] = bi.toBase64(v)
    return state
  }

  loadState(state) {
    this.fileIdCounter = state.fileIdCounter || 0
    this.stateCounters = new Map(Object.entries(state.stateCounters || {}))
    this.updateCounters = new Map(Object.entries(state.updateCounters || {}))
    this.stateTree = new Map()
    for (const [k, v] of Object.entries(state.stateTree || {})) {
      this.stateTree.set(k, bi.fromBase64(v))
    }
  }
}

export async function createClient() {
  const client = new RSKQClient()
  await client.init()
  return client
}
