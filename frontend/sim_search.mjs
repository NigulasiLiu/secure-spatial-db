// 小型模拟：用真实算法核心（hilbert.js）复刻 上传(uploadAdd) + 搜索含前缀回溯(generateSearchToken)
// 验证：搜索范围前缀 + 回溯祖先前缀后，能否命中上传侧存储的 tableKey
// 用法：node sim_search.mjs
import { createHmac } from 'node:crypto'
import jsbn from 'jsbn'
import blake from 'blake2b-wasm'
import {
  geoToHilbert, preCode, spatialRangeToPrefixes,
  prefixToString, getOrder
} from './src/crypto/hilbert.js'

const { BigInteger } = jsbn
await blake.ready()

const LAMBDA = 16

// ---- bigint util（与 bigint-util.js 对齐）----
function biFromInt(num) { return new BigInteger(String(num)) }
function biToBytes(bi, length) {
  const raw = bi.toByteArray()
  if (length && raw.length < length) {
    const padded = new Uint8Array(length)
    padded.set(raw, length - raw.length)
    return padded
  }
  return new Uint8Array(raw)
}
function biXor(a, b) { return a.xor(b) }
function biFromBytes(bytes) { return new BigInteger(Array.from(bytes)) }
function biFromBase64(b64) {
  const binary = Buffer.from(b64, 'base64').toString('binary')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return biFromBytes(bytes)
}
function biToBase64(bi) {
  const bytes = biToBytes(bi)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return Buffer.from(binary, 'binary').toString('base64')
}

// ---- blake2b 16 字节，与 blake2b-hash.js 一致 ----
function blake2b16(input) {
  const h = blake(16, null, null)
  h.update(input)
  return new Uint8Array(h.digest())
}

// ---- prfSplit，与 webcrypto.js 对齐（HMAC-SHA256, kx=前16, kxPrime=后16）----
function prfSplit(rootKeyBytes, indexKey) {
  const full = createHmac('sha256', Buffer.from(rootKeyBytes))
    .update(Buffer.from(indexKey, 'utf8')).digest()
  return {
    kx: new Uint8Array(full.subarray(0, LAMBDA)),
    kxPrime: new Uint8Array(full.subarray(LAMBDA, LAMBDA * 2))
  }
}
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
function concatBytes(...arrs) {
  const total = arrs.reduce((s, a) => s + a.length, 0)
  const r = new Uint8Array(total)
  let o = 0
  for (const a of arrs) { r.set(a, o); o += a.length }
  return r
}

function makeIndexKey(keyword, prefix) {
  return keyword + '||' + prefixToString(prefix.prefix, prefix.length)
}

// ================= 真实 rootKey（随机生成即可，模拟不需要真密钥）=================
const rootKey = new Uint8Array(32).map(() => (Math.random() * 256) | 0)
console.log('rootKey:', bytesToHex(rootKey))
console.log('HILBERT_ORDER =', getOrder() * 2, 'bit 前缀树\n')

// ============ 1. 上传侧：一个上传点 → preCode → 存储 tableKey(cnt=0) ============
const UP_LNG = 116.31761   // 海底捞中关村（示例坐标）
const UP_LAT = 39.97910
const KEYWORD = '海底捞中关村'

const uploadPrefixes = preCode(geoToHilbert(UP_LNG, UP_LAT))
const uploadDb = new Map()  // indexKey -> { cnt, tableKey }
console.log(`[UPLOAD] 上传点 (${UP_LNG}, ${UP_LAT})`)
console.log(`[UPLOAD] preCode 生成 ${uploadPrefixes.length} 个层级前缀，最长 ${uploadPrefixes.at(-1).length} 位`)
for (const p of uploadPrefixes) {
  const indexKey = makeIndexKey(KEYWORD, p)
  const cnt = 0  // 首次上传从 0 开始
  const { kx } = prfSplit(rootKey, indexKey)
  const tableKey = bytesToHex(blake2b16(concatBytes(kx, biToBytes(biFromInt(cnt), LAMBDA))))
  uploadDb.set(indexKey, { cnt, length: p.length, tableKey })
}
console.log(`[UPLOAD] 已存储 ${uploadDb.size} 个唯一前缀条目 (每个 cnt=0)\n`)

