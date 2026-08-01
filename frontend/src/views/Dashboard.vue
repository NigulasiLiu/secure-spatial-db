<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>文档总数</template>
          <div class="stat-value">{{ stats.docCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>加密索引条目</template>
          <div class="stat-value">{{ stats.indexCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>检索次数</template>
          <div class="stat-value">{{ stats.searchCount }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <template #header>密钥状态</template>
          <div class="stat-value">
            <el-tag :type="clientReady ? 'success' : 'danger'">{{ clientReady ? '已初始化' : '未初始化' }}</el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>系统信息</template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="系统名称">前后向隐私的空间密文检索系统</el-descriptions-item>
            <el-descriptions-item label="版本号">V1.0</el-descriptions-item>
            <el-descriptions-item label="算法">DSSE-RSKQ</el-descriptions-item>
            <el-descriptions-item label="安全参数">λ = 128 bit</el-descriptions-item>
            <el-descriptions-item label="Hilbert阶数">12 (4096×4096)</el-descriptions-item>
            <el-descriptions-item label="前向隐私">支持</el-descriptions-item>
            <el-descriptions-item label="后向隐私">Type-I⁻</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>快速操作</template>
          <div class="quick-actions">
            <el-button type="primary" @click="$router.push('/upload')">
              <el-icon><Upload /></el-icon> 上传文档
            </el-button>
            <el-button type="success" @click="$router.push('/search-brq')">
              <el-icon><Search /></el-icon> 布尔检索
            </el-button>
            <el-button type="warning" @click="$router.push('/search-grq')">
              <el-icon><MapLocation /></el-icon> 地理检索
            </el-button>
            <el-button @click="$router.push('/documents')">
              <el-icon><Document /></el-icon> 文档列表
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useDocumentStore } from '@/stores/document'

const docStore = useDocumentStore()
const stats = ref({ docCount: 0, indexCount: 0, searchCount: 0 })
const clientReady = ref(false)

onMounted(async () => {
  try {
    await docStore.fetchList()
    stats.value.docCount = docStore.totalCount
  } catch (e) { }
  const saved = localStorage.getItem('rskq_keys')
  clientReady.value = !!saved
})
</script>

<style scoped>
.stat-value {
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  padding: 10px 0;
}
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 0;
}
.quick-actions .el-button {
  width: 100%;
  justify-content: flex-start;
}
</style>
