<template>
  <div class="search-grq-page">
    <el-card shadow="hover">
      <template #header>地理范围检索（GRQ）</template>
      <el-form :model="form" label-width="120px">
        <el-form-item label="关键词">
          <el-input v-model="form.keyword" placeholder="输入检索关键词" />
        </el-form-item>
        <el-form-item label="检索模式">
          <el-radio-group v-model="form.mode">
            <el-radio value="circle">圆形范围</el-radio>
            <el-radio value="rect">矩形范围</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="form.mode === 'circle'">
          <el-form-item label="中心经度">
            <el-input-number v-model="form.centerLng" :precision="6" :step="0.01" :min="-180" :max="180" />
          </el-form-item>
          <el-form-item label="中心纬度">
            <el-input-number v-model="form.centerLat" :precision="6" :step="0.01" :min="-90" :max="90" />
          </el-form-item>
          <el-form-item label="半径(km)">
            <el-input-number v-model="form.radiusKm" :step="1" :min="1" :max="5000" />
          </el-form-item>
        </template>
        <el-form-item label="地图选区">
          <div ref="mapContainer" class="map-container"></div>
          <div class="map-hint">点击地图设置中心点，拖拽调整范围</div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="searching" @click="handleSearch">生成检索令牌并检索</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="searchResults.length > 0" shadow="hover" style="margin-top: 20px;">
      <template #header>检索结果（{{ searchResults.length }} 条）</template>
      <el-table :data="searchResults" stripe>
        <el-table-column prop="fileId" label="文件ID" width="100" />
        <el-table-column prop="encryptedName" label="加密文件名" />
        <el-table-column prop="fileSize" label="大小(bytes)" width="130" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="handleDownload(row.fileId)">下载解密</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import L from 'leaflet'
import { RSKQClient } from '@/crypto/rskq-client'
import { edbApi, documentApi } from '@/api'

const mapContainer = ref()
const searching = ref(false)
const searchResults = ref([])
let map = null
let shapeLayer = null
let client = null

const form = reactive({
  keyword: '',
  mode: 'circle',
  centerLng: 116.404,
  centerLat: 39.915,
  radiusKm: 50
})

onMounted(async () => {
  await nextTick()
  initMap()
  await initClient()
})

function initMap() {
  map = L.map(mapContainer.value).setView([form.centerLat, form.centerLng], 8)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'OpenStreetMap', maxZoom: 19
  }).addTo(map)
  drawShape()
  map.on('click', (e) => {
    form.centerLng = parseFloat(e.latlng.lng.toFixed(6))
    form.centerLat = parseFloat(e.latlng.lat.toFixed(6))
    drawShape()
  })
}

function drawShape() {
  if (shapeLayer) map.removeLayer(shapeLayer)
  if (form.mode === 'circle') {
    shapeLayer = L.circle([form.centerLat, form.centerLng], {
      radius: form.radiusKm * 1000,
      color: '#2196f3', weight: 2, fillOpacity: 0.1
    }).addTo(map)
  } else {
    const deg = form.radiusKm / 111
    shapeLayer = L.rectangle(
      [[form.centerLat - deg, form.centerLng - deg], [form.centerLat + deg, form.centerLng + deg]],
      { color: '#2196f3', weight: 2, fillOpacity: 0.1 }
    ).addTo(map)
  }
}

watch(() => [form.mode, form.centerLng, form.centerLat, form.radiusKm], drawShape)

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

function computeBoundingBox() {
  if (form.mode === 'circle') {
    const deg = form.radiusKm / 111
    return {
      lngMin: form.centerLng - deg,
      latMin: form.centerLat - deg,
      lngMax: form.centerLng + deg,
      latMax: form.centerLat + deg
    }
  }
  const deg = form.radiusKm / 111
  return {
    lngMin: form.centerLng - deg,
    latMin: form.centerLat - deg,
    lngMax: form.centerLng + deg,
    latMax: form.centerLat + deg
  }
}

async function handleSearch() {
  if (!form.keyword) { ElMessage.warning('请输入关键词'); return }
  if (!client) { ElMessage.warning('密钥未初始化'); return }
  searching.value = true
  try {
    const bbox = computeBoundingBox()
    const tokens = await client.generateSearchToken(
      form.keyword, bbox.lngMin, bbox.latMin, bbox.lngMax, bbox.latMax
    )
    const searchRes = await edbApi.search(tokens)
    const fileIds = await client.decryptSearchResults(
      searchRes.data.results || [],
      form.keyword, bbox.lngMin, bbox.latMin, bbox.lngMax, bbox.latMax
    )
    const docListRes = await documentApi.list()
    const docMap = new Map(docListRes.data.map(d => [d.fileId, d]))
    searchResults.value = fileIds.map(fid => docMap.get(fid) || { fileId: fid, encryptedName: 'unknown', fileSize: 0 })
    ElMessage.success(`检索完成，命中 ${fileIds.length} 条`)
  } catch (e) {
    ElMessage.error('检索失败: ' + (e.message || '未知错误'))
  } finally {
    searching.value = false
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

function resetForm() {
  form.keyword = ''
  searchResults.value = []
}
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 350px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}
.map-hint {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}
</style>
