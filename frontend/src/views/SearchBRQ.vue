<template>
  <div class="search-brq-page">
    <el-card shadow="hover">
      <template #header>布尔范围检索（BRQ）</template>
      <el-form :model="form" label-width="120px">
        <el-form-item label="关键词">
          <KeywordSuggest v-model="form.keyword" placeholder="输入检索关键词" @search="handleSearch" />
        </el-form-item>
        <el-form-item label="经度范围">
          <el-col :span="11">
            <el-input-number v-model="form.lngMin" :precision="6" :step="0.01" :min="-180" :max="180" placeholder="最小经度" />
          </el-col>
          <el-col :span="2" style="text-align: center;">~</el-col>
          <el-col :span="11">
            <el-input-number v-model="form.lngMax" :precision="6" :step="0.01" :min="-180" :max="180" placeholder="最大经度" />
          </el-col>
        </el-form-item>
        <el-form-item label="纬度范围">
          <el-col :span="11">
            <el-input-number v-model="form.latMin" :precision="6" :step="0.01" :min="-90" :max="90" placeholder="最小纬度" />
          </el-col>
          <el-col :span="2" style="text-align: center;">~</el-col>
          <el-col :span="11">
            <el-input-number v-model="form.latMax" :precision="6" :step="0.01" :min="-90" :max="90" placeholder="最大纬度" />
          </el-col>
        </el-form-item>
        <el-form-item label="地图选区">
          <div ref="mapContainer" class="map-container"></div>
          <div class="map-controls">
            <el-switch v-model="showHeatmap" active-text="热力图" @change="toggleHeatmap" />
            <el-switch v-model="enableClustering" active-text="聚类标记" @change="plotResultsOnMap" />
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="searching" @click="handleSearch">生成检索令牌并检索</el-button>
          <el-button @click="resetForm">重置</el-button>
          <el-button @click="showHistory = true">历史</el-button>
          <el-button @click="saveCurrentSearch">保存搜索</el-button>
          <el-button v-if="searchResults.length > 0" @click="exportCSV">导出CSV</el-button>
          <el-button v-if="searchResults.length > 0" @click="stashForCompare">暂存对比</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="hover" style="margin-top: 20px;">
      <template #header>检索结果（{{ searchResults.length }} 条）</template>
      <el-skeleton v-if="searching" :rows="5" animated />
      <template v-else-if="searchResults.length > 0">
        <el-table :data="searchResults" stripe>
          <el-table-column prop="fileId" label="文件ID" width="100" />
          <el-table-column prop="encryptedName" label="加密文件名" />
          <el-table-column prop="fileSize" label="大小(bytes)" width="130" />
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button size="small" type="primary" @click="handleDownload(row.fileId)">下载解密</el-button>
              <el-button size="small" @click="previewResult(row)">预览</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <EmptyState v-else :text="hasSearched ? '未检索到匹配文档' : '请输入关键词并检索'" :subtext="hasSearched ? '尝试更换关键词或扩大范围' : '支持布尔范围检索'" />
    </el-card>

    <el-drawer v-model="showHistory" title="检索历史" size="350px">
      <div v-if="searchHistoryList.length === 0" style="text-align:center;color:#8C8C8C;padding:20px">暂无历史记录</div>
      <div v-for="(item, idx) in searchHistoryList" :key="idx" class="history-item" @click="restoreSearch(item)">
        <div class="history-keyword">{{ item.keyword }}</div>
        <div class="history-meta">范围: [{{ item.lngMin.toFixed(2) }}, {{ item.latMin.toFixed(2) }}] ~ [{{ item.lngMax.toFixed(2) }}, {{ item.latMax.toFixed(2) }}]</div>
        <div class="history-time">{{ item.time }}</div>
      </div>
      <el-button v-if="searchHistoryList.length > 0" style="margin-top:12px" type="danger" plain size="small" @click="clearHistory">清空历史</el-button>
    </el-drawer>

    <el-drawer v-model="showPreview" title="结果详情" size="400px">
      <el-descriptions v-if="previewData" :column="1" border>
        <el-descriptions-item label="文件ID">{{ previewData.fileId }}</el-descriptions-item>
        <el-descriptions-item label="加密文件名">{{ previewData.encryptedName }}</el-descriptions-item>
        <el-descriptions-item label="文件大小">{{ formatFileSize(previewData.fileSize) }}</el-descriptions-item>
        <el-descriptions-item label="坐标">
          <span v-if="getCoord(previewData.fileId)">{{ getCoord(previewData.fileId).lng.toFixed(6) }}, {{ getCoord(previewData.fileId).lat.toFixed(6) }}</span>
          <span v-else>未记录</span>
        </el-descriptions-item>
      </el-descriptions>
      <div style="margin-top:16px;text-align:center">
        <el-button type="primary" @click="handleDownload(previewData.fileId)">下载解密</el-button>
      </div>
    </el-drawer>

    <el-dialog v-model="showCompare" title="结果对比" width="700px">
      <div v-if="compareData">
        <el-row :gutter="20">
          <el-col :span="12">
            <h4>暂存结果（{{ compareData.stashed.length }} 条）</h4>
            <el-tag type="info" v-for="r in compareData.stashed" :key="r.fileId" style="margin:4px">{{ r.fileId }}</el-tag>
          </el-col>
          <el-col :span="12">
            <h4>当前结果（{{ compareData.current.length }} 条）</h4>
            <el-tag type="success" v-for="r in compareData.current" :key="r.fileId" style="margin:4px">{{ r.fileId }}</el-tag>
          </el-col>
        </el-row>
        <el-divider />
        <h4>新增结果（{{ compareData.added.length }} 条）</h4>
        <el-tag type="success" v-for="r in compareData.added" :key="r.fileId" style="margin:4px">{{ r.fileId }}</el-tag>
        <el-divider />
        <h4>消失结果（{{ compareData.removed.length }} 条）</h4>
        <el-tag type="danger" v-for="r in compareData.removed" :key="r.fileId" style="margin:4px">{{ r.fileId }}</el-tag>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import L from 'leaflet'
