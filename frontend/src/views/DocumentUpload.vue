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

        <el-form-item v-if="extracting" label="关键词提取">
          <el-skeleton :rows="3" animated />
        </el-form-item>

        <el-form-item v-if="!extracting && hasExtractedKeywords" label="智能提取">
          <div class="keyword-cloud">
            <div class="cloud-section" v-if="extractedKeywords.highFreq.length > 0">
              <div class="cloud-label">
                <span class="dot" style="background:#FF6A00"></span>高频词
                <el-button text size="small" @click="selectAllHighFreq">全选</el-button>
              </div>
              <div class="cloud-tags">
                <span
                  v-for="item in extractedKeywords.highFreq"
                  :key="item.word"
                  class="cloud-tag"
                  :class="{ selected: selectedExtracted.has(item.word) }"
                  style="--tag-color:#FF6A00"
                  @click="toggleExtractedWord(item.word)"
                >{{ item.word }}</span>
              </div>
            </div>
            <div class="cloud-section" v-if="extractedKeywords.important.length > 0">
              <div class="cloud-label">
                <span class="dot" style="background:#1677FF"></span>重要词(TF-IDF)
              </div>
              <div class="cloud-tags">
                <span
                  v-for="item in extractedKeywords.important"
                  :key="item.word"
                  class="cloud-tag"
                  :class="{ selected: selectedExtracted.has(item.word) }"
                  style="--tag-color:#1677FF"
                  @click="toggleExtractedWord(item.word)"
                >{{ item.word }}</span>
              </div>
            </div>
            <div class="cloud-section" v-if="extractedKeywords.entities.length > 0">
              <div class="cloud-label">
                <span class="dot" style="background:#00C7C7"></span>实体词
              </div>
              <div class="cloud-tags">
                <span
                  v-for="item in extractedKeywords.entities"
                  :key="item.word"
                  class="cloud-tag"
                  :class="{ selected: selectedExtracted.has(item.word) }"
                  style="--tag-color:#00C7C7"
                  @click="toggleExtractedWord(item.word)"
                >{{ item.word }}</span>
              </div>
            </div>
            <div class="cloud-section" v-if="extractedKeywords.hot.length > 0">
              <div class="cloud-label">
                <span class="dot" style="background:#FFCB00"></span>推荐词
              </div>
              <div class="cloud-tags">
                <span
                  v-for="item in extractedKeywords.hot"
                  :key="item.word"
                  class="cloud-tag"
                  :class="{ selected: selectedExtracted.has(item.word) }"
                  style="--tag-color:#FFCB00"
                  @click="toggleExtractedWord(item.word)"
                >{{ item.word }}</span>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="关键词">
          <el-input
            v-model="form.keyword"
            placeholder="点击上方标签自动填入，或手动输入（空格分隔多个）"
            type="textarea"
            :rows="2"
          />
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

        <el-form-item v-if="uploading || uploadProgress > 0" label="上传进度">
          <div class="upload-progress">
            <el-progress :percentage="uploadProgress" :status="uploadProgress === 100 ? 'success' : ''" :stroke-width="8" />
            <p class="progress-step">{{ uploadStepText }}</p>
          </div>
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
import { ref, reactive, onMounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import L from 'leaflet'
import { createClient, RSKQClient } from '@/crypto/rskq-client'
import { edbApi, documentApi } from '@/api'
import { useDocumentStore } from '@/stores/document'
import { extractKeywords } from '@/utils/keyword-extractor'
import { cacheManager } from '@/utils/cache-manager'

const docStore = useDocumentStore()
const uploadRef = ref()
const mapContainer = ref()
const uploading = ref(false)
const uploadResult = ref('')
const uploadProgress = ref(0)
const uploadStepText = ref('')
const selectedFile = ref(null)
const extracting = ref(false)
const extractedKeywords = ref({ highFreq: [], important: [], entities: [], hot: [] })
const selectedExtracted = ref(new Set())
let map = null
let marker = null
let client = null

const form = reactive({
  keyword: '',
  lng: 116.404,
  lat: 39.915
})

const hasExtractedKeywords = computed(() => {
  const k = extractedKeywords.value
  return k.highFreq.length > 0 || k.important.length > 0 || k.entities.length > 0 || k.hot.length > 0
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

async function handleFileChange(file) {
  selectedFile.value = file.raw
  if (!file.raw) return
  extracting.value = true
  try {
    const result = await extractKeywords(file.raw, 15)
    extractedKeywords.value = result
    selectedExtracted.value = new Set()
    if (result.allWords && result.allWords.length > 0) {
      cacheManager.addKeywordsToDict(result.allWords, 'upload')
    }
  } catch {
    ElMessage.warning('关键词提取失败，请手动输入')
  } finally {
    extracting.value = false
  }
}

function toggleExtractedWord(word) {
  const current = new Set(selectedExtracted.value)
  if (current.has(word)) {
    current.delete(word)
  } else {
    current.add(word)
  }
  selectedExtracted.value = current
  syncKeywordsToInput()
}

function selectAllHighFreq() {
  const current = new Set(selectedExtracted.value)
  for (const item of extractedKeywords.value.highFreq) {
    current.add(item.word)
  }
  selectedExtracted.value = current
  syncKeywordsToInput()
}

function syncKeywordsToInput() {
  form.keyword = [...selectedExtracted.value].join(' ')
}

function saveState() {
  localStorage.setItem('rskq_state', JSON.stringify(client.getState()))
  cacheManager.incrementStateVersion()
}

async function handleUpload() {
  if (!selectedFile.value) { ElMessage.warning('请选择文件'); return }
  if (!form.keyword) { ElMessage.warning('请输入关键词'); return }
  uploading.value = true
  uploadProgress.value = 0
  try {
    uploadStepText.value = '正在读取文件...'
    uploadProgress.value = 10
    const fileBuffer = await selectedFile.value.arrayBuffer()

    uploadStepText.value = '正在加密文档（客户端）...'
    uploadProgress.value = 30
    const encrypted = await client.encryptDocument(new Uint8Array(fileBuffer))
    const encryptedBlob = new Blob([encrypted])
    const fileName = selectedFile.value.name

    uploadStepText.value = '正在上传加密文件...'
    uploadProgress.value = 50
    const res = await documentApi.upload(encryptedBlob, fileName + '.enc')
    const fileId = res.data.fileId

    uploadStepText.value = '正在生成加密索引...'
    uploadProgress.value = 70
    const keywords = form.keyword.trim().split(/\s+/)
    const allEntries = []
    for (const kw of keywords) {
      const entries = await client.updateAdd(fileId, kw, form.lng, form.lat)
      allEntries.push(...entries)
    }
    if (allEntries.length > 0) {
      uploadStepText.value = '正在更新加密数据库...'
      uploadProgress.value = 85
      await edbApi.update(allEntries)
    }
    cacheManager.addKeywordsToDict(keywords, 'upload')
    cacheManager.invalidateDocMeta()
    cacheManager.saveDocCoord(fileId, form.lng, form.lat)
    saveState()
    uploadProgress.value = 100
    uploadStepText.value = '上传完成！'
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
  extractedKeywords.value = { highFreq: [], important: [], entities: [], hot: [] }
  selectedExtracted.value = new Set()
  uploadProgress.value = 0
  uploadStepText.value = ''
  uploadRef.value?.clearFiles()
}
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 300px;
  border-radius: 4px;
  border: 1px solid #E5E8EB;
}

.keyword-cloud {
  width: 100%;
}

.cloud-section {
  margin-bottom: 12px;
}

.cloud-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #595959;
  margin-bottom: 6px;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.cloud-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cloud-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 14px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  background: #F5F7FA;
  color: var(--tag-color, #595959);
  border: 1px solid transparent;
  user-select: none;
}

.cloud-tag:hover {
  background: var(--tag-color, #1677FF);
  color: #fff;
  border-color: var(--tag-color, #1677FF);
  transform: scale(1.05);
}

.cloud-tag.selected {
  background: var(--tag-color, #1677FF);
  color: #fff;
  border-color: var(--tag-color, #1677FF);
  box-shadow: 0 2px 6px rgba(7,43,97,0.15);
}

.upload-progress {
  width: 100%;
}
.progress-step {
  font-size: 13px;
  color: #8C8C8C;
  margin-top: 6px;
}
</style>
