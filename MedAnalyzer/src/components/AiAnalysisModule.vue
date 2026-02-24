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
        <div v-if="hasAnalysis" class="analysis-downloads">
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
          <div v-if="showSemiHint" class="semi-hint">当前使用裁切过的影像进行分析(依旧显示完整影像)</div>
          <div class="display-grid" :class="{ dual: showDual }">
            <div v-if="showDual" class="viewer-card">
              <div class="viewer-head">
                <span>原影像标注显示</span>
                <n-button size="small" :disabled="rawList.length === 0" @click="toggleMark('raw')">
                  {{ showRawMarked ? '关闭标注显示' : '显示标注' }}
                </n-button>
              </div>
              <div class="viewer-controls">
                <div class="slider-label">{{ rawSliderIndicator }}</div>
                <n-slider
                  v-model:value="rawIndex"
                  :min="0"
                  :max="Math.max(0, rawList.length - 1)"
                  :step="1"
                  :disabled="rawList.length === 0"
                  :show-tooltip="false"
                  :tooltip="false"
                  class="slider"
                />
                <n-button
                  size="small"
                  secondary
                  :disabled="rawList.length === 0"
                  @click="togglePlay('raw')"
                >
                  {{ rawPlaying ? '暂停' : '播放' }}
                </n-button>
              </div>
              <div
                class="image-frame"
                @wheel.prevent="onWheel('raw', $event)"
                @pointerdown="onPointerDown('raw', $event)"
              >
                <template v-if="rawList.length === 0">
                  <div class="empty-frame">暂无 PNG 序列</div>
                </template>
                <template v-else>
                  <div class="image-canvas" :style="rawTransformStyle">
                    <img class="base-image" :src="rawCurrentUrl" alt="raw" draggable="false" />
                    <img
                      v-if="showRawMarked && rawMarkedUrl"
                      class="mark-image"
                      :src="rawMarkedUrl"
                      alt="raw marked"
                      draggable="false"
                    />
                  </div>
                </template>
              </div>
            </div>

            <div class="viewer-card">
              <div class="viewer-head">
                <span>Ai分析影像标注显示</span>
                <n-button
                  size="small"
                  :disabled="processedList.length === 0"
                  @click="toggleMark('processed')"
                >
                  {{ showProcessedMarked ? '关闭标注显示' : '显示标注' }}
                </n-button>
              </div>
              <div class="viewer-controls">
                <div class="slider-label">{{ processedSliderIndicator }}</div>
                <n-slider
                  v-model:value="processedIndex"
                  :min="0"
                  :max="Math.max(0, processedList.length - 1)"
                  :step="1"
                  :disabled="processedList.length === 0"
                  :show-tooltip="false"
                  :tooltip="false"
                  class="slider"
                />
                <n-button
                  size="small"
                  secondary
                  :disabled="processedList.length === 0"
                  @click="togglePlay('processed')"
                >
                  {{ processedPlaying ? '暂停' : '播放' }}
                </n-button>
              </div>
              <div
                class="image-frame"
                @wheel.prevent="onWheel('processed', $event)"
                @pointerdown="onPointerDown('processed', $event)"
              >
                <template v-if="processedList.length === 0">
                  <div class="empty-frame">暂无 PNG 序列</div>
                </template>
                <template v-else>
                  <div class="image-canvas" :style="processedTransformStyle">
                    <img class="base-image" :src="processedCurrentUrl" alt="processed" draggable="false" />
                    <img
                      v-if="showProcessedMarked && processedMarkedUrl"
                      class="mark-image"
                      :src="processedMarkedUrl"
                      alt="processed marked"
                      draggable="false"
                    />
                  </div>
                </template>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-if="hasAnalysis" class="analysis-footer">
        <n-space size="small" wrap>
          <n-button size="small" @click="resetTransforms">恢复默认影像显示模式</n-button>
          <n-button size="small" @click="rotateClockwise">旋转（顺时针90度）</n-button>
          <n-button size="small" @click="toggleSyncZoom">
            {{ syncZoom ? '关闭同步缩放' : '启用同步缩放' }}
          </n-button>
          <n-button size="small" @click="toggleSyncPlay">
            {{ syncPlay ? '关闭同步播放' : '启用同步播放' }}
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
          <div class="modal-tip">正在Ai分析中，请稍候…（需要一段时间，请耐心等待）</div>
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
const syncPlay = ref(false)
const syncPan = ref(false)
const activeDragKey = ref<ViewerKey | null>(null)

