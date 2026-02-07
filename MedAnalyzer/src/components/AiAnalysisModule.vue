<template>
  <section class="module">
    <div class="module-head">
      <h2>Ai分析</h2>
      <n-tag size="small" type="warning" :bordered="false">开发中</n-tag>
    </div>
    <div class="module-body">
      <div v-if="errorConfig" class="state error">加载失败：{{ errorConfig }}</div>

      <div class="analysis-top">
        <div class="analysis-actions">
          <n-button size="small" type="primary" @click="openAnalysisModal">开始/重新分析</n-button>
          <span class="analysis-note">【每次分析都会覆盖之前的分析结果，请谨慎操作】</span>
        </div>
        <div class="analysis-downloads">
          <n-space size="small" wrap>
            <n-button size="small" @click="downloadProcessed('npz')">下载处理过的NPZ序列</n-button>
            <n-button size="small" @click="downloadProcessed('png')">下载处理过的PNG序列</n-button>
            <n-button size="small" @click="downloadProcessed('nii')">下载处理过的NII单文件</n-button>
            <n-button size="small" @click="downloadProcessed('dcm')">下载处理过的DCM序列</n-button>
          </n-space>
        </div>
      </div>

      <div class="analysis-display">
        <div v-if="showEmpty" class="analysis-empty">请先进行Ai分析</div>
        <template v-else>
          <div v-if="showSemiHint" class="semi-hint">当前显示裁切过的Ai分析影像</div>
          <div class="display-grid" :class="{ dual: showDual }">
            <div v-if="showDual" class="viewer-card">
              <div class="viewer-head">原影像标注显示</div>
              <div class="viewer-controls">
                <div class="slider-label">{{ rawSliderIndicator }}</div>
                <n-slider
                  v-model:value="rawViewer.currentIndex"
                  :min="0"
                  :max="Math.max(0, rawViewer.list.length - 1)"
                  :step="1"
                  :disabled="rawViewer.list.length === 0"
                  :show-tooltip="false"
                  :tooltip="false"
                  class="slider"
                />
                <n-button
                  size="small"
                  secondary
                  :disabled="rawViewer.list.length === 0"
                  @click="togglePlay('raw')"
                >
                  {{ rawViewer.isPlaying ? '暂停' : '播放' }}
                </n-button>
              </div>
              <div
                class="image-frame"
                @wheel.prevent="onWheel('raw', $event)"
                @pointerdown="onPointerDown('raw', $event)"
              >
                <template v-if="rawViewer.list.length === 0">
                  <div class="empty-frame">暂无 PNG 序列</div>
                </template>
                <template v-else>
                  <div class="image-canvas" :style="rawTransformStyle">
                    <img class="base-image" :src="rawViewer.currentUrl" alt="raw" />
                  </div>
                </template>
              </div>
            </div>

            <div class="viewer-card">
              <div class="viewer-head">Ai分析影像标注显示</div>
              <div class="viewer-controls">
                <div class="slider-label">{{ processedSliderIndicator }}</div>
                <n-slider
                  v-model:value="processedViewer.currentIndex"
                  :min="0"
                  :max="Math.max(0, processedViewer.list.length - 1)"
                  :step="1"
                  :disabled="processedViewer.list.length === 0"
                  :show-tooltip="false"
                  :tooltip="false"
                  class="slider"
                />
                <n-button
                  size="small"
                  secondary
                  :disabled="processedViewer.list.length === 0"
                  @click="togglePlay('processed')"
                >
                  {{ processedViewer.isPlaying ? '暂停' : '播放' }}
                </n-button>
              </div>
              <div
                class="image-frame"
                @wheel.prevent="onWheel('processed', $event)"
                @pointerdown="onPointerDown('processed', $event)"
              >
                <template v-if="processedViewer.list.length === 0">
                  <div class="empty-frame">暂无 PNG 序列</div>
                </template>
                <template v-else>
                  <div class="image-canvas" :style="processedTransformStyle">
                    <img class="base-image" :src="processedViewer.currentUrl" alt="processed" />
                  </div>
                </template>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="analysis-footer">
        <n-space size="small" wrap>
          <n-button size="small" @click="resetTransforms">恢复默认影像显示模式</n-button>
          <n-button size="small" @click="rotateClockwise">旋转（顺时针90度）</n-button>
          <n-button size="small" @click="toggleSyncZoom">
            {{ syncZoom ? '关闭同步缩放' : '启用同步缩放' }}
          </n-button>
          <n-button size="small" @click="toggleSyncPan">
            {{ syncPan ? '关闭同步平移' : '启用同步平移' }}
          </n-button>
        </n-space>
      </div>
    </div>
  </section>

  <n-modal
    v-if="showAnalysisModal"
    :show="showAnalysisModal"
    teleported
    :mask-closable="analysisPhase !== 'running'"
    :close-on-esc="analysisPhase !== 'running'"
    @update:show="(v: boolean) => handleAnalysisModalUpdate(v)"
  >
    <n-card class="modal-card" :bordered="false" role="dialog" aria-labelledby="analysis-title">
      <template #header>
        <div class="modal-title">
          <span id="analysis-title">Ai分析</span>
        </div>
      </template>
      <div class="modal-body">
        <template v-if="analysisPhase === 'select'">
          <div class="modal-tip">请选择分析模式</div>
          <n-space>
            <n-button v-if="canAnalyzeSemi" size="small" type="primary" @click="startAnalysis('semi')">
              分析裁切后的影像
            </n-button>
            <n-button size="small" type="primary" @click="startAnalysis('raw')">
              分析不裁切的影像
            </n-button>
          </n-space>
        </template>
        <template v-else-if="analysisPhase === 'running'">
          <div class="modal-tip">正在Ai分析中，请稍候…</div>
        </template>
        <template v-else-if="analysisPhase === 'done'">
          <div class="modal-tip">处理完成</div>
        </template>
        <template v-else>
          <div class="modal-tip">处理失败，请稍后重试</div>
        </template>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button
            v-if="analysisPhase !== 'running'"
            size="small"
            tertiary
            @click="closeAnalysisModal"
          >
            关闭
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>

  <n-modal
    v-if="showDownloadModal"
    :show="showDownloadModal"
    teleported
    :mask-closable="downloadClosable"
    :close-on-esc="downloadClosable"
    @update:show="handleDownloadModalUpdate"
  >
    <n-card class="modal-card" :bordered="false" role="dialog" aria-labelledby="download-title">
      <template #header>
        <div class="modal-title">
          <span id="download-title">提示</span>
        </div>
      </template>
      <div class="modal-body">{{ downloadMessage }}</div>
      <template #footer>
        <n-space justify="end">
          <n-button v-if="downloadClosable" size="small" tertiary @click="showDownloadModal = false">
            关闭
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { getProjectJson, type ProjectConfig } from '../api/projects'

