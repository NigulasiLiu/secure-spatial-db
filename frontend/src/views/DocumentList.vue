<template>
  <div class="doc-list-page">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>文档列表</span>
          <div class="header-actions">
            <el-input
              v-model="searchQuery"
              placeholder="搜索文件ID或名称"
              size="small"
              clearable
              style="width: 200px; margin-right: 10px;"
              :prefix-icon="Search"
            />
            <el-button type="primary" size="small" @click="fetchList" :loading="docStore.loading">刷新</el-button>
          </div>
        </div>
      </template>

      <el-skeleton v-if="docStore.loading" :rows="6" animated />

      <template v-else-if="filteredDocs.length > 0">
        <div class="batch-bar" v-if="selectedIds.length > 0">
          <span>已选 {{ selectedIds.length }} 项</span>
          <el-button size="small" type="danger" @click="handleBatchDelete">批量删除</el-button>
          <el-button size="small" type="primary" @click="handleBatchDownload">批量下载</el-button>
          <el-button size="small" @click="selectedIds = []">取消选择</el-button>
        </div>

        <el-table
          :data="pagedDocs"
          stripe
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
          :default-sort="{ prop: 'createdAt', order: 'descending' }"
        >
          <el-table-column type="selection" width="45" />
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="expand-detail">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="文件ID">{{ row.fileId }}</el-descriptions-item>
                  <el-descriptions-item label="加密文件名">{{ row.encryptedName }}</el-descriptions-item>
                  <el-descriptions-item label="原始大小">{{ formatSize(row.fileSize) }}</el-descriptions-item>
                  <el-descriptions-item label="上传时间">{{ formatTime(row.createdAt) }}</el-descriptions-item>
                  <el-descriptions-item label="文件类型">
                    <el-tag size="small" :type="getFileTypeTag(row.encryptedName)">{{ getFileType(row.encryptedName) }}</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="坐标">
                    <span v-if="getDocCoord(row.fileId)">
                      {{ getDocCoord(row.fileId).lng.toFixed(4) }}, {{ getDocCoord(row.fileId).lat.toFixed(4) }}
                    </span>
                    <span v-else>未记录</span>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="fileId" label="文件ID" width="100" sortable />
          <el-table-column prop="encryptedName" label="加密文件名" sortable>
            <template #default="{ row }">
              <div class="name-cell">
                <el-icon class="file-icon"><component :is="getFileIcon(row.encryptedName)" /></el-icon>
                <span>{{ row.encryptedName }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="fileSize" label="大小" width="120" sortable>
            <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
          </el-table-column>
          <el-table-column prop="createdAt" label="上传时间" width="180" sortable>
            <template #default="{ row }">
              <el-tooltip :content="row.createdAt" placement="top">
                <span>{{ formatTime(row.createdAt) }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" @click="handleDownload(row.fileId)">下载</el-button>
              <el-button size="small" type="danger" @click="handleDelete(row.fileId)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-bar">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="filteredDocs.length"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            background
          />
        </div>
      </template>

      <EmptyState v-else :icon="Document" text="暂无文档" subtext="请先上传加密文档" action-text="去上传" @action="$router.push('/upload')" />
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDocumentStore } from '@/stores/document'
import { RSKQClient } from '@/crypto/rskq-client'
import { documentApi } from '@/api'
import EmptyState from '@/components/EmptyState.vue'
import { Document, Search, Document as DocIcon, Picture, FolderOpened, Files } from '@element-plus/icons-vue'
import { cacheManager } from '@/utils/cache-manager'

const docStore = useDocumentStore()
let client = null

const searchQuery = ref('')
const selectedIds = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const sortProp = ref('createdAt')
const sortOrder = ref('descending')

const filteredDocs = computed(() => {
  let docs = [...docStore.documents]
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    docs = docs.filter(d =>
      String(d.fileId).includes(q) ||
      (d.encryptedName || '').toLowerCase().includes(q)
    )
  }
  if (sortProp.value) {
    const prop = sortProp.value
    const asc = sortOrder.value === 'ascending'
    docs.sort((a, b) => {
      const va = a[prop] || ''
      const vb = b[prop] || ''
      if (typeof va === 'number' && typeof vb === 'number') {
        return asc ? va - vb : vb - va
      }
      return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
  }
  return docs
})

const pagedDocs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredDocs.value.slice(start, start + pageSize.value)
})

