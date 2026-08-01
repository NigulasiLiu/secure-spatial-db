<template>
  <div class="search-brq-page">
    <el-card shadow="hover">
      <template #header>布尔范围检索（BRQ）</template>
      <el-form :model="form" label-width="120px">
        <el-form-item label="关键词">
          <el-input v-model="form.keyword" placeholder="输入检索关键词" />
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
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import L from 'leaflet'
import { RSKQClient } from '@/crypto/rskq-client'
import { edbApi, documentApi } from '@/api'

const mapContainer = ref()
const searching = ref(false)
const searchResults = ref([])
let map = null
let rectLayer = null
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
    { color: '#ff9800', weight: 2, fillOpacity: 0.1 }
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
  if (!form.keyword) { ElMessage.warning('请输入关键词'); return }
  if (!client) { ElMessage.warning('密钥未初始化'); return }
  searching.value = true
  try {
    const tokens = await client.generateSearchToken(
      form.keyword, form.lngMin, form.latMin, form.lngMax, form.latMax
    )
    const searchRes = await edbApi.search(tokens)
    const fileIds = await client.decryptSearchResults(
      searchRes.data.results || [],
      form.keyword, form.lngMin, form.latMin, form.lngMax, form.latMax
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
  height: 300px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}
</style>