import { RSKQClient } from '@/crypto/rskq-client'
import { edbApi, documentApi } from '@/api'
import KeywordSuggest from '@/components/KeywordSuggest.vue'
import EmptyState from '@/components/EmptyState.vue'
import { cacheManager } from '@/utils/cache-manager'
import { validateInput } from '@/utils/security'

const mapContainer = ref()
const searching = ref(false)
const searchResults = ref([])
const hasSearched = ref(false)
const showHeatmap = ref(false)
const enableClustering = ref(false)
const showHistory = ref(false)
const showPreview = ref(false)
const previewData = ref(null)
const showCompare = ref(false)
const compareData = ref(null)
const stashedResults = ref([])
const searchHistoryList = ref(JSON.parse(localStorage.getItem('brq_history') || '[]'))
let map = null
let rectLayer = null
let markerLayer = null
let heatmapLayer = null
let client = null

const form = reactive({
  keyword: '',
  lngMin: 116.0,
  latMin: 39.5,
  lngMax: 117.0,
  latMax: 40.5
})

onMounted(async () => {
  await nextTick()
  initMap()
  await initClient()
  window.__brqDownload = handleDownload
})

function initMap() {
  map = L.map(mapContainer.value).setView([39.9, 116.4], 9)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'OpenStreetMap', maxZoom: 19
  }).addTo(map)
  drawRect()
  map.on('click', (e) => {
    form.lngMin = parseFloat(e.latlng.lng.toFixed(6))
    form.latMin = parseFloat(e.latlng.lat.toFixed(6))
    form.lngMax = form.lngMin + 1
    form.latMax = form.latMin + 1
    drawRect()
  })
}

function drawRect() {
  if (rectLayer) map.removeLayer(rectLayer)
  rectLayer = L.rectangle(
    [[form.latMin, form.lngMin], [form.latMax, form.lngMax]],
    { color: '#FF6A00', weight: 2, fillOpacity: 0.1 }
  ).addTo(map)
}

async function initClient() {
  const saved = localStorage.getItem('rskq_keys')
  if (!saved) { ElMessage.warning('请先上传文档初始化密钥'); return }
  const keys = JSON.parse(saved)
  client = new RSKQClient()
  await client.initFromKeys(
    new Uint8Array(keys.rootKey),
    new Uint8Array(keys.keyI),
    new Uint8Array(keys.keyS)
  )
  const stateSaved = localStorage.getItem('rskq_state')
  if (stateSaved) client.loadState(JSON.parse(stateSaved))
}

