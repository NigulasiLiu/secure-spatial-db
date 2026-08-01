<template>
  <div class="upload-page">
    <el-card shadow="hover">
      <template #header>文档上传（客户端加密）</template>
      <el-form :model="form" label-width="120px">
        <el-form-item label="选择文件">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :on-change="handleFileChange"
            :limit="1"
            drag
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">拖拽文件到此处或<em>点击上传</em></div>
          </el-upload>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="form.keyword" placeholder="输入检索关键词（空格分隔多个）" />
        </el-form-item>
        <el-form-item label="经度">
          <el-input-number v-model="form.lng" :precision="6" :step="0.01" :min="-180" :max="180" />
        </el-form-item>
        <el-form-item label="纬度">
          <el-input-number v-model="form.lat" :precision="6" :step="0.01" :min="-90" :max="90" />
        </el-form-item>
        <el-form-item label="地图选点">
          <div ref="mapContainer" class="map-container"></div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="uploading" @click="handleUpload">加密并上传</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="uploadResult" shadow="hover" style="margin-top: 20px;">
      <template #header>上传结果</template>
      <el-alert :title="uploadResult" type="success" :closable="false" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import L from 'leaflet'
import { createClient, RSKQClient } from '@/crypto/rskq-client'
import { edbApi, documentApi } from '@/api'
import { useDocumentStore } from '@/stores/document'

const docStore = useDocumentStore()
const uploadRef = ref()
const mapContainer = ref()
const uploading = ref(false)
const uploadResult = ref('')
const selectedFile = ref(null)
let map = null
let marker = null
let client = null

const form = reactive({
  keyword: '',
  lng: 116.404,
  lat: 39.915
})

onMounted(async () => {
  await nextTick()
  initMap()
  await initClient()
})

function initMap() {
  map = L.map(mapContainer.value).setView([form.lat, form.lng], 10)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'OpenStreetMap', maxZoom: 19
  }).addTo(map)
  marker = L.marker([form.lat, form.lng]).addTo(map)
  map.on('click', (e) => {
    form.lat = parseFloat(e.latlng.lat.toFixed(6))
    form.lng = parseFloat(e.latlng.lng.toFixed(6))
    marker.setLatLng([form.lat, form.lng])
  })
}

async function initClient() {
  const saved = localStorage.getItem('rskq_keys')
  if (saved) {
    const keys = JSON.parse(saved)
    client = new RSKQClient()
    await client.initFromKeys(
      new Uint8Array(keys.rootKey),
      new Uint8Array(keys.keyI),
      new Uint8Array(keys.keyS)
    )
  } else {
    client = await createClient()
    const keys = await client.exportKeys()
    localStorage.setItem('rskq_keys', JSON.stringify({
      rootKey: Array.from(keys.rootKey),
      keyI: Array.from(keys.keyI),
      keyS: Array.from(keys.keyS)
    }))
  }
  const stateSaved = localStorage.getItem('rskq_state')
  if (stateSaved) client.loadState(JSON.parse(stateSaved))
}

function handleFileChange(file) {
  selectedFile.value = file.raw
}

function saveState() {
  localStorage.setItem('rskq_state', JSON.stringify(client.getState()))
}

async function handleUpload() {
  if (!selectedFile.value) { ElMessage.warning('请选择文件'); return }
  if (!form.keyword) { ElMessage.warning('请输入关键词'); return }
  uploading.value = true
  try {
    const fileBuffer = await selectedFile.value.arrayBuffer()
    const encrypted = await client.encryptDocument(new Uint8Array(fileBuffer))
    const encryptedBlob = new Blob([encrypted])
    const fileName = selectedFile.value.name
    const res = await documentApi.upload(encryptedBlob, fileName + '.enc')
    const fileId = res.data.fileId

    const keywords = form.keyword.trim().split(/\s+/)
    const allEntries = []
    for (const kw of keywords) {
      const entries = await client.updateAdd(fileId, kw, form.lng, form.lat)
      allEntries.push(...entries)
    }
    if (allEntries.length > 0) {
      await edbApi.update(allEntries)
    }
    saveState()
    uploadResult.value = `上传成功！文件ID: ${fileId}，加密索引条目: ${allEntries.length}`
    ElMessage.success('文档加密上传成功')
    resetForm()
  } catch (e) {
    ElMessage.error('上传失败: ' + (e.message || '未知错误'))
  } finally {
    uploading.value = false
  }
}

function resetForm() {
  form.keyword = ''
  selectedFile.value = null
  uploadRef.value?.clearFiles()
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