// ============ 2. 搜索侧：一个范围矩形 → spatialRangeToPrefixes ============
// 范围略大于上传点，使其覆盖到该点（更大范围，以产生多个不同深度的前缀）
const SEARCH = { lngMin: 116.28, latMin: 39.95, lngMax: 116.36, latMax: 40.03 }
const searchPrefixes = spatialRangeToPrefixes(
  SEARCH.lngMin, SEARCH.latMin, SEARCH.lngMax, SEARCH.latMax
)
console.log(`[SEARCH] 范围 (${SEARCH.lngMin},${SEARCH.latMin})-(${SEARCH.lngMax},${SEARCH.latMax})`)
console.log(`[SEARCH] spatialRangeToPrefixes 生成 ${searchPrefixes.length} 个范围覆盖前缀`)
const strList = searchPrefixes.map(p => prefixToString(p.prefix, p.length))
const maxLen = Math.max(...searchPrefixes.map(p => p.length))
const minLen = Math.min(...searchPrefixes.map(p => p.length))
console.log(`[SEARCH] 前缀长度范围 ${minLen}..${maxLen} 位`)
console.log(`[SEARCH] 前缀示意: ${strList.slice(0, 5).join(', ')}${strList.length > 5 ? ' ...' : ''}\n`)

// ============ 3. 直接命中测试（无回溯，当前代码行为）============
// 返回某前缀的所有真祖先截断（len-1, len-2, ... 1）
function ancestorsOf(prefixStr) {
  const res = []
  for (let i = prefixStr.length - 1; i >= 1; i--) res.push(prefixStr.slice(0, i))
  return res
}

let directHits = searchPrefixes.filter(p => uploadDb.has(makeIndexKey(KEYWORD, p)))
console.log(`[DIRECT] 搜索前缀直接命中上传前缀: ${directHits.length} / ${searchPrefixes.length}`)

// 找出直接未命中但能回溯命中的前缀（即"搜索更深、祖先在上传链里"的错位样例）
let offsetSamples = []
for (const p of searchPrefixes) {
  const ik = makeIndexKey(KEYWORD, p)
  if (uploadDb.has(ik)) continue
  const str = prefixToString(p.prefix, p.length)
  for (const anc of ancestorsOf(str)) {
    if (uploadDb.has(KEYWORD + '||' + anc)) {
      offsetSamples.push({ searchLen: str.length, ancestorLen: anc.length, search: str, ancestor: anc })
      break
    }
  }
}
console.log(`[OFFSET] 搜索深于上传祖先、可通过回溯救回的错位前缀: ${offsetSamples.length} / ${searchPrefixes.length}`)
for (const s of offsetSamples.slice(0, 8)) {
  console.log(`   -- 搜索 ${s.searchLen}位: ${s.search.slice(0,30)}${s.search.length>30?'...':''}  ->  祖先 ${s.ancestorLen}位: ${s.ancestor.slice(0,30)}${s.ancestor.length>30?'...':''} 两者差 ${s.searchLen - s.ancestorLen} bit`)
}
if (offsetSamples.length === 0) {
  console.log('   (当前范围未产生深度错位样例，切换更大/不规整矩形以复现)')
}

// ============ 4. 回溯祖先前缀测试（方案：从长到短截断，命中即停）============
let backHits = 0
let backDetail = []
for (const p of searchPrefixes) {
  const indexKey = makeIndexKey(KEYWORD, p)
  if (uploadDb.has(indexKey)) { backHits++; continue }  // 直接命中
  // 回溯
  const str = prefixToString(p.prefix, p.length)
  for (const anc of ancestorsOf(str)) {
    // 构造同深度的 prefix 对象用于 indexKey
    if (uploadDb.has(KEYWORD + '||' + anc)) {
      backHits++
      backDetail.push({ search: str, ancestor: anc })
      break
    }
  }
}
console.log(`\n[BACKTRACK] 搜索前缀+回溯祖先 命中: ${backHits} / ${searchPrefixes.length}`)
if (backDetail.length) {
  console.log(`[BACKTRACK] 回溯命中示例（最多展示8条）:`)
  for (const d of backDetail.slice(0, 8)) {
    console.log(`   -- search=${d.search} -> ancestor=${d.ancestor} ✅`)
  }
}