async function handleSearch() {
  form.keyword = validateInput(form.keyword, 200)
  if (!form.keyword) { ElMessage.warning('请输入关键词'); return }
  if (!client) { ElMessage.warning('密钥未初始化'); return }
  searching.value = true
  hasSearched.value = true
  try {
    const cached = cacheManager.getSearchResult(form.keyword, form.lngMin, form.latMin, form.lngMax, form.latMax)
    if (cached) {
      searchResults.value = cached
      plotResultsOnMap()
      ElMessage.success(`命中 ${cached.length} 条（缓存）`)
      return
    }

    const tokens = await client.generateSearchToken(
      form.keyword, form.lngMin, form.latMin, form.lngMax, form.latMax
    )
    const searchRes = await edbApi.search(tokens)
    const { fileIds, syncStates } = await client.decryptSearchResults(
      searchRes.data.results || [],
      form.keyword, form.lngMin, form.latMin, form.lngMax, form.latMax
    )

    // 论文 Step 4: 同步聚合状态 SS 到服务器
    if (syncStates && syncStates.length > 0) {
      await edbApi.sync(syncStates)
    }

    // 持久化更新后的客户端状态（cntU 已推进）
    localStorage.setItem('rskq_state', JSON.stringify(client.getState()))

    let docMap
    const cachedMeta = cacheManager.getDocMetaList()
    if (cachedMeta) {
      docMap = new Map(cachedMeta.map(d => [d.fileId, d]))
    } else {
      const docListRes = await documentApi.list()
      cacheManager.setDocMetaList(docListRes.data)
      docMap = new Map(docListRes.data.map(d => [d.fileId, d]))
    }

    const results = fileIds.map(fid => docMap.get(fid) || { fileId: fid, encryptedName: 'unknown', fileSize: 0 })
    searchResults.value = results
    cacheManager.setSearchResult(form.keyword, form.lngMin, form.latMin, form.lngMax, form.latMax, results)
    cacheManager.recordSearchKeyword(form.keyword.trim())
    plotResultsOnMap()
    ElMessage.success(`检索完成，命中 ${fileIds.length} 条`)
  } catch (e) {
    ElMessage.error('检索失败: ' + (e.message || '未知错误'))
  } finally {
    searching.value = false
  }
}

function plotResultsOnMap() {
  if (!map) return
  if (markerLayer) { map.removeLayer(markerLayer); markerLayer = null }
  if (heatmapLayer) { map.removeLayer(heatmapLayer); heatmapLayer = null }

  const coords = cacheManager.getAllDocCoords()
  const points = []
  for (const r of searchResults.value) {
    const c = coords[r.fileId]
    if (c) points.push({ fileId: r.fileId, lng: c.lng, lat: c.lat, name: r.encryptedName, size: r.fileSize })
  }
  if (points.length === 0) return

  markerLayer = L.layerGroup().addTo(map)

  if (enableClustering.value && points.length > 10) {
    const clusters = simpleCluster(points, 0.05)
    for (const cluster of clusters) {
      if (cluster.points.length === 1) {
        addSingleMarker(markerLayer, cluster.points[0])
      } else {
        const center = cluster.center
        const cm = L.marker([center.lat, center.lng], {
          icon: L.divIcon({ html: `<div class="cluster-icon">${cluster.points.length}</div>`, className: 'custom-cluster', iconSize: [40, 40] })
        }).addTo(markerLayer)
        cm.bindPopup(`聚类: ${cluster.points.length} 个文档`)
      }
    }
  } else {
    for (const p of points) addSingleMarker(markerLayer, p)
  }

  if (showHeatmap.value) drawHeatmap(points)

  const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]))
  map.fitBounds(bounds, { padding: [50, 50] })
}

function addSingleMarker(layer, p) {
  const m = L.marker([p.lat, p.lng]).addTo(layer)
  const sizeStr = p.size > 1048576 ? (p.size / 1048576).toFixed(2) + ' MB' : (p.size / 1024).toFixed(1) + ' KB'
  m.bindPopup(`
    <div style="min-width:180px">
      <strong>文件ID: ${p.fileId}</strong><br/>
      名称: ${p.name || 'unknown'}<br/>
      大小: ${sizeStr}<br/>
      坐标: ${p.lng.toFixed(4)}, ${p.lat.toFixed(4)}<br/>
      <button onclick="window.__brqDownload('${p.fileId}')" style="margin-top:6px;padding:4px 12px;background:#1677FF;color:#fff;border:none;border-radius:4px;cursor:pointer">下载解密</button>
    </div>
  `)
}

function simpleCluster(points, threshold) {
  const clusters = []
  const used = new Set()
  for (let i = 0; i < points.length; i++) {
    if (used.has(i)) continue
    const cluster = { points: [points[i]], center: { lat: points[i].lat, lng: points[i].lng } }
    used.add(i)
    for (let j = i + 1; j < points.length; j++) {
      if (used.has(j)) continue
      const dLat = Math.abs(points[j].lat - cluster.center.lat)
      const dLng = Math.abs(points[j].lng - cluster.center.lng)
      if (dLat < threshold && dLng < threshold) {
        cluster.points.push(points[j])
        used.add(j)
      }
    }
    let sumLat = 0, sumLng = 0
    for (const p of cluster.points) { sumLat += p.lat; sumLng += p.lng }
    cluster.center = { lat: sumLat / cluster.points.length, lng: sumLng / cluster.points.length }
    clusters.push(cluster)
  }
  return clusters
}

