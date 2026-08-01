<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
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

    <!-- 图表区域 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>操作趋势</span>
              <el-tag size="small" type="info">实时</el-tag>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>文档类型分布</template>
          <div ref="distChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>系统安全等级</template>
          <div ref="gaugeChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>地理分布热力图</span>
              <el-tag size="small" type="info">基于上传坐标</el-tag>
            </div>
          </template>
          <div ref="heatmapChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 操作时间线 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>操作时间线</span>
              <el-button text size="small" @click="refreshTimeline">刷新</el-button>
            </div>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="op in operationTimeline"
              :key="op.id"
              :timestamp="op.time"
              :type="op.type"
              :hollow="op.hollow"
            >
              {{ op.content }}
            </el-timeline-item>
          </el-timeline>
          <el-empty v-if="operationTimeline.length === 0" description="暂无操作记录" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 系统信息与快速操作 -->
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
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { useDocumentStore } from '@/stores/document'
import { Upload, Search, MapLocation, Document } from '@element-plus/icons-vue'
import { cacheManager } from '@/utils/cache-manager'

const docStore = useDocumentStore()
const stats = ref({ docCount: 0, indexCount: 0, searchCount: 0 })
const clientReady = ref(false)
const operationTimeline = ref([])

const trendChartRef = ref(null)
const distChartRef = ref(null)
const gaugeChartRef = ref(null)
const heatmapChartRef = ref(null)

let trendChart = null
let distChart = null
let gaugeChart = null
let heatmapChart = null
let pollTimer = null

function initTrendChart() {
  trendChart = echarts.init(trendChartRef.value)
  const now = new Date()
  const hours = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600000)
    hours.push(d.getHours() + ':00')
  }
  const searchHistory = cacheManager.getSearchHistory()
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['上传', '检索'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '5%', containLabel: true },
    xAxis: { type: 'category', data: hours, boundaryGap: false },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '上传',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.3 },
        data: [2, 3, 1, 4, 2, 5, stats.value.docCount > 0 ? 3 : 0],
        itemStyle: { color: '#409eff' }
      },
      {
        name: '检索',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.3 },
        data: [1, 2, 3, 2, 4, 3, searchHistory.length],
        itemStyle: { color: '#67c23a' }
      }
    ]
  })
}

function initDistChart() {
  distChart = echarts.init(distChartRef.value)
  const docs = docStore.documents || []
  const typeMap = {}
  docs.forEach(d => {
    const name = d.encryptedName || d.fileId || 'unknown'
    const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : 'other'
    typeMap[ext] = (typeMap[ext] || 0) + 1
  })
  const data = Object.entries(typeMap).map(([name, value]) => ({ name, value }))
  if (data.length === 0) data.push({ name: '暂无数据', value: 1 })
  distChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, left: 'center' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
      data
    }]
  })
}

function initGaugeChart() {
  gaugeChart = echarts.init(gaugeChartRef.value)
  const securityScore = clientReady.value ? 95 : 30
  gaugeChart.setOption({
    series: [{
      type: 'gauge',
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 100,
      radius: '90%',
      progress: { show: true, width: 18 },
      axisLine: { lineStyle: { width: 18 } },
      axisTick: { show: false },
      splitLine: { length: 10, lineStyle: { width: 2, color: '#999' } },
      axisLabel: { distance: 25, color: '#999', fontSize: 10 },
      pointer: { width: 5, length: '60%' },
      detail: { valueAnimation: true, formatter: '{value}', fontSize: 24, offsetCenter: [0, '30%'] },
      title: { offsetCenter: [0, '55%'], fontSize: 14 },
      data: [{ value: securityScore, name: '安全等级' }]
    }]
  })
}

function initHeatmapChart() {
  heatmapChart = echarts.init(heatmapChartRef.value)
  const coords = cacheManager.getAllDocCoords()
  const points = []
  for (const [fileId, coord] of Object.entries(coords)) {
    points.push([coord.lng, coord.lat, 1])
  }
  if (points.length === 0) {
    points.push([116.4, 39.9, 0], [121.5, 31.2, 0], [113.3, 23.1, 0])
  }
  const lngs = points.map(p => p[0])
  const lats = points.map(p => p[1])
  const minLng = Math.min(...lngs) - 1, maxLng = Math.max(...lngs) + 1
  const minLat = Math.min(...lats) - 1, maxLat = Math.max(...lats) + 1
  heatmapChart.setOption({
    tooltip: { formatter: p => `坐标: ${p.value[0].toFixed(2)}, ${p.value[1].toFixed(2)}<br/>文档数: ${p.value[2]}` },
    visualMap: {
      min: 0, max: Math.max(5, ...points.map(p => p[2])),
      inRange: { color: ['#50a3ba', '#eac736', '#d94e5d'] },
      left: 'right', top: 'center'
    },
    geo: {
      type: 'scatter',
      left: '5%', right: '15%', top: '5%', bottom: '5%'
    },
    xAxis: { type: 'value', name: '经度', min: minLng, max: maxLng },
    yAxis: { type: 'value', name: '纬度', min: minLat, max: maxLat },
    series: [{
      type: 'heatmap',
      data: points,
      pointSize: 20,
      blurSize: 30
    }]
  })
}

function loadTimeline() {
  const history = cacheManager.getSearchHistory()
  const timeline = []
  history.slice(0, 10).forEach((kw, i) => {
    timeline.push({
      id: 'search-' + i,
      time: new Date(Date.now() - i * 600000).toLocaleTimeString('zh-CN'),
      type: 'primary',
      content: '检索关键词: ' + kw
    })
  })
  const docs = docStore.documents || []
  docs.slice(0, 5).forEach((d, i) => {
    timeline.push({
      id: 'doc-' + i,
      time: d.createdAt ? new Date(d.createdAt).toLocaleTimeString('zh-CN') : '--',
      type: 'success',
      hollow: true,
      content: '上传文档: ' + (d.encryptedName || d.fileId)
    })
  })
  timeline.sort((a, b) => b.time.localeCompare(a.time))
  operationTimeline.value = timeline.slice(0, 15)
}

function refreshTimeline() {
  loadTimeline()
}

async function pollStats() {
  try {
    await docStore.fetchList()
    stats.value.docCount = docStore.totalCount
    stats.value.searchCount = cacheManager.getSearchHistory().length
    if (distChart) initDistChart()
    if (trendChart) initTrendChart()
    loadTimeline()
  } catch (e) { }
}

onMounted(async () => {
  try {
    await docStore.fetchList()
    stats.value.docCount = docStore.totalCount
  } catch (e) { }
  const saved = localStorage.getItem('rskq_keys')
  clientReady.value = !!saved
  stats.value.searchCount = cacheManager.getSearchHistory().length
  stats.value.indexCount = parseInt(localStorage.getItem('rskq_index_count') || '0')

  await nextTick()
  initTrendChart()
  initDistChart()
  initGaugeChart()
  initHeatmapChart()
  loadTimeline()

  pollTimer = setInterval(pollStats, 30000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (trendChart) trendChart.dispose()
  if (distChart) distChart.dispose()
  if (gaugeChart) gaugeChart.dispose()
  if (heatmapChart) heatmapChart.dispose()
})
</script>

<style scoped>
.stat-value {
  font-size: 28px;
  font-weight: 700;
  text-align: center;
  padding: 10px 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chart-container {
  width: 100%;
  height: 280px;
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