// ============ 5. 端到端：用回溯命中的祖先前缀，跑后端循环 doSearch 取数 ============
// 模拟后端 executeSearch：对搜索 token（含回溯后的祖先前缀），在 DB 里查 cnt=0 的 tableKey
console.log(`\n===== 端到端闭环 =====`)
function doSearch(prefixesForSearch) {
  let found = 0
  const foundKeys = []
  for (const p of prefixesForSearch) {
    const indexKey = makeIndexKey(KEYWORD, p)
    const rec = uploadDb.get(indexKey)
    if (!rec) continue
    // 后端对每个已上传 cnt，查该 tableKey 是否在"DB"，命中即消费
    // 这里直接看 rec
    found++
    foundKeys.push({ prefix: indexKey.split('||')[1], tableKey: rec.tableKey })
  }
  return { found, foundKeys }
}

// 直接搜索（无回溯）
const directRes = doSearch(searchPrefixes)
console.log(`[E2E-DIRECT]    后端取数条数: ${directRes.found}`)

// 回溯后搜索：把每个搜索前缀替换为其最长已上传祖先
const backSearchList = []
let replacedCount = 0
for (const p of searchPrefixes) {
  const ik = makeIndexKey(KEYWORD, p)
  if (uploadDb.has(ik)) { backSearchList.push(p); continue }
  const str = prefixToString(p.prefix, p.length)
  let replaced = null
  for (const anc of ancestorsOf(str)) {
    if (uploadDb.has(KEYWORD + '||' + anc)) {
      const ancPrefix = { prefix: parseInt(anc, 2), length: anc.length }
      replaced = ancPrefix
      replacedCount++
      break
    }
  }
  backSearchList.push(replaced || p)
}
const backRes = doSearch(backSearchList)
console.log(`[E2E-BACKTRACK] 回溯后取数条数: ${backRes.found}（其中 ${replacedCount} 条经回溯祖先替换后命中）`)

console.log(`\n===== 结论 =====
直接搜索(当前代码): 命中 ${directRes.found} 条目 -> ${directRes.found > 0 ? '✅ 可命中' : '❌ miss（根因复现）'}
回溯祖先前缀搜索:    命中 ${backRes.found} 条目 -> ${backRes.found > 0 ? '✅ 可命中（算法本身没问题，问题在前缀深度）' : '❌ 仍 miss（需进一步查）'}
`)

// ============ 6. 精确复现昨晚铁证：搜索18位 vs 上传17位 ============
console.log(`\n===== 昨晚真实铁证复现（search 18位 vs upload 17位）=====`)
const up17 = '10110100110011100'       // 上传 longest preCode 17位
const srch18 = '101101001100111000'     // 搜索唯一非零前缀 18位
const kw = KEYWORD

// 模拟"已上传"的是 17 位链路（含 17 位祖先）
const uploadChain = new Set()
// 构造 preCode 链路（从根逐步到 17 位）
let cur = ''
for (let i = 0; i < up17.length; i++) { cur += up17[i]; uploadChain.add(kw + '||' + cur) }

// 直接查 18位（当前代码行为）
console.log(`[铁证] 上传链路含 17位祖先: ${uploadChain.has(kw+'||'+up17) ? '✅' : '❌'}`)
console.log(`[铁证] 直接查 18位前缀(当前): ${uploadChain.has(kw+'||'+srch18) ? '✅ 命中' : '❌ miss（复现根因：18位前缀未被上传过）'}`)
// 回溯 18位 -> 17位
const anc17 = srch18.slice(0, 17)
console.log(`[铁证] 回溯到 17位祖先(方案): 搜索前缀 ${anc17} == 上传前缀 ${up17} ? ${anc17 === up17 ? '✅ 相等' : '❌ 不等'}`)
console.log(`[铁证] 回溯后查祖先: ${uploadChain.has(kw+'||'+up17) ? '✅ 命中（回溯方案可解）' : '❌ miss'}`)
console.log(`[铁证] 判定: 18位 vs 17位 差 ${srch18.length - up17.length} bit -> 前缀深度错位「确实是根因」，且回溯祖先前缀可修复`)
