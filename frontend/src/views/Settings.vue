<template>
  <div class="settings-page">
    <el-card shadow="hover">
      <template #header>密钥管理</template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="密钥状态">
          <el-tag :type="hasKeys ? 'success' : 'danger'">{{ hasKeys ? '已生成' : '未生成' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="根密钥 K_Σ">{{ keyInfo.rootKey }}</el-descriptions-item>
        <el-descriptions-item label="文档加密密钥 K_I">{{ keyInfo.keyI }}</el-descriptions-item>
        <el-descriptions-item label="状态加密密钥 K_S">{{ keyInfo.keyS }}</el-descriptions-item>
        <el-descriptions-item label="安全参数">λ = 128 bit</el-descriptions-item>
        <el-descriptions-item label="PRF">HMAC-SHA256</el-descriptions-item>
        <el-descriptions-item label="哈希函数">Blake2b-128 (H1-H5)</el-descriptions-item>
      </el-descriptions>
      <div style="margin-top: 20px;">
        <el-button type="danger" @click="handleResetKeys">重新生成密钥</el-button>
        <el-button @click="handleExportKeys">导出密钥</el-button>
      </div>
    </el-card>

    <el-card shadow="hover" style="margin-top: 20px;">
      <template #header>客户端状态</template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="状态计数器数量">{{ stateInfo.counterCount }}</el-descriptions-item>
        <el-descriptions-item label="更新计数器数量">{{ stateInfo.updateCount }}</el-descriptions-item>
        <el-descriptions-item label="状态树节点数">{{ stateInfo.treeCount }}</el-descriptions-item>
        <el-descriptions-item label="文件ID计数器">{{ stateInfo.fileIdCounter }}</el-descriptions-item>
      </el-descriptions>
      <div style="margin-top: 20px;">
        <el-button type="primary" @click="handleSyncState">同步状态到服务器</el-button>
        <el-button @click="handleExportState">导出状态</el-button>
      </div>
    </el-card>

    <el-card shadow="hover" style="margin-top: 20px;">
      <template #header>系统参数</template>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="Hilbert曲线阶数">12</el-descriptions-item>
        <el-descriptions-item label="网格分辨率">4096 × 4096</el-descriptions-item>
        <el-descriptions-item label="前向隐私">支持（计数器链）</el-descriptions-item>
        <el-descriptions-item label="后向隐私">Type-I⁻（状态树）</el-descriptions-item>
        <el-descriptions-item label="空间分解">BPC（二进制前缀覆盖）</el-descriptions-item>
        <el-descriptions-item label="布尔电路聚合">b_s = (¬b_id ∧ b_s) ⊕ (b_id ∧ b_op)</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createClient, RSKQClient } from '@/crypto/rskq-client'
import { edbApi } from '@/api'

const hasKeys = ref(false)
const keyInfo = reactive({ rootKey: '-', keyI: '-', keyS: '-' })
const stateInfo = reactive({ counterCount: 0, updateCount: 0, treeCount: 0, fileIdCounter: 0 })
let client = null

onMounted(async () => {
  await initClient()
})

async function initClient() {
  const saved = localStorage.getItem('rskq_keys')
  if (saved) {
    hasKeys.value = true
    const keys = JSON.parse(saved)
    keyInfo.rootKey = `已设置 (${keys.rootKey.length} bytes)`
    keyInfo.keyI = `已设置 (${keys.keyI.length} bytes)`
    keyInfo.keyS = `已设置 (${keys.keyS.length} bytes)`
    client = new RSKQClient()
    await client.initFromKeys(
      new Uint8Array(keys.rootKey),
      new Uint8Array(keys.keyI),
      new Uint8Array(keys.keyS)
    )
    const stateSaved = localStorage.getItem('rskq_state')
    if (stateSaved) client.loadState(JSON.parse(stateSaved))
    updateStateInfo()
  }
}

function updateStateInfo() {
  if (!client) return
  const state = client.getState()
  stateInfo.counterCount = Object.keys(state.stateCounters).length
  stateInfo.updateCount = Object.keys(state.updateCounters).length
  stateInfo.treeCount = Object.keys(state.stateTree).length
  stateInfo.fileIdCounter = state.fileIdCounter
}

async function handleResetKeys() {
  try {
    await ElMessageBox.confirm('重新生成密钥将导致已有加密数据无法解密，确认继续？', '严重警告', { type: 'error' })
    client = await createClient()
    const keys = await client.exportKeys()
    localStorage.setItem('rskq_keys', JSON.stringify({
      rootKey: Array.from(keys.rootKey),
      keyI: Array.from(keys.keyI),
      keyS: Array.from(keys.keyS)
    }))
    localStorage.removeItem('rskq_state')
    hasKeys.value = true
    keyInfo.rootKey = `已设置 (${keys.rootKey.length} bytes)`
    keyInfo.keyI = `已设置 (${keys.keyI.length} bytes)`
    keyInfo.keyS = `已设置 (${keys.keyS.length} bytes)`
    updateStateInfo()
    ElMessage.success('密钥已重新生成')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}

function handleExportKeys() {
  const saved = localStorage.getItem('rskq_keys')
  if (!saved) { ElMessage.warning('无密钥可导出'); return }
  const blob = new Blob([saved], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'rskq_keys.json'
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('密钥已导出')
}

function handleExportState() {
  const saved = localStorage.getItem('rskq_state')
  if (!saved) { ElMessage.warning('无状态可导出'); return }
  const blob = new Blob([saved], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'rskq_state.json'
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('状态已导出')
}

async function handleSyncState() {
  if (!client) { ElMessage.warning('客户端未初始化'); return }
  try {
    const state = client.getState()
    const states = []
    for (const [key, val] of Object.entries(state.stateCounters)) {
      states.push({ keyX: key, stateValue: String(val) })
    }
    await edbApi.sync(states)
    ElMessage.success('状态已同步到服务器')
  } catch (e) {
    ElMessage.error('同步失败: ' + (e.message || '未知错误'))
  }
}
</script>
