<template>
  <div class="temp-quick-view">
    <section class="page-header">
      <div class="header-left">
        <h1>{{ moduleTitle }}</h1>
        <p class="subtitle">临时快速模式（/temp）</p>
      </div>
    </section>

    <div v-if="loading" class="state">正在初始化临时项目…</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <component
      v-else-if="activeComponent && tempUUID"
      :is="activeComponent"
      :uuid="tempUUID"
      scope="temp"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PreprocessModule from '../components/PreprocessModule.vue'
import AiAnalysisModule from '../components/AiAnalysisModule.vue'
import ReconstructionModule from '../components/ReconstructionModule.vue'
import AiConsultModule from '../components/AiConsultModule.vue'
import { ensureTempUUID } from '../utils/tempProjectSession'

type TempModuleKey = 'preprocess' | 'analysis' | 'reconstruction' | 'consult'

const route = useRoute()
const loading = ref(true)
const error = ref('')
const tempUUID = ref('')

const moduleKey = computed<TempModuleKey>(() => {
  const value = String(route.meta.tempModule || 'preprocess')
  if (value === 'analysis' || value === 'reconstruction' || value === 'consult') return value
  return 'preprocess'
})

const activeComponent = computed(() => {
  if (moduleKey.value === 'analysis') return AiAnalysisModule
  if (moduleKey.value === 'reconstruction') return ReconstructionModule
  if (moduleKey.value === 'consult') return AiConsultModule
  return PreprocessModule
})

const moduleTitle = computed(() => {
  if (moduleKey.value === 'analysis') return '临时快速Ai分析'
  if (moduleKey.value === 'reconstruction') return '临时快速三维重建'
  if (moduleKey.value === 'consult') return '临时快速Ai问诊'
  return '临时快速预处理'
})

async function initTempProject() {
  loading.value = true
  error.value = ''
  try {
    tempUUID.value = await ensureTempUUID()
  } catch (err: any) {
    console.error(err)
    error.value = err?.message || '临时项目初始化失败'
  } finally {
    loading.value = false
  }
}

watch(
  () => moduleTitle.value,
  (title) => {
    document.title = title
  },
  { immediate: true },
)

onMounted(() => {
  initTempProject()
})
</script>

<style scoped>
.temp-quick-view{width:100%;max-width:none;margin:0 auto;display:flex;flex-direction:column;gap:20px;padding:8px 6px;min-height:0}
.page-header{display:flex;align-items:center;justify-content:space-between;gap:16px}
.header-left{padding-left:15px}
.page-header h1{margin:0;font-size:22px}
.subtitle{margin:4px 0 0;color:rgba(75,85,99,0.95);font-size:13px}
.state{padding:12px;border-radius:8px;background:#f8fafc;color:#334155}
.state.error{color:#b91c1c;background:#fef2f2}
@media (max-width: 900px){
  .header-left{padding-left:0}
}
</style>
