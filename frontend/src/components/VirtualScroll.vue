<template>
  <div
    ref="containerRef"
    class="virtual-scroll-container"
    :style="{ height: height + 'px' }"
    @scroll="onScroll"
  >
    <div class="virtual-scroll-spacer" :style="{ height: totalHeight + 'px' }">
      <div
        v-for="item in visibleItems"
        :key="item.index"
        class="virtual-scroll-item"
        :style="{ transform: `translateY(${item.offset}px)` }"
      >
        <slot :item="item.data" :index="item.index" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  itemHeight: { type: Number, default: 60 },
  height: { type: Number, default: 400 },
  overscan: { type: Number, default: 5 }
})

const containerRef = ref(null)
const scrollTop = ref(0)

const totalHeight = computed(() => props.items.length * props.itemHeight)

const startIndex = computed(() => {
  const idx = Math.floor(scrollTop.value / props.itemHeight)
  return Math.max(0, idx - props.overscan)
})

const endIndex = computed(() => {
  const visibleCount = Math.ceil(props.height / props.itemHeight)
  const idx = startIndex.value + visibleCount + props.overscan * 2
  return Math.min(props.items.length, idx)
})

const visibleItems = computed(() => {
  const result = []
  for (let i = startIndex.value; i < endIndex.value; i++) {
    result.push({
      index: i,
      data: props.items[i],
      offset: i * props.itemHeight
    })
  }
  return result
})

function onScroll() {
  if (containerRef.value) {
    scrollTop.value = containerRef.value.scrollTop
  }
}

onMounted(() => {
  if (containerRef.value) {
    containerRef.value.addEventListener('scroll', onScroll, { passive: true })
  }
})

onBeforeUnmount(() => {
  if (containerRef.value) {
    containerRef.value.removeEventListener('scroll', onScroll)
  }
})
</script>

<style scoped>
.virtual-scroll-container {
  overflow-y: auto;
  position: relative;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.virtual-scroll-spacer {
  position: relative;
  width: 100%;
}

.virtual-scroll-item {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: v-bind('itemHeight + "px"');
}
</style>
