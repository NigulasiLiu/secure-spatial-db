<template>
  <div class="keyword-suggest">
    <el-input
      v-model="innerValue"
      :placeholder="placeholder"
      clearable
      @input="onInput"
      @focus="showPanel = true"
      @blur="onBlur"
      @keyup.enter="onEnter"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>

    <div v-if="showPanel && (suggestions.length > 0 || searchHistory.length > 0)" class="suggest-panel">
      <div v-if="searchHistory.length > 0" class="suggest-section">
        <div class="suggest-header">
          <span>最近搜索</span>
          <el-button text size="small" @click="clearHistory">清空</el-button>
        </div>
        <div class="suggest-tags">
          <span
            v-for="kw in searchHistory.slice(0, 8)"
            :key="kw"
            class="suggest-tag history-tag"
            @mousedown.prevent="selectKeyword(kw)"
          >
            <el-icon><Clock /></el-icon>
            {{ kw }}
          </span>
        </div>
      </div>

      <div v-if="suggestions.length > 0" class="suggest-section">
        <div class="suggest-header">
          <span>推荐关键词</span>
          <span class="suggest-count">{{ suggestions.length }} 个</span>
        </div>
        <div class="suggest-tags">
          <span
            v-for="item in suggestions.slice(0, 15)"
            :key="item.word"
            class="suggest-tag"
            :style="{ '--heat-color': getHeatColor(item.count) }"
            @mousedown.prevent="selectKeyword(item.word)"
          >
            <span class="tag-text">{{ item.word }}</span>
            <span class="tag-heat" :style="{ opacity: getHeatOpacity(item.count) }"></span>
            <span class="tag-count">{{ item.count }}</span>
          </span>
        </div>
      </div>

      <div v-if="docKeywords.length > 0" class="suggest-section">
        <div class="suggest-header">
          <span>文档提取词</span>
        </div>
        <div class="suggest-tags">
          <span
            v-for="kw in docKeywords.slice(0, 10)"
            :key="kw"
            class="suggest-tag doc-tag"
            @mousedown.prevent="selectKeyword(kw)"
          >
            <el-icon><Document /></el-icon>
            {{ kw }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Search, Clock, Document } from '@element-plus/icons-vue'
import { cacheManager } from '@/utils/cache-manager'
import { debounce } from '@/utils/perf-utils'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '输入检索关键词' }
})
const emit = defineEmits(['update:modelValue', 'search'])

const innerValue = ref(props.modelValue)
const showPanel = ref(false)
const searchHistory = ref([])
const keywordDict = ref({})
const debouncedInput = ref(props.modelValue)

const updateDebouncedInput = debounce((val) => {
  debouncedInput.value = val
}, 300)

onBeforeUnmount(() => {
  updateDebouncedInput.cancel()
})

onMounted(() => {
  searchHistory.value = cacheManager.getSearchHistory()
  keywordDict.value = cacheManager.getKeywordDict()
})

watch(() => props.modelValue, (val) => {
  innerValue.value = val
})

watch(innerValue, (val) => {
  emit('update:modelValue', val)
})

const suggestions = computed(() => {
  const input = debouncedInput.value.toLowerCase().trim()
  const dict = keywordDict.value
  let entries = Object.entries(dict).map(([word, info]) => ({
    word,
    count: info.count || 0,
    lastUsed: info.lastUsed || 0
  }))
  if (input) {
    entries = entries.filter(e => e.word.toLowerCase().includes(input))
  }
  entries.sort((a, b) => {
    if (input) {
      const aStarts = a.word.toLowerCase().startsWith(input) ? 0 : 1
      const bStarts = b.word.toLowerCase().startsWith(input) ? 0 : 1
      if (aStarts !== bStarts) return aStarts - bStarts
    }
    return b.count - a.count || b.lastUsed - a.lastUsed
  })
  return entries
})

const docKeywords = computed(() => {
  const dict = keywordDict.value
  const input = debouncedInput.value.toLowerCase().trim()
  let words = Object.entries(dict)
    .filter(([_, info]) => info.sources && info.sources.includes('upload'))
    .map(([word]) => word)
  if (input) {
    words = words.filter(w => w.toLowerCase().includes(input))
  }
  return words.slice(0, 10)
})

function onInput() {
  showPanel.value = true
  updateDebouncedInput(innerValue.value)
}

function onBlur() {
  setTimeout(() => { showPanel.value = false }, 200)
}

function onEnter() {
  showPanel.value = false
  if (innerValue.value.trim()) {
    cacheManager.recordSearchKeyword(innerValue.value.trim())
    searchHistory.value = cacheManager.getSearchHistory()
    emit('search', innerValue.value)
  }
}

function selectKeyword(kw) {
  innerValue.value = kw
  showPanel.value = false
  cacheManager.recordSearchKeyword(kw)
  searchHistory.value = cacheManager.getSearchHistory()
  emit('search', kw)
}

function clearHistory() {
  cacheManager.clearSearchHistory()
  searchHistory.value = []
}

function getHeatColor(count) {
  if (count >= 10) return '#f56c6c'
  if (count >= 5) return '#e6a23c'
  if (count >= 3) return '#409eff'
  return '#67c23a'
}

function getHeatOpacity(count) {
  return Math.min(1, 0.3 + count * 0.1)
}
</script>

<style scoped>
.keyword-suggest {
  position: relative;
  width: 100%;
}

.suggest-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  max-height: 320px;
  overflow-y: auto;
  padding: 8px 0;
}

.suggest-section {
  padding: 4px 12px;
}

.suggest-section + .suggest-section {
  border-top: 1px solid #f0f0f0;
}

.suggest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}

.suggest-count {
  color: #c0c4cc;
}

.suggest-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.suggest-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  background: #f5f7fa;
  color: #606266;
  border: 1px solid transparent;
}

.suggest-tag:hover {
  background: var(--heat-color, #409eff);
  color: #fff;
  border-color: var(--heat-color, #409eff);
}

.history-tag {
  background: #fdf6ec;
  color: #e6a23c;
  border-color: #faecd8;
}

.history-tag:hover {
  background: #e6a23c;
  color: #fff;
  border-color: #e6a23c;
}

.doc-tag {
  background: #f0f9eb;
  color: #67c23a;
  border-color: #e1f3d8;
}

.doc-tag:hover {
  background: #67c23a;
  color: #fff;
  border-color: #67c23a;
}

.tag-heat {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--heat-color, #409eff);
}

.tag-count {
  font-size: 11px;
  color: #c0c4cc;
}

.suggest-tag:hover .tag-count {
  color: rgba(255, 255, 255, 0.8);
}
</style>
