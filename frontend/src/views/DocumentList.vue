<template>
  <div class="doc-list-page">
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>文档列表</span>
          <el-button type="primary" size="small" @click="fetchList" :loading="docStore.loading">刷新</el-button>
        </div>
      </template>
      <el-table :data="docStore.documents" stripe v-loading="docStore.loading">
        <el-table-column prop="fileId" label="文件ID" width="100" />
        <el-table-column prop="encryptedName" label="加密文件名" />
        <el-table-column prop="fileSize" label="大小(bytes)" width="130" />
        <el-table-column prop="createdAt" label="上传时间" width="200" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="handleDownload(row.fileId)">下载解密</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row.fileId)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDocumentStore } from '@/stores/document'
import { RSKQClient } from '@/crypto/rskq-client'
import { documentApi } from '@/api'

const docStore = useDocumentStore()
let client = null

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
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