type ViewerKey = 'raw' | 'processed'
type AnalysisMode = 'raw' | 'semi'

type ViewerState = {
  list: ReturnType<typeof ref<string[]>>
  currentIndex: ReturnType<typeof ref<number>>
  isPlaying: ReturnType<typeof ref<boolean>>
  timer: ReturnType<typeof ref<number | null>>
  currentUrl: ReturnType<typeof ref<string>>
  cache: Map<string, string>
  transform: { scale: number; x: number; y: number; rotation: number }
  dragging: ReturnType<typeof ref<boolean>>
  dragStart: { x: number; y: number }
  dragOrigin: { x: number; y: number }
}

const props = defineProps<{ uuid: string }>()

const projectConfig = ref<ProjectConfig | null>(null)
const errorConfig = ref<string | null>(null)

const showAnalysisModal = ref(false)
const analysisPhase = ref<'select' | 'running' | 'done' | 'error'>('select')
const analysisTarget = ref<AnalysisMode | null>(null)
const analysisTimer = ref<number | null>(null)

const showDownloadModal = ref(false)
const downloadMessage = ref('')
const downloadClosable = ref(true)

const syncZoom = ref(false)
const syncPan = ref(false)
const activeDragKey = ref<ViewerKey | null>(null)

const rawViewer = createViewer()
const processedViewer = createViewer()

const showDual = computed(() => projectConfig.value?.raw === 'markednpz')
const showSemiHint = computed(() => projectConfig.value?.PD === 'semi')
const showEmpty = computed(() => !projectConfig.value || projectConfig.value.PD === false)
const canAnalyzeSemi = computed(() => projectConfig.value?.semi !== false)

const rawSliderIndicator = computed(() => formatIndicator(rawViewer.list.value, rawViewer.currentIndex.value))
const processedSliderIndicator = computed(() =>
  formatIndicator(processedViewer.list.value, processedViewer.currentIndex.value),
)