function drawHeatmap(points) {
  heatmapLayer = L.layerGroup().addTo(map)
  for (const p of points) {
    L.circle([p.lat, p.lng], {
      radius: 800,
      color: '#FF6A00',
      fillColor: '#FF6A00',
      fillOpacity: 0.3,
      weight: 0
    }).addTo(heatmapLayer)
  }
}

function toggleHeatmap() {
  if (showHeatmap.value) {
    const coords = cacheManager.getAllDocCoords()
    const points = []
    for (const r of searchResults.value) {
      const c = coords[r.fileId]
      if (c) points.push({ fileId: r.fileId, lng: c.lng, lat: c.lat })
    }
    if (points.length > 0) drawHeatmap(points)
  } else {
    if (heatmapLayer) { map.removeLayer(heatmapLayer); heatmapLayer = null }
  }
}

async function handleDownload(fileId) {
  try {
    const res = await documentApi.download(fileId)
    const decrypted = await client.decryptDocument(new Uint8Array(res.data))
    const blob = new Blob([decrypted])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'decrypted_' + fileId
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('下载解密成功')
  } catch (e) {
    ElMessage.error('下载失败: ' + (e.message || '未知错误'))
  }
}

function previewResult(row) {
  previewData.value = row
  showPreview.value = true
}

function getCoord(fileId) {
  return cacheManager.getAllDocCoords()[fileId] || null
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0, size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return size.toFixed(i === 0 ? 0 : 1) + ' ' + units[i]
}

function saveCurrentSearch() {
  if (!form.keyword) { ElMessage.warning('请先输入关键词'); return }
  const entry = {
    keyword: form.keyword,
    lngMin: form.lngMin, latMin: form.latMin,
    lngMax: form.lngMax, latMax: form.latMax,
    time: new Date().toLocaleString('zh-CN')
  }
  searchHistoryList.value.unshift(entry)
  if (searchHistoryList.value.length > 20) searchHistoryList.value.pop()
  localStorage.setItem('brq_history', JSON.stringify(searchHistoryList.value))
  ElMessage.success('搜索已保存到历史')
}

function restoreSearch(item) {
  form.keyword = item.keyword
  form.lngMin = item.lngMin
  form.latMin = item.latMin
  form.lngMax = item.lngMax
  form.latMax = item.latMax
  showHistory.value = false
  drawRect()
  handleSearch()
}

function clearHistory() {
  searchHistoryList.value = []
  localStorage.removeItem('brq_history')
  ElMessage.success('历史已清空')
}

function exportCSV() {
  const headers = ['文件ID', '加密文件名', '大小(bytes)']
  const rows = searchResults.value.map(r => [r.fileId, r.encryptedName || '', r.fileSize || 0])
  const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `brq_results_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('CSV已导出')
}

function stashForCompare() {
  if (stashedResults.value.length > 0) {
    const stashedIds = new Set(stashedResults.value.map(r => r.fileId))
    const currentIds = new Set(searchResults.value.map(r => r.fileId))
    const added = searchResults.value.filter(r => !stashedIds.has(r.fileId))
    const removed = stashedResults.value.filter(r => !currentIds.has(r.fileId))
    compareData.value = {
      stashed: stashedResults.value,
      current: searchResults.value,
      added, removed
    }
    showCompare.value = true
    stashedResults.value = [...searchResults.value]
    ElMessage.info('已对比，当前结果已暂存供下次对比')
  } else {
    stashedResults.value = [...searchResults.value]
    ElMessage.success('结果已暂存，再次检索后点击"暂存对比"可查看差异')
  }
}

function resetForm() {
  form.keyword = ''
  searchResults.value = []
  if (markerLayer) { map.removeLayer(markerLayer); markerLayer = null }
  if (heatmapLayer) { map.removeLayer(heatmapLayer); heatmapLayer = null }
}
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 300px;
  border-radius: 4px;
  border: 1px solid #E5E8EB;
}
.map-controls {
  display: flex;
  gap: 20px;
  margin-top: 8px;
  align-items: center;
}
.history-item {
  padding: 10px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 8px;
  border: 1px solid #E5E8EB;
}
.history-item:hover {
  background: #E8F3FF;
}
.history-keyword {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}
.history-meta {
  font-size: 12px;
  color: #8C8C8C;
  margin-top: 4px;
}
.history-time {
  font-size: 11px;
  color: #BFBFBF;
  margin-top: 2px;
}
</style>
<style>
.custom-cluster .cluster-icon {
  background: #1677FF;
  color: #fff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  border: 2px solid #fff;
  box-shadow: 0 0 6px rgba(0,0,0,0.3);
}
</style>