const rawList = ref<string[]>([])
const processedList = ref<string[]>([])
const rawMarkedList = ref<string[]>([])
const processedMarkedList = ref<string[]>([])
const rawIndex = ref(0)
const processedIndex = ref(0)
const rawPlaying = ref(false)
const processedPlaying = ref(false)
const rawPlayTimer = ref<number | null>(null)
const processedPlayTimer = ref<number | null>(null)
const rawCurrentUrl = ref('')
const processedCurrentUrl = ref('')

const showDual = computed(() => projectConfig.value?.raw === 'markednpz')
const showSemiHint = computed(() => projectConfig.value?.PD === 'semi')
const showEmpty = computed(() => !projectConfig.value || projectConfig.value.PD === false)
const canAnalyzeSemi = computed(() => projectConfig.value?.semi !== false)
const hasAnalysis = computed(() => projectConfig.value?.PD !== false)

const showRawMarked = ref(false)
const showProcessedMarked = ref(false)
const rawMarkedUrl = ref('')
const processedMarkedUrl = ref('')
const rawCache = new Map<string, string>()
const processedCache = new Map<string, string>()
const rawMarkedCache = new Map<string, string>()
const processedMarkedCache = new Map<string, string>()

const rawTransform = reactive({ scale: 1, x: 0, y: 0, rotation: 0 })
const processedTransform = reactive({ scale: 1, x: 0, y: 0, rotation: 0 })
const rawDragging = ref(false)
const processedDragging = ref(false)
const rawDragStart = reactive({ x: 0, y: 0 })
const processedDragStart = reactive({ x: 0, y: 0 })
const rawDragOrigin = reactive({ x: 0, y: 0 })
const processedDragOrigin = reactive({ x: 0, y: 0 })

const rawSliderIndicator = computed(() => formatIndicator(rawList.value, rawIndex.value))
const processedSliderIndicator = computed(() => formatIndicator(processedList.value, processedIndex.value))

const rawTransformStyle = computed(() => buildTransformStyle(rawTransform))
const processedTransformStyle = computed(() => buildTransformStyle(processedTransform))

function formatIndicator(list: string[], index: number) {
  if (!list.length) return '0 / 0'
  return `${index + 1} / ${list.length}`
}

function buildTransformStyle(transform: { scale: number; x: number; y: number; rotation: number }) {
  return {
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
  }
}

function buildMarkedUrl(filename: string) {
  return `/api/project/${props.uuid}/markedpng/${encodeURIComponent(filename)}`
}

function buildRawUrl(filename: string) {
  return `/api/project/${props.uuid}/png/${encodeURIComponent(filename)}`
}

function buildProcessedUrl(filename: string) {
  return `/api/project/${props.uuid}/png/${encodeURIComponent(filename)}`
}