const rawTransformStyle = computed(() => buildTransformStyle(rawViewer.transform))
const processedTransformStyle = computed(() => buildTransformStyle(processedViewer.transform))

function createViewer(): ViewerState {
  return {
    list: ref<string[]>([]),
    currentIndex: ref(0),
    isPlaying: ref(false),
    timer: ref(null),
    currentUrl: ref(''),
    cache: new Map(),
    transform: reactive({ scale: 1, x: 0, y: 0, rotation: 0 }),
    dragging: ref(false),
    dragStart: reactive({ x: 0, y: 0 }),
    dragOrigin: reactive({ x: 0, y: 0 }),
  }
}

function formatIndicator(list: string[], index: number) {
  if (!list.length) return '0 / 0'
  return `${index + 1} / ${list.length}`
}

function buildTransformStyle(transform: ViewerState['transform']) {
  return {
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
  }
}

function buildMarkedUrl(filename: string) {
  return `/api/project/${props.uuid}/markedpng/${filename}`
}

function buildProcessedUrl(filename: string) {
  return `/api/project/${props.uuid}/processed/png/${filename}`
}

async function ensureCachedUrl(cache: Map<string, string>, key: string, url: string) {
  const cached = cache.get(key)
  if (cached) return cached
  const res = await fetch(url)
  if (!res.ok) throw new Error('无法获取图片资源')
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  cache.set(key, objectUrl)
  return objectUrl
}

async function updateViewerImage(viewer: ViewerState, buildUrl: (name: string) => string) {
  if (!viewer.list.value.length) {
    viewer.currentUrl.value = ''
    return
  }
  const filename = viewer.list.value[viewer.currentIndex.value]
  if (!filename) return
  try {
    viewer.currentUrl.value = await ensureCachedUrl(viewer.cache, filename, buildUrl(filename))
  } catch (err) {
    console.error(err)
    viewer.currentUrl.value = buildUrl(filename)
  }
}

function revokeCache(cache: Map<string, string>) {
  for (const url of cache.values()) {
    URL.revokeObjectURL(url)
  }
  cache.clear()
}

async function loadConfig() {
  errorConfig.value = null
  try {
    projectConfig.value = await getProjectJson(props.uuid)
  } catch (err: any) {
    console.error(err)
    errorConfig.value = err?.message || String(err)
  } finally {
  }
}

async function loadMarkedList() {
  try {
    const res = await fetch(`/api/project/${props.uuid}/markedpng`)
    if (!res.ok) throw new Error('无法获取标注 PNG 列表')
    rawViewer.list.value = (await res.json()) as string[]
    if (rawViewer.currentIndex.value >= rawViewer.list.value.length) rawViewer.currentIndex.value = 0
  } catch (err) {
    console.error(err)
    rawViewer.list.value = []
  }
}

async function loadProcessedList() {
  try {
    const res = await fetch(`/api/project/${props.uuid}/processed/png`)
    if (!res.ok) throw new Error('无法获取处理 PNG 列表')
    processedViewer.list.value = (await res.json()) as string[]
    if (processedViewer.currentIndex.value >= processedViewer.list.value.length) {
      processedViewer.currentIndex.value = 0
    }
  } catch (err) {
    console.error(err)
    processedViewer.list.value = []
  }
}

async function refreshModule() {
  await loadConfig()
  if (projectConfig.value?.raw === 'markednpz') {
    await loadMarkedList()
  } else {
    rawViewer.list.value = []
  }
  await loadProcessedList()
}

function openAnalysisModal() {
  analysisPhase.value = 'select'
  analysisTarget.value = null
  showAnalysisModal.value = true
}

function handleAnalysisModalUpdate(value: boolean) {
  if (analysisPhase.value === 'running') return
  showAnalysisModal.value = value
}

function closeAnalysisModal() {
  showAnalysisModal.value = false
  if (analysisPhase.value === 'done') {
    refreshModule()
  }
}