onMounted(async () => {
  await fetchList()
  await initClient()
})

async function fetchList() {
  try {
    await docStore.fetchList()
  } catch (e) { }
}

async function initClient() {
  const saved = localStorage.getItem('rskq_keys')
  if (!saved) return
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

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return size.toFixed(i === 0 ? 0 : 1) + ' ' + units[i]
}

function formatTime(timeStr) {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  const now = new Date()
  const diff = (now - date) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前'
  if (diff < 2592000) return Math.floor(diff / 86400) + '天前'
  return date.toLocaleDateString('zh-CN')
}

function getFileType(name) {
  if (!name) return '未知'
  const ext = name.split('.').pop().toLowerCase()
  const types = { txt: '文本', csv: 'CSV', json: 'JSON', enc: '加密', pdf: 'PDF', doc: 'DOC', docx: 'DOCX', jpg: '图片', png: '图片', xlsx: '表格' }
  return types[ext] || ext.toUpperCase()
}

function getFileTypeTag(name) {
  if (!name) return 'info'
  const ext = name.split('.').pop().toLowerCase()
  if (['txt', 'csv', 'json'].includes(ext)) return 'success'
  if (['enc'].includes(ext)) return 'warning'
  if (['pdf', 'doc', 'docx'].includes(ext)) return 'primary'
  if (['jpg', 'png', 'gif'].includes(ext)) return 'danger'
  return 'info'
}

function getFileIcon(name) {
  if (!name) return DocIcon
  const ext = name.split('.').pop().toLowerCase()
  if (['jpg', 'png', 'gif'].includes(ext)) return Picture
  if (['zip', 'rar', 'tar'].includes(ext)) return FolderOpened
  if (['enc'].includes(ext)) return Files
  return DocIcon
}

function getDocCoord(fileId) {
  return cacheManager.getAllDocCoords()[fileId] || null
}

function handleSelectionChange(rows) {
  selectedIds.value = rows.map(r => r.fileId)
}

function handleSortChange({ prop, order }) {
  sortProp.value = prop
  sortOrder.value = order
}

async function handleDownload(fileId) {
  try {
    const res = await documentApi.download(fileId)
    if (!client) {
      const blob = new Blob([res.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'encrypted_' + fileId + '.enc'
      a.click()
      URL.revokeObjectURL(url)
      ElMessage.info('密钥未初始化，下载密文文件')
      return
    }
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

async function handleDelete(fileId) {
  try {
    await ElMessageBox.confirm('确认删除该文档？此操作不可恢复。', '警告', { type: 'warning' })
    await docStore.remove(fileId)
    ElMessage.success('删除成功')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败: ' + (e.message || '未知错误'))
  }
}

async function handleBatchDelete() {
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 个文档？此操作不可恢复。`, '警告', { type: 'warning' })
    for (const fid of selectedIds.value) {
      await docStore.remove(fid)
    }
    ElMessage.success(`已删除 ${selectedIds.value.length} 个文档`)
    selectedIds.value = []
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('批量删除失败: ' + (e.message || '未知错误'))
  }
}

async function handleBatchDownload() {
  ElMessage.info(`开始下载 ${selectedIds.value.length} 个文档...`)
  for (const fid of selectedIds.value) {
    await handleDownload(fid)
  }
  selectedIds.value = []
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-actions {
  display: flex;
  align-items: center;
}
.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  margin-bottom: 12px;
  background: #ecf5ff;
  border-radius: 4px;
  font-size: 14px;
  color: #409eff;
}
.name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}
.file-icon {
  font-size: 16px;
  color: #909399;
}
.expand-detail {
  padding: 12px 24px;
}
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