function buildProcessedMarkedUrl(filename: string) {
  return `/api/project/${props.uuid}/processed/png/${encodeURIComponent(filename)}`
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

async function updateRawImages() {
  if (!rawList.value.length) {
    rawCurrentUrl.value = ''
    rawMarkedUrl.value = ''
    return
  }
  const filename = rawList.value[rawIndex.value]
  if (!filename) return
  try {
    rawCurrentUrl.value = await ensureCachedUrl(rawCache, filename, buildRawUrl(filename))
  } catch (err) {
    console.error(err)
    rawCurrentUrl.value = buildRawUrl(filename)
  }

  if (showRawMarked.value) {
    if (!rawMarkedList.value.length) {
      await loadRawMarkedList()
    }
    const markedFilename = rawMarkedList.value[rawIndex.value] || filename
    try {
      rawMarkedUrl.value = await ensureCachedUrl(
        rawMarkedCache,
        markedFilename,
        buildMarkedUrl(markedFilename),
      )
    } catch (err) {
      console.error(err)
      rawMarkedUrl.value = buildMarkedUrl(markedFilename)
    }
  } else {
    rawMarkedUrl.value = ''
  }
}

async function updateProcessedImages() {
  if (!processedList.value.length) {
    processedCurrentUrl.value = ''
    processedMarkedUrl.value = ''
    return
  }
  const filename = processedList.value[processedIndex.value]
  if (!filename) return
  try {
    processedCurrentUrl.value = await ensureCachedUrl(
      processedCache,
      filename,
      buildProcessedUrl(filename),
    )
  } catch (err) {
    console.error(err)
    processedCurrentUrl.value = buildProcessedUrl(filename)
  }

  if (showProcessedMarked.value) {
    if (!processedMarkedList.value.length) {
      await loadProcessedList()
    }
    const markedFilename = processedMarkedList.value[processedIndex.value] || filename
    try {
      processedMarkedUrl.value = await ensureCachedUrl(
        processedMarkedCache,
        markedFilename,
        buildProcessedMarkedUrl(markedFilename),
      )
    } catch (err) {
      console.error(err)
      processedMarkedUrl.value = buildProcessedMarkedUrl(markedFilename)
    }
  } else {
    processedMarkedUrl.value = ''
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

async function loadRawList() {
  try {
    const res = await fetch(`/api/project/${props.uuid}/png`)
    if (!res.ok) throw new Error('无法获取 PNG 列表')
    rawList.value = (await res.json()) as string[]
    processedList.value = rawList.value
    if (rawIndex.value >= rawList.value.length) rawIndex.value = 0
    if (processedIndex.value >= processedList.value.length) processedIndex.value = 0
  } catch (err) {
    console.error(err)
    rawList.value = []
    processedList.value = []
  }
}

async function loadRawMarkedList() {
  try {
    const res = await fetch(`/api/project/${props.uuid}/markedpng`)
    if (!res.ok) throw new Error('无法获取标注 PNG 列表')
    rawMarkedList.value = (await res.json()) as string[]
  } catch (err) {
    console.error(err)
    rawMarkedList.value = []
  }
}

async function loadProcessedList() {
  try {
    const res = await fetch(`/api/project/${props.uuid}/processed/png`)
    if (!res.ok) throw new Error('无法获取处理 PNG 列表')
    processedMarkedList.value = (await res.json()) as string[]
    if (processedIndex.value >= processedList.value.length) processedIndex.value = 0
  } catch (err) {
    console.error(err)
    processedMarkedList.value = []
  }
}

async function refreshModule() {
  await loadConfig()
  await loadRawList()
  if (showRawMarked.value) {
    await loadRawMarkedList()
  }
  await loadProcessedList()
}

async function openAnalysisModal() {
  analysisPhase.value = 'select'
  analysisTarget.value = null
  showAnalysisModal.value = true
  await loadConfig()
}

function handleAnalysisModalUpdate(value: boolean) {
  if (analysisPhase.value === 'running') return
  showAnalysisModal.value = value
  if (!value) {
    void refreshModule()
  }
}

function closeAnalysisModal() {
  showAnalysisModal.value = false
  void refreshModule()
}

async function startAnalysis(mode: AnalysisMode) {
  analysisPhase.value = 'running'
  analysisTarget.value = mode
  try {
    const res = await fetch(`/api/project/${props.uuid}/start_analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    })
    if (!res.ok) {
      throw new Error(`启动分析失败：${res.status}`)
    }
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

function togglePlay(key: ViewerKey) {
  if (syncPlay.value && showDual.value) {
    const shouldPlay = !(rawPlaying.value && processedPlaying.value)
    if (shouldPlay) {
      startRawPlay()
      startProcessedPlay()
    } else {
      stopRawPlay()
      stopProcessedPlay()
    }
    return
  }
  if (key === 'raw') {
    rawPlaying.value ? stopRawPlay() : startRawPlay()
  } else {
    processedPlaying.value ? stopProcessedPlay() : startProcessedPlay()
  }
}

function toggleMark(key: ViewerKey) {
  if (key === 'raw') {
    showRawMarked.value = !showRawMarked.value
  } else {
    showProcessedMarked.value = !showProcessedMarked.value
  }
}

function startRawPlay() {
  if (rawList.value.length === 0) return
  stopRawPlayTimer()
  rawPlaying.value = true
  rawPlayTimer.value = window.setInterval(() => {
    rawIndex.value = (rawIndex.value + 1) % rawList.value.length
  }, 50)
}

function startProcessedPlay() {
  if (processedList.value.length === 0) return
  stopProcessedPlayTimer()
  processedPlaying.value = true
  processedPlayTimer.value = window.setInterval(() => {
    processedIndex.value = (processedIndex.value + 1) % processedList.value.length
  }, 50)
}

function stopRawPlay() {
  rawPlaying.value = false
  stopRawPlayTimer()
}

function stopProcessedPlay() {
  processedPlaying.value = false
  stopProcessedPlayTimer()
}

function stopRawPlayTimer() {
  if (rawPlayTimer.value) {
    window.clearInterval(rawPlayTimer.value)
    rawPlayTimer.value = null
  }
}

function stopProcessedPlayTimer() {
  if (processedPlayTimer.value) {
    window.clearInterval(processedPlayTimer.value)
    processedPlayTimer.value = null
  }
}

function applyZoom(transform: { scale: number; x: number; y: number; rotation: number }, nextScale: number) {
  transform.scale = clampValue(nextScale, 0.3, 6)
}

function applyPan(transform: { scale: number; x: number; y: number; rotation: number }, x: number, y: number) {
  transform.x = x
  transform.y = y
}

function onWheel(key: ViewerKey, event: WheelEvent) {
  const hasImages = key === 'raw' ? rawList.value.length > 0 : processedList.value.length > 0
  if (!hasImages) return
  const zoomFactor = event.deltaY > 0 ? 0.96 : 1.04
  if (syncZoom.value && showDual.value) {
    applyZoom(rawTransform, rawTransform.scale * zoomFactor)
    applyZoom(processedTransform, processedTransform.scale * zoomFactor)
  } else {
    const transform = key === 'raw' ? rawTransform : processedTransform
    applyZoom(transform, transform.scale * zoomFactor)
  }
}

function onPointerDown(key: ViewerKey, event: PointerEvent) {
  const hasImages = key === 'raw' ? rawList.value.length > 0 : processedList.value.length > 0
  if (!hasImages) return
  const dragging = key === 'raw' ? rawDragging : processedDragging
  const dragStart = key === 'raw' ? rawDragStart : processedDragStart
  const dragOrigin = key === 'raw' ? rawDragOrigin : processedDragOrigin
  const transform = key === 'raw' ? rawTransform : processedTransform
  dragging.value = true
  activeDragKey.value = key
  dragStart.x = event.clientX
  dragStart.y = event.clientY
  dragOrigin.x = transform.x
  dragOrigin.y = transform.y
  if (syncPan.value && showDual.value) {
    rawDragOrigin.x = rawTransform.x
    rawDragOrigin.y = rawTransform.y
    processedDragOrigin.x = processedTransform.x
    processedDragOrigin.y = processedTransform.y
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(event: PointerEvent) {
  if (!activeDragKey.value) return
  const dragging = activeDragKey.value === 'raw' ? rawDragging : processedDragging
  const dragStart = activeDragKey.value === 'raw' ? rawDragStart : processedDragStart
  const dragOrigin = activeDragKey.value === 'raw' ? rawDragOrigin : processedDragOrigin
  if (!dragging.value) return
  const dx = event.clientX - dragStart.x
  const dy = event.clientY - dragStart.y
  if (syncPan.value && showDual.value) {
    applyPan(rawTransform, rawDragOrigin.x + dx, rawDragOrigin.y + dy)
    applyPan(processedTransform, processedDragOrigin.x + dx, processedDragOrigin.y + dy)
  } else {
    const transform = activeDragKey.value === 'raw' ? rawTransform : processedTransform
    applyPan(transform, dragOrigin.x + dx, dragOrigin.y + dy)
  }
}

function onPointerUp() {
  if (activeDragKey.value) {
    const dragging = activeDragKey.value === 'raw' ? rawDragging : processedDragging
    dragging.value = false
  }
  activeDragKey.value = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

function resetTransforms() {
  resetViewerTransform(processedTransform)
  if (showDual.value) resetViewerTransform(rawTransform)
}

function resetViewerTransform(transform: { scale: number; x: number; y: number; rotation: number }) {
  transform.scale = 1
  transform.x = 0
  transform.y = 0
  transform.rotation = 0
}

function rotateClockwise() {
  rotateViewer(processedTransform)
  if (showDual.value) rotateViewer(rawTransform)
}

function rotateViewer(transform: { scale: number; x: number; y: number; rotation: number }) {
  transform.rotation = (transform.rotation + 90) % 360
}

function toggleSyncZoom() {
  syncZoom.value = !syncZoom.value
}

function toggleSyncPlay() {
  syncPlay.value = !syncPlay.value
}

function toggleSyncPan() {
  syncPan.value = !syncPan.value
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

watch(rawList, (list) => {
  if (list.length === 0) stopRawPlay()
  revokeCache(rawCache)
  revokeCache(rawMarkedCache)
  updateRawImages()
})

watch(processedList, (list) => {
  if (list.length === 0) stopProcessedPlay()
  revokeCache(processedCache)
  revokeCache(processedMarkedCache)
  updateProcessedImages()
})

watch([rawIndex, showRawMarked], () => {
  updateRawImages()
})

watch([processedIndex, showProcessedMarked], () => {
  updateProcessedImages()
})

watch(showRawMarked, (next) => {
  if (next) loadRawMarkedList().then(() => updateRawImages())
})

watch(rawMarkedList, () => updateRawImages())

watch(processedMarkedList, () => updateProcessedImages())


onMounted(async () => {
  await refreshModule()
})

onBeforeUnmount(() => {
  stopRawPlay()
  stopProcessedPlay()
  stopAnalysisPolling()
  revokeCache(rawCache)
  revokeCache(processedCache)
  revokeCache(rawMarkedCache)
  revokeCache(processedMarkedCache)
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
.display-grid.dual{grid-template-columns:512px 1fr;gap:10px}
.viewer-card{display:flex;flex-direction:column;gap:10px;max-width: 512px;}
.viewer-head{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;color:#475569;font-weight:600}
.viewer-controls{display:flex;align-items:center;gap:10px}
.slider-label{min-width:48px;font-size:12px;color:#64748b;text-align:right}
.slider{width:100%}
.image-frame{width:100%;aspect-ratio:1/1;border-radius:12px;overflow:hidden;background:#0f172a;position:relative;display:flex;align-items:center;justify-content:center;touch-action:none}
.image-canvas{width:512px;height:512px;position:relative;display:flex;align-items:center;justify-content:center;transform-origin:center center}
.base-image,.mark-image{width:512px;height:512px;object-fit:contain;display:block}
.mark-image{position:absolute;inset:0;pointer-events:none}
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