async function startAnalysis(mode: AnalysisMode) {
  analysisPhase.value = 'running'
  analysisTarget.value = mode
  try {
    await fetch(`/api/project/${props.uuid}/start_analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    })
    startAnalysisPolling()
  } catch (err) {
    console.error(err)
    analysisPhase.value = 'error'
  }
}

function startAnalysisPolling() {
  stopAnalysisPolling()
  analysisTimer.value = window.setInterval(async () => {
    await loadConfig()
    if (analysisTarget.value && projectConfig.value?.PD === analysisTarget.value) {
      analysisPhase.value = 'done'
      stopAnalysisPolling()
      await loadProcessedList()
    }
  }, 500)
}

function stopAnalysisPolling() {
  if (analysisTimer.value) {
    window.clearInterval(analysisTimer.value)
    analysisTimer.value = null
  }
}

function handleDownloadModalUpdate(value: boolean) {
  if (downloadClosable.value) showDownloadModal.value = value
}

async function downloadProcessed(type: 'png' | 'npz' | 'nii' | 'dcm') {
  downloadMessage.value = '正在准备下载文件'
  downloadClosable.value = false
  showDownloadModal.value = true
  try {
    await triggerDownload(`/api/project/${props.uuid}/download/processed/${type}`)
    downloadMessage.value = '处理完成，已开始下载'
    downloadClosable.value = true
  } catch (err) {
    console.error(err)
    downloadMessage.value = '下载失败，请稍后重试'
    downloadClosable.value = true
  }
}

async function triggerDownload(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('下载失败')
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = url.split('/').pop() || 'download.zip'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

function getViewer(key: ViewerKey) {
  return key === 'raw' ? rawViewer : processedViewer
}

function togglePlay(key: ViewerKey) {
  const viewer = getViewer(key)
  if (viewer.isPlaying.value) {
    stopPlay(viewer)
  } else {
    startPlay(viewer)
  }
}

function startPlay(viewer: ViewerState) {
  if (viewer.list.value.length === 0) return
  stopPlayTimer(viewer)
  viewer.isPlaying.value = true
  viewer.timer.value = window.setInterval(() => {
    viewer.currentIndex.value = (viewer.currentIndex.value + 1) % viewer.list.value.length
  }, 50)
}

function stopPlay(viewer: ViewerState) {
  viewer.isPlaying.value = false
  stopPlayTimer(viewer)
}

function stopPlayTimer(viewer: ViewerState) {
  if (viewer.timer.value) {
    window.clearInterval(viewer.timer.value)
    viewer.timer.value = null
  }
}

function applyZoom(viewer: ViewerState, nextScale: number) {
  viewer.transform.scale = clampValue(nextScale, 0.3, 6)
}

function applyPan(viewer: ViewerState, x: number, y: number) {
  viewer.transform.x = x
  viewer.transform.y = y
}

function onWheel(key: ViewerKey, event: WheelEvent) {
  const viewer = getViewer(key)
  if (viewer.list.value.length === 0) return
  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
  const nextScale = viewer.transform.scale * zoomFactor
  if (syncZoom.value && showDual.value) {
    applyZoom(rawViewer, nextScale)
    applyZoom(processedViewer, nextScale)
  } else {
    applyZoom(viewer, nextScale)
  }
}

function onPointerDown(key: ViewerKey, event: PointerEvent) {
  const viewer = getViewer(key)
  if (viewer.list.value.length === 0) return
  viewer.dragging.value = true
  activeDragKey.value = key
  viewer.dragStart.x = event.clientX
  viewer.dragStart.y = event.clientY
  viewer.dragOrigin.x = viewer.transform.x
  viewer.dragOrigin.y = viewer.transform.y
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(event: PointerEvent) {
  if (!activeDragKey.value) return
  const viewer = getViewer(activeDragKey.value)
  if (!viewer.dragging.value) return
  const dx = event.clientX - viewer.dragStart.x
  const dy = event.clientY - viewer.dragStart.y
  if (syncPan.value && showDual.value) {
    applyPan(rawViewer, viewer.dragOrigin.x + dx, viewer.dragOrigin.y + dy)
    applyPan(processedViewer, viewer.dragOrigin.x + dx, viewer.dragOrigin.y + dy)
  } else {
    applyPan(viewer, viewer.dragOrigin.x + dx, viewer.dragOrigin.y + dy)
  }
}

function onPointerUp() {
  if (activeDragKey.value) {
    const viewer = getViewer(activeDragKey.value)
    viewer.dragging.value = false
  }
  activeDragKey.value = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

function resetTransforms() {
  resetViewerTransform(processedViewer)
  if (showDual.value) resetViewerTransform(rawViewer)
}

function resetViewerTransform(viewer: ViewerState) {
  viewer.transform.scale = 1
  viewer.transform.x = 0
  viewer.transform.y = 0
  viewer.transform.rotation = 0
}

function rotateClockwise() {
  rotateViewer(processedViewer)
  if (showDual.value) rotateViewer(rawViewer)
}

function rotateViewer(viewer: ViewerState) {
  viewer.transform.rotation = (viewer.transform.rotation + 90) % 360
}

function toggleSyncZoom() {
  syncZoom.value = !syncZoom.value
  if (syncZoom.value && showDual.value) {
    applyZoom(rawViewer, processedViewer.transform.scale)
  }
}

function toggleSyncPan() {
  syncPan.value = !syncPan.value
  if (syncPan.value && showDual.value) {
    applyPan(rawViewer, processedViewer.transform.x, processedViewer.transform.y)
  }
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

watch(rawViewer.list, () => {
  if (rawViewer.list.value.length === 0) stopPlay(rawViewer)
  revokeCache(rawViewer.cache)
  updateViewerImage(rawViewer, buildMarkedUrl)
})

watch(processedViewer.list, () => {
  if (processedViewer.list.value.length === 0) stopPlay(processedViewer)
  revokeCache(processedViewer.cache)
  updateViewerImage(processedViewer, buildProcessedUrl)
})

watch(rawViewer.currentIndex, () => updateViewerImage(rawViewer, buildMarkedUrl))
watch(processedViewer.currentIndex, () => updateViewerImage(processedViewer, buildProcessedUrl))

watch(
  () => projectConfig.value?.raw,
  (next) => {
    if (next === 'markednpz') loadMarkedList()
    if (next !== 'markednpz') rawViewer.list.value = []
  },
)

onMounted(async () => {
  await refreshModule()
})

onBeforeUnmount(() => {
  stopPlay(rawViewer)
  stopPlay(processedViewer)
  stopAnalysisPolling()
  revokeCache(rawViewer.cache)
  revokeCache(processedViewer.cache)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<style scoped>
.module{background:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(2,6,23,0.12)}
.module-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--color-border)}
.module-head h2{margin:0;font-size:16px}
.module-body{padding:16px}
.state{padding:10px 12px;margin-bottom:12px;border-radius:8px;background:#f8fafc;color:#334155;font-size:13px}
.state.error{color:#b91c1c;background:#fef2f2}
.analysis-top{display:flex;flex-direction:column;gap:12px;margin-bottom:14px}
.analysis-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.analysis-note{color:#64748b;font-size:12px}
.analysis-downloads{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.analysis-display{display:flex;flex-direction:column;gap:12px}
.analysis-empty{padding:14px;border-radius:10px;background:#f8fafc;color:#475569;font-size:14px}
.semi-hint{color:#ff0000;font-size:15px}
.display-grid{display:grid;grid-template-columns:1fr;gap:16px}
.display-grid.dual{grid-template-columns:repeat(2,minmax(0,1fr))}
.viewer-card{display:flex;flex-direction:column;gap:10px}
.viewer-head{font-size:13px;color:#475569;font-weight:600}
.viewer-controls{display:flex;align-items:center;gap:10px}
.slider-label{min-width:48px;font-size:12px;color:#64748b;text-align:right}
.slider{width:100%}
.image-frame{width:100%;aspect-ratio:1/1;border-radius:12px;overflow:hidden;background:#0f172a;position:relative;display:flex;align-items:center;justify-content:center;touch-action:none}
.image-canvas{width:512px;height:512px;display:flex;align-items:center;justify-content:center;transform-origin:center center}
.base-image{width:512px;height:512px;object-fit:contain;display:block}
.empty-frame{color:#94a3b8;font-size:14px}
.analysis-footer{margin-top:16px}
.modal-card{width:min(92vw,640px);border-radius:12px;box-shadow:0 20px 50px rgba(2,6,23,0.2)}
.modal-title{display:flex;align-items:center;justify-content:space-between}
.modal-body{display:flex;flex-direction:column;gap:12px}
.modal-tip{font-size:14px;color:#334155}
:deep(.n-modal-mask){backdrop-filter:blur(6px);background:rgba(15,23,42,0.35)}
@media (max-width: 900px){
  .display-grid.dual{grid-template-columns:1fr}
}
</style>
