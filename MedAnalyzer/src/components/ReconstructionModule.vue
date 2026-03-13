<template>
  <section class="module">
    <div class="module-head">
      <h2>三维重建</h2>
    </div>
    <div class="module-body">
      <div v-if="errorConfig" class="state error">加载失败：{{ errorConfig }}</div>
      <div v-else-if="modelError" class="state error">模型加载失败：{{ modelError }}</div>

      <div class="recon-top">
        <n-space v-if="isTempScope && !props.externalTools" size="small" align="center" wrap>
          <n-button size="small" tertiary :loading="tempUploading" @click="triggerTempUpload">
            上传NPZ文件
          </n-button>
          <n-button size="small" type="primary" @click="openSaveProjectModal">保存项目</n-button>
          <input
            ref="tempUploadInput"
            type="file"
            class="hidden-input"
            accept=".npz"
            multiple
            @change="handleTempFilesSelected"
          />
        </n-space>
        <n-space size="small" align="center">
          <n-button size="small" type="primary" @click="openRebuildModal">
            开始/重新三维重建
          </n-button>
          <span class="recon-tip">【重建会覆盖当前三维结果】</span>
        </n-space>
        <n-space v-if="has3d" size="small" align="center">
          <n-button v-if="showDual" size="small" @click="toggleSyncRotate">
            {{ syncRotate ? '关闭同步旋转' : '同步旋转' }}
          </n-button>
          <n-button v-if="showDual" size="small" @click="toggleSyncZoom">
            {{ syncZoom ? '关闭同步缩放' : '同步缩放' }}
          </n-button>
          <n-button size="small" @click="handleDownloadClick">下载模型</n-button>
        </n-space>
      </div>

      <template v-if="has3d">
        <div class="recon-display" :class="{ dual: showDual }">
          <div v-if="showDual" class="viewer-card">
            <div class="viewer-head">
              <span>原始影像标注三维显示</span>
              <div class="viewer-meta">{{ rawViewerMeta }}</div>
            </div>
            <div class="viewer-canvas">
              <canvas
                ref="rawCanvas"
              ></canvas>
              <div class="viewer-overlay">
                <span>缩放 {{ formatZoom(viewerStates.raw.zoom) }}</span>
                <span>旋转 {{ formatRotation(viewerStates.raw) }}</span>
              </div>
            </div>
          </div>

          <div class="viewer-card">
            <div class="viewer-head">
              <span>{{ primaryViewerTitle }}</span>
              <div class="viewer-meta">{{ primaryViewerMeta }}</div>
            </div>
            <div class="viewer-canvas">
              <canvas
                ref="processedCanvas"
              ></canvas>
              <div class="viewer-overlay">
                <span>缩放 {{ formatZoom(viewerStates.processed.zoom) }}</span>
                <span>旋转 {{ formatRotation(viewerStates.processed) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="recon-controls" :class="{ dual: showDual }">
          <div v-if="showDual" class="control-card">
            <div class="control-title">原始影像标注三维操作</div>
            <div class="control-actions">
              <n-space size="small" wrap>
                <n-button size="small" @click="resetView('raw')">重置视角</n-button>
                <n-button size="small" @click="toggleAutoRotate('raw')">
                  {{ viewerStates.raw.autoRotate ? '停止自动旋转' : '自动旋转' }}
                </n-button>
                <n-button size="small" @click="toggleWireframe('raw')">
                  {{ viewerStates.raw.wireframe ? '隐藏线框' : '显示线框' }}
                </n-button>
                <n-button size="small" @click="toggleBackground('raw')">切换背景</n-button>
              </n-space>
              <div class="control-slider">
                <div class="slider-label">缩放</div>
                <n-slider
                  v-model:value="viewerStates.raw.zoom"
                  :min="0.4"
                  :max="3"
                  :step="0.05"
                  :show-tooltip="false"
                />
              </div>
            </div>
          </div>

          <div class="control-card">
            <div class="control-title">Ai分析影像三维操作</div>
            <div class="control-actions">
              <n-space size="small" wrap>
                <n-button size="small" @click="resetView('processed')">重置视角</n-button>
                <n-button size="small" @click="toggleAutoRotate('processed')">
                  {{ viewerStates.processed.autoRotate ? '停止自动旋转' : '自动旋转' }}
                </n-button>
                <n-button size="small" @click="toggleWireframe('processed')">
                  {{ viewerStates.processed.wireframe ? '隐藏线框' : '显示线框' }}
                </n-button>
                <n-button size="small" @click="toggleBackground('processed')">切换背景</n-button>
              </n-space>
              <div class="control-slider">
                <div class="slider-label">缩放</div>
                <n-slider
                  v-model:value="viewerStates.processed.zoom"
                  :min="0.4"
                  :max="2.5"
                  :step="0.05"
                  :show-tooltip="false"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </section>

  <n-modal
    v-if="showRebuildModal"
    :show="showRebuildModal"
    teleported
    :mask-closable="rebuildPhase !== 'running'"
    :close-on-esc="rebuildPhase !== 'running'"
    @update:show="handleRebuildModalUpdate"
  >
    <n-card class="modal-card" :bordered="false" role="dialog" aria-labelledby="rebuild-title">
      <template #header>
        <div class="modal-title">
          <span id="rebuild-title">三维重建</span>
        </div>
      </template>
      <div class="modal-body">
        <template v-if="rebuildPhase === 'blocked'">
          <div class="modal-tip">{{ rebuildBlockedMessage }}</div>
        </template>
        <template v-else-if="rebuildPhase === 'confirm'">
          <div class="modal-tip">当前会重建Ai分析中的结果，是否继续？</div>
        </template>
        <template v-else-if="rebuildPhase === 'running'">
          <div class="modal-tip">正在三维重建中，请耐心等待…</div>
        </template>
        <template v-else-if="rebuildPhase === 'done'">
          <div class="modal-tip">处理完成</div>
        </template>
        <template v-else>
          <div class="modal-tip">{{ rebuildErrorMessage || '处理失败，请稍后重试' }}</div>
        </template>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button
            v-if="rebuildPhase === 'confirm'"
            size="small"
            type="primary"
            @click="startRebuild"
          >
            继续
          </n-button>
          <n-button
            v-if="rebuildPhase !== 'running'"
            size="small"
            tertiary
            @click="closeRebuildModal"
          >
            关闭
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>

  <n-modal
    v-if="showSaveProjectModal && !props.externalTools"
    :show="showSaveProjectModal"
    teleported
    :mask-closable="!savingProject"
    :close-on-esc="!savingProject"
    @update:show="handleSaveProjectModalUpdate"
  >
    <n-card class="modal-card" :bordered="false" role="dialog" aria-labelledby="save-project-title">
      <template #header>
        <div class="modal-title">
          <span id="save-project-title">保存项目</span>
        </div>
      </template>
      <div class="modal-body">
        <n-input v-model:value="saveProjectForm.name" placeholder="请输入项目名称" />
        <n-input
          v-model:value="saveProjectForm.note"
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 5 }"
          placeholder="请输入项目备注（可选）"
        />
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button size="small" tertiary :disabled="savingProject" @click="showSaveProjectModal = false">
            取消
          </n-button>
          <n-button size="small" type="primary" :loading="savingProject" @click="confirmSaveProject">
            确定
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
          <span id="download-title">下载模型</span>
        </div>
      </template>
      <div class="modal-body">
        <template v-if="downloadPhase === 'select'">
          <div class="modal-tip">请选择要下载的三维模型</div>
          <n-space>
            <n-button size="small" type="primary" @click="downloadModel('og')">
              下载原始影像的三维模型
            </n-button>
            <n-button size="small" type="primary" @click="downloadModel('ai')">
              下载Ai分析影像的三维模型
            </n-button>
          </n-space>
        </template>
        <template v-else>
          <div class="modal-tip">{{ downloadMessage }}</div>
        </template>
      </div>
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
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import {
  convertTempProject,
  getProjectJson,
  type ProjectConfig,
  type ProjectScope,
} from '../api/projects'
import { clearStoredTempUUID } from '../utils/tempProjectSession'

type ViewerKey = 'raw' | 'processed'
type DownloadTarget = 'ai' | 'og'
type RebuildPhase = 'idle' | 'confirm' | 'blocked' | 'running' | 'done' | 'error'
type DownloadPhase = 'select' | 'running' | 'done' | 'error'

type ViewerState = {
  zoom: number
  rotationX: number
  rotationY: number
  autoRotate: boolean
  showGrid: boolean
  showAxes: boolean
  wireframe: boolean
  background: 'light' | 'dark' | 'blue'
}

type ViewerContext = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  modelGroup: THREE.Group
  gridHelper: THREE.GridHelper
  axesHelper: THREE.AxesHelper
  center: THREE.Vector3
  baseDistance: number
  model: THREE.Object3D | null
  animationId: number | null
  resizeObserver: ResizeObserver
  resizeFrameId: number | null
  lastWidth: number
  lastHeight: number
  syncingZoom: boolean
  lastSpherical: THREE.Spherical
}

const props = withDefaults(
  defineProps<{ uuid: string; scope?: ProjectScope; externalTools?: boolean }>(),
  { scope: 'project', externalTools: false },
)
const router = useRouter()

const isTempScope = computed(() => props.scope === 'temp')
const apiBase = computed(() =>
  isTempScope.value ? `/api/temp/${props.uuid}` : `/api/project/${props.uuid}`,
)
const metaApiBase = computed(() =>
  isTempScope.value ? `/api/temp/${props.uuid}` : `/api/projects/${props.uuid}`,
)

const projectConfig = ref<ProjectConfig | null>(null)
const errorConfig = ref<string | null>(null)
const modelError = ref<string | null>(null)
const showRebuildModal = ref(false)
const rebuildPhase = ref<RebuildPhase>('idle')
const rebuildTimer = ref<number | null>(null)
const rebuildPollCount = ref(0)
const rebuildBlockedMessage = ref('请先进行Ai分析后再进行三维重建')
const rebuildErrorMessage = ref('')

const showDownloadModal = ref(false)
const downloadMessage = ref('')
const downloadClosable = ref(true)
const downloadPhase = ref<DownloadPhase>('select')

const rawCanvas = ref<HTMLCanvasElement | null>(null)
const processedCanvas = ref<HTMLCanvasElement | null>(null)

const syncRotate = ref(false)
const syncZoom = ref(false)
const syncLock = ref(false)
const lastActiveKey = ref<ViewerKey>('processed')
const tempUploadInput = ref<HTMLInputElement | null>(null)
const tempUploading = ref(false)
const showSaveProjectModal = ref(false)
const savingProject = ref(false)
const tempModelStatus = reactive({
  raw: false,
  processed: false,
})
const saveProjectForm = reactive({
  name: '',
  note: '',
})

const viewerStates = reactive({
  raw: createViewerState(),
  processed: createViewerState(),
})

const viewers: Record<ViewerKey, ViewerContext | null> = {
  raw: null,
  processed: null,
}

const hasProcessedModel = computed(() => {
  if (!projectConfig.value) return false
  return isTempScope.value ? tempModelStatus.processed : projectConfig.value['PD-3d'] !== false
})
const hasRawModel = computed(() => {
  if (projectConfig.value?.raw !== 'markednpz') return false
  return isTempScope.value ? tempModelStatus.raw : hasProcessedModel.value
})
const has3d = computed(() => hasProcessedModel.value || hasRawModel.value)
const showDual = computed(() => hasProcessedModel.value && hasRawModel.value)
const primaryViewerTitle = computed(() =>
  hasProcessedModel.value ? 'Ai分析影像标注三维显示' : '原始影像标注三维显示',
)
const rawViewerMeta = computed(() => (showDual.value ? '原始标注三维模型' : ''))
const processedViewerMeta = computed(() =>
  projectConfig.value?.PD ? `Ai分析模式：${projectConfig.value.PD}` : '',
)
const primaryViewerMeta = computed(() =>
  hasProcessedModel.value ? processedViewerMeta.value : '原始标注三维模型',
)

function createViewerState(): ViewerState {
  return {
    zoom: 1,
    rotationX: 0,
    rotationY: 0,
    autoRotate: false,
    showGrid: false,
    showAxes: false,
    wireframe: false,
    background: 'light',
  }
}

async function loadConfig() {
  errorConfig.value = null
  try {
    projectConfig.value = await getProjectJson(props.uuid, props.scope)
  } catch (err: any) {
    console.error(err)
    errorConfig.value = err?.message || String(err)
  }
}

async function updateTempModelStatus() {
  if (!isTempScope.value || !props.uuid) {
    tempModelStatus.raw = false
    tempModelStatus.processed = false
    return
  }
  const [processed, raw] = await Promise.all([
    checkModelReady(`${apiBase.value}/download/3d`),
    projectConfig.value?.raw === 'markednpz'
      ? checkModelReady(`${apiBase.value}/download/OG3d`)
      : Promise.resolve(false),
  ])
  tempModelStatus.processed = processed
  tempModelStatus.raw = raw
}

async function checkModelReady(url: string) {
  try {
    const headRes = await fetch(url, { method: 'HEAD' })
    if (headRes.ok) return true
    if (headRes.status !== 405 && headRes.status !== 501) return false
  } catch {
    // 部分后端不支持 HEAD，请回退到 GET 探测。
  }

  try {
    const res = await fetch(url)
    if (!res.ok) return false
    await res.body?.cancel?.()
    return true
  } catch {
    return false
  }
}

function resolveModelUrl(key: ViewerKey) {
  if (key === 'raw') return `${apiBase.value}/download/OG3d`
  if (isTempScope.value && !hasProcessedModel.value && hasRawModel.value) {
    return `${apiBase.value}/download/OG3d`
  }
  return `${apiBase.value}/download/3d`
}

function isRebuildCompleted() {
  if (projectConfig.value?.['PD-3d'] !== false) return true
  return isTempScope.value && (tempModelStatus.processed || tempModelStatus.raw)
}

async function refreshModule() {
  await loadConfig()
  await updateTempModelStatus()
  await nextTick()
  if (!has3d.value) {
    disposeViewer('processed')
    disposeViewer('raw')
    return
  }
  modelError.value = null
  try {
    await ensureViewer('processed')
    await loadModel('processed')
    if (showDual.value) {
      await ensureViewer('raw')
      await loadModel('raw')
    } else {
      disposeViewer('raw')
    }
  } catch (err: any) {
    console.error(err)
    modelError.value = err?.message || '无法解析模型文件'
  }
}

async function openRebuildModal() {
  showRebuildModal.value = true
  rebuildPhase.value = 'confirm'
  rebuildErrorMessage.value = ''
  await loadConfig()
  await updateTempModelStatus()
  decideRebuildPhase()
}

function decideRebuildPhase() {
  if (isTempScope.value) {
    if (projectConfig.value?.raw === false) {
      rebuildBlockedMessage.value = '请先上传带有标注信息的NPZ文件'
      rebuildPhase.value = 'blocked'
      return
    }
    if (projectConfig.value?.raw !== 'markednpz') {
      rebuildBlockedMessage.value = '临时三维重建仅支持带有标注信息的NPZ文件'
      rebuildPhase.value = 'blocked'
      return
    }
    rebuildPhase.value = 'confirm'
    return
  }
  if (projectConfig.value?.PD === false) {
    rebuildBlockedMessage.value = '请先进行Ai分析后再进行三维重建'
    rebuildPhase.value = 'blocked'
  } else {
    rebuildPhase.value = 'confirm'
  }
}

function handleRebuildModalUpdate(value: boolean) {
  if (rebuildPhase.value !== 'running') showRebuildModal.value = value
}

function closeRebuildModal() {
  showRebuildModal.value = false
  if (rebuildPhase.value === 'done') {
    refreshModule()
  }
}

async function startRebuild() {
  await loadConfig()
  decideRebuildPhase()
  if (rebuildPhase.value !== 'confirm') return

  rebuildPhase.value = 'running'
  rebuildErrorMessage.value = ''
  try {
    const res = await fetch(`${apiBase.value}/to_3d_model`, {
      method: 'POST',
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `启动三维重建失败：${res.status}`)
    }
    startRebuildPolling()
  } catch (err: any) {
    console.error(err)
    rebuildErrorMessage.value = err?.message || '启动三维重建失败'
    rebuildPhase.value = 'error'
  }
}

function startRebuildPolling() {
  stopRebuildPolling()
  rebuildPollCount.value = 0
  rebuildTimer.value = window.setInterval(async () => {
    rebuildPollCount.value += 1
    await loadConfig()
    await updateTempModelStatus()
    if (isRebuildCompleted()) {
      rebuildPhase.value = 'done'
      stopRebuildPolling()
      return
    }
    if (rebuildPollCount.value >= 240) {
      stopRebuildPolling()
      rebuildErrorMessage.value = '前端已停止轮询：后端长时间未更新 project.json 中的 PD-3d，请检查后端重建任务是否真正启动。'
      rebuildPhase.value = 'error'
    }
  }, 500)
}

function stopRebuildPolling() {
  if (rebuildTimer.value) {
    window.clearInterval(rebuildTimer.value)
    rebuildTimer.value = null
  }
  rebuildPollCount.value = 0
}

function handleDownloadClick() {
  if (projectConfig.value?.raw === 'markednpz') {
    downloadPhase.value = 'select'
    downloadMessage.value = ''
    downloadClosable.value = true
    showDownloadModal.value = true
    return
  }
  downloadModel('ai')
}

function handleDownloadModalUpdate(value: boolean) {
  if (downloadClosable.value) showDownloadModal.value = value
}

async function downloadModel(target: DownloadTarget) {
  const key: ViewerKey = target === 'og' ? 'raw' : 'processed'
  downloadPhase.value = 'running'
  downloadMessage.value = '正在导出模型'
  downloadClosable.value = false
  showDownloadModal.value = true
  try {
    await exportModel(key)
    downloadMessage.value = '导出完成，已开始下载'
    downloadPhase.value = 'done'
    downloadClosable.value = true
  } catch (err) {
    console.error(err)
    downloadMessage.value = '导出失败，请稍后重试'
    downloadPhase.value = 'error'
    downloadClosable.value = true
  }
}

async function exportModel(key: ViewerKey) {
  const viewer = viewers[key]
  if (!viewer || !viewer.model) {
    throw new Error('模型尚未加载')
  }
  const exporter = new GLTFExporter()
  const result = await new Promise<ArrayBuffer | object>((resolve, reject) => {
    exporter.parse(
      viewer.modelGroup,
      (output: ArrayBuffer | object) => resolve(output),
      (event: ErrorEvent) => reject(event.error instanceof Error ? event.error : new Error(event.message || '导出模型失败')),
      { binary: true },
    )
  })
  const blob = result instanceof ArrayBuffer ? new Blob([result], { type: 'model/gltf-binary' }) : new Blob([JSON.stringify(result)], { type: 'application/json' })
  const filename = key === 'raw' ? 'original-model.glb' : 'ai-model.glb'
  triggerBlobDownload(blob, filename)
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

function toggleSyncRotate() {
  syncRotate.value = !syncRotate.value
  if (syncRotate.value && showDual.value) {
    syncViews(lastActiveKey.value)
  }
}

function toggleSyncZoom() {
  syncZoom.value = !syncZoom.value
  if (syncZoom.value && showDual.value) {
    syncViews(lastActiveKey.value)
  }
}

function triggerTempUpload() {
  if (!isTempScope.value || tempUploading.value) return
  tempUploadInput.value?.click()
}

async function handleTempFilesSelected(event: Event) {
  if (!isTempScope.value || tempUploading.value) return
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return

  tempUploading.value = true
  downloadPhase.value = 'running'
  downloadMessage.value = '正在上传并初始化NPZ，请稍候…'
  downloadClosable.value = false
  showDownloadModal.value = true
  try {
    await fetch(`${metaApiBase.value}/uninit`, { method: 'POST' }).catch(() => undefined)
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${apiBase.value}/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error(`上传失败：${file.name}`)
    }
    const initRes = await fetch(`${apiBase.value}/inited`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: 'npz' }),
    })
    if (!initRes.ok) throw new Error('初始化失败')
    await refreshModule()
    downloadPhase.value = 'done'
    downloadMessage.value = '上传完成，已初始化为NPZ序列'
    downloadClosable.value = true
  } catch (err) {
    console.error(err)
    downloadPhase.value = 'error'
    downloadMessage.value = '上传或初始化失败，请稍后重试'
    downloadClosable.value = true
  } finally {
    tempUploading.value = false
  }
}

function openSaveProjectModal() {
  if (!isTempScope.value) return
  saveProjectForm.name = ''
  saveProjectForm.note = ''
  showSaveProjectModal.value = true
}

function handleSaveProjectModalUpdate(value: boolean) {
  if (savingProject.value && !value) return
  showSaveProjectModal.value = value
}

async function confirmSaveProject() {
  const name = saveProjectForm.name.trim()
  if (!name) {
    downloadPhase.value = 'error'
    downloadMessage.value = '请先输入项目名称'
    downloadClosable.value = true
    showDownloadModal.value = true
    return
  }
  savingProject.value = true
  try {
    const project = await convertTempProject(props.uuid, {
      name,
      note: saveProjectForm.note.trim(),
    })
    clearStoredTempUUID()
    showSaveProjectModal.value = false
    await router.push({ name: 'project', params: { uuid: project.uuid } })
  } catch (err) {
    console.error(err)
    downloadPhase.value = 'error'
    downloadMessage.value = '保存项目失败，请稍后重试'
    downloadClosable.value = true
    showDownloadModal.value = true
  } finally {
    savingProject.value = false
  }
}

async function ensureViewer(key: ViewerKey) {
  if (viewers[key]) return
  const canvas = key === 'raw' ? rawCanvas.value : processedCanvas.value
  if (!canvas) return

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio || 1)
  renderer.setClearColor(0xffffff, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000)
  camera.position.set(0, 0, 4)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.autoRotate = viewerStates[key].autoRotate
  controls.autoRotateSpeed = 1
  controls.addEventListener('change', () => handleControlsChange(key))

  const light = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.9)
  scene.add(light)
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(4, 6, 4)
  scene.add(dirLight)

  const gridHelper = new THREE.GridHelper(4, 10, 0x94a3b8, 0xe2e8f0)
  gridHelper.visible = viewerStates[key].showGrid
  scene.add(gridHelper)
  const axesHelper = new THREE.AxesHelper(2)
  axesHelper.visible = viewerStates[key].showAxes
  scene.add(axesHelper)

  const modelGroup = new THREE.Group()
  scene.add(modelGroup)

  const resizeObserver = new ResizeObserver(() => {
    const viewer = viewers[key]
    if (!viewer) return
    if (viewer.resizeFrameId !== null) return
    viewer.resizeFrameId = window.requestAnimationFrame(() => {
      viewer.resizeFrameId = null
      resizeRenderer(key)
    })
  })
  resizeObserver.observe(canvas)

  const context: ViewerContext = {
    renderer,
    scene,
    camera,
    controls,
    modelGroup,
    gridHelper,
    axesHelper,
    center: new THREE.Vector3(0, 0, 0),
    baseDistance: 4,
    model: null,
    animationId: null,
    resizeObserver,
    resizeFrameId: null,
    lastWidth: 0,
    lastHeight: 0,
    syncingZoom: false,
    lastSpherical: new THREE.Spherical(),
  }

  viewers[key] = context
  resizeRenderer(key)
  updateBackground(key)
  startRenderLoop(key)
}

function startRenderLoop(key: ViewerKey) {
  const viewer = viewers[key]
  if (!viewer) return
  const render = () => {
    viewer.controls.autoRotate = viewerStates[key].autoRotate
    viewer.controls.update()
    viewer.renderer.render(viewer.scene, viewer.camera)
    viewer.animationId = window.requestAnimationFrame(render)
  }
  viewer.animationId = window.requestAnimationFrame(render)
}

function resizeRenderer(key: ViewerKey) {
  const viewer = viewers[key]
  if (!viewer) return
  const canvas = viewer.renderer.domElement
  const width = Math.max(1, canvas.clientWidth)
  const height = Math.max(1, canvas.clientHeight)
  if (viewer.lastWidth === width && viewer.lastHeight === height) return
  viewer.lastWidth = width
  viewer.lastHeight = height
  viewer.renderer.setSize(width, height, false)
  viewer.camera.aspect = width / height
  viewer.camera.updateProjectionMatrix()
}

async function loadModel(key: ViewerKey) {
  const viewer = viewers[key]
  if (!viewer) return
  const url = resolveModelUrl(key)
  const arrayBuffer = await fetchArrayBuffer(url)
  const loader = new GLTFLoader()
  const gltf = await new Promise<THREE.Group>((resolve, reject) => {
    loader.parse(
      arrayBuffer,
      '',
      (result: GLTF) => resolve(result.scene),
      (event: ErrorEvent) => reject(event.error instanceof Error ? event.error : new Error(event.message || '解析模型失败')),
    )
  })
  if (viewer.model) {
    viewer.modelGroup.remove(viewer.model)
    disposeObject(viewer.model)
  }
  viewer.model = gltf
  viewer.modelGroup.add(gltf)
  applyWireframe(viewer.model, viewerStates[key].wireframe)
  fitCameraToObject(viewer, gltf)
}

async function fetchArrayBuffer(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('无法获取模型文件')
  return await res.arrayBuffer()
}

function fitCameraToObject(viewer: ViewerContext, object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  const fov = THREE.MathUtils.degToRad(viewer.camera.fov)
  const distance = (maxDim / 2) / Math.tan(fov / 2)
  viewer.baseDistance = Math.max(1, distance * 1.4)
  viewer.center.copy(center)
  viewer.controls.target.copy(center)
  const direction = new THREE.Vector3(0.2, 0.2, 1).normalize()
  viewer.camera.position.copy(center.clone().add(direction.multiplyScalar(viewer.baseDistance)))
  viewer.controls.minDistance = viewer.baseDistance * 0.4
  viewer.controls.maxDistance = viewer.baseDistance * 3
  viewer.controls.update()
  updateStateFromControls(viewer, viewerStates[viewerKeyFromViewer(viewer)])
  viewer.lastSpherical = new THREE.Spherical().setFromVector3(
    viewer.camera.position.clone().sub(viewer.controls.target),
  )
}

function updateStateFromControls(viewer: ViewerContext, state: ViewerState) {
  const offset = viewer.camera.position.clone().sub(viewer.controls.target)
  const spherical = new THREE.Spherical().setFromVector3(offset)
  state.rotationX = spherical.phi
  state.rotationY = spherical.theta
  state.zoom = clampValue(viewer.baseDistance / spherical.radius, 0.4, 3)
}

function viewerKeyFromViewer(viewer: ViewerContext): ViewerKey {
  return viewers.raw === viewer ? 'raw' : 'processed'
}

function handleControlsChange(key: ViewerKey) {
  const viewer = viewers[key]
  if (!viewer) return
  lastActiveKey.value = key
  const offset = viewer.camera.position.clone().sub(viewer.controls.target)
  const spherical = new THREE.Spherical().setFromVector3(offset)
  const zoomChanged = Math.abs(spherical.radius - viewer.lastSpherical.radius) > 0.001
  const rotateChanged =
    Math.abs(spherical.phi - viewer.lastSpherical.phi) > 0.001 ||
    Math.abs(spherical.theta - viewer.lastSpherical.theta) > 0.001
  viewer.lastSpherical = spherical
  updateStateFromControls(viewer, viewerStates[key])
  if (!showDual.value || (!syncRotate.value && !syncZoom.value)) return
  if (syncLock.value) return
  if ((!zoomChanged || !syncZoom.value) && (!rotateChanged || !syncRotate.value)) return
  syncLock.value = true
  const targetKey: ViewerKey = key === 'raw' ? 'processed' : 'raw'
  syncCameraState(key, targetKey, zoomChanged && syncZoom.value, rotateChanged && syncRotate.value)
  syncLock.value = false
}

function syncViews(sourceKey: ViewerKey) {
  const targetKey: ViewerKey = sourceKey === 'raw' ? 'processed' : 'raw'
  if (!showDual.value) return
  syncCameraState(sourceKey, targetKey, syncZoom.value, syncRotate.value)
}

function syncCameraState(sourceKey: ViewerKey, targetKey: ViewerKey, syncZoomValue: boolean, syncRotateValue: boolean) {
  const source = viewers[sourceKey]
  const target = viewers[targetKey]
  if (!source || !target) return
  const sourceOffset = source.camera.position.clone().sub(source.controls.target)
  const targetOffset = target.camera.position.clone().sub(target.controls.target)
  const sourceSpherical = new THREE.Spherical().setFromVector3(sourceOffset)
  const targetSpherical = new THREE.Spherical().setFromVector3(targetOffset)
  const nextSpherical = new THREE.Spherical(
    syncZoomValue ? sourceSpherical.radius : targetSpherical.radius,
    syncRotateValue ? sourceSpherical.phi : targetSpherical.phi,
    syncRotateValue ? sourceSpherical.theta : targetSpherical.theta,
  )
  if (syncRotateValue) {
    target.controls.target.copy(source.controls.target)
  }
  const nextOffset = new THREE.Vector3().setFromSpherical(nextSpherical)
  target.camera.position.copy(target.controls.target.clone().add(nextOffset))
  target.controls.update()
  updateStateFromControls(target, viewerStates[targetKey])
  target.lastSpherical = new THREE.Spherical().setFromVector3(
    target.camera.position.clone().sub(target.controls.target),
  )
}

function updateZoomFromState(key: ViewerKey) {
  const viewer = viewers[key]
  if (!viewer || viewer.syncingZoom) return
  const distance = viewer.baseDistance / clampValue(viewerStates[key].zoom, 0.4, 3)
  const offset = viewer.camera.position.clone().sub(viewer.controls.target)
  const spherical = new THREE.Spherical().setFromVector3(offset)
  spherical.radius = distance
  viewer.syncingZoom = true
  const nextOffset = new THREE.Vector3().setFromSpherical(spherical)
  viewer.camera.position.copy(viewer.controls.target.clone().add(nextOffset))
  viewer.controls.update()
  viewer.syncingZoom = false
  viewer.lastSpherical = new THREE.Spherical().setFromVector3(
    viewer.camera.position.clone().sub(viewer.controls.target),
  )
  if (syncZoom.value && showDual.value && !syncLock.value) {
    syncLock.value = true
    const otherKey: ViewerKey = key === 'raw' ? 'processed' : 'raw'
    viewerStates[otherKey].zoom = viewerStates[key].zoom
    updateZoomFromState(otherKey)
    syncLock.value = false
  }
}

function applyWireframe(object: THREE.Object3D, enabled: boolean) {
  object.traverse((child: THREE.Object3D) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      materials.forEach((material: THREE.Material) => {
        if ('wireframe' in material) {
          ;(material as THREE.MeshStandardMaterial).wireframe = enabled
        }
      })
    }
  })
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child: THREE.Object3D) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      materials.forEach((material: THREE.Material) => material.dispose())
    }
  })
}

function updateBackground(key: ViewerKey) {
  const viewer = viewers[key]
  if (!viewer) return
  const state = viewerStates[key]
  const color = state.background === 'dark' ? 0x0f172a : state.background === 'blue' ? 0x0b2545 : 0xf8fafc
  viewer.scene.background = new THREE.Color(color)
}

function formatZoom(value: number) {
  return `${value.toFixed(2)}x`
}

function formatRotation(state: ViewerState) {
  const x = Math.round((state.rotationX * 180) / Math.PI)
  const y = Math.round((state.rotationY * 180) / Math.PI)
  return `${x}° / ${y}°`
}

function resetView(key: ViewerKey) {
  const viewer = viewers[key]
  if (!viewer) return
  viewer.controls.target.copy(viewer.center)
  const direction = new THREE.Vector3(0.2, 0.2, 1).normalize()
  viewer.camera.position.copy(viewer.center.clone().add(direction.multiplyScalar(viewer.baseDistance)))
  viewer.controls.update()
  updateStateFromControls(viewer, viewerStates[key])
}

function toggleAutoRotate(key: ViewerKey) {
  viewerStates[key].autoRotate = !viewerStates[key].autoRotate
}

function toggleGrid(key: ViewerKey) {
  const viewer = viewers[key]
  if (!viewer) return
  viewerStates[key].showGrid = !viewerStates[key].showGrid
  viewer.gridHelper.visible = viewerStates[key].showGrid
}

function toggleAxes(key: ViewerKey) {
  const viewer = viewers[key]
  if (!viewer) return
  viewerStates[key].showAxes = !viewerStates[key].showAxes
  viewer.axesHelper.visible = viewerStates[key].showAxes
}

function toggleWireframe(key: ViewerKey) {
  const viewer = viewers[key]
  if (!viewer || !viewer.model) return
  viewerStates[key].wireframe = !viewerStates[key].wireframe
  applyWireframe(viewer.model, viewerStates[key].wireframe)
}

function toggleBackground(key: ViewerKey) {
  const state = viewerStates[key]
  state.background = state.background === 'light' ? 'dark' : state.background === 'dark' ? 'blue' : 'light'
  updateBackground(key)
}

function disposeViewer(key: ViewerKey) {
  const viewer = viewers[key]
  if (!viewer) return
  if (viewer.animationId) {
    window.cancelAnimationFrame(viewer.animationId)
  }
  if (viewer.resizeFrameId !== null) {
    window.cancelAnimationFrame(viewer.resizeFrameId)
  }
  viewer.resizeObserver.disconnect()
  viewer.controls.dispose()
  viewer.renderer.dispose()
  if (viewer.model) {
    disposeObject(viewer.model)
  }
  viewers[key] = null
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

onMounted(async () => {
  await refreshModule()
})

watch([has3d, showDual, hasProcessedModel, hasRawModel], async ([nextHas3d, nextDual]) => {
  if (!nextHas3d) return
  await nextTick()
  modelError.value = null
  try {
    await ensureViewer('processed')
    await loadModel('processed')
    if (nextDual) {
      await ensureViewer('raw')
      await loadModel('raw')
    } else {
      disposeViewer('raw')
    }
  } catch (err: any) {
    console.error(err)
    modelError.value = err?.message || '无法解析模型文件'
  }
})

watch(
  () => viewerStates.processed.zoom,
  () => {
    updateZoomFromState('processed')
  },
)

watch(
  () => viewerStates.raw.zoom,
  () => {
    updateZoomFromState('raw')
  },
)

watch(
  () => viewerStates.processed.background,
  () => updateBackground('processed'),
)

watch(
  () => viewerStates.raw.background,
  () => updateBackground('raw'),
)

onBeforeUnmount(() => {
  stopRebuildPolling()
  disposeViewer('processed')
  disposeViewer('raw')
})
</script>

<style scoped>
.module{background:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(2,6,23,0.12)}
.module-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--color-border)}
.module-head h2{margin:0;font-size:16px}
.module-body{padding:16px;display:flex;flex-direction:column;gap:16px}
.state{padding:12px;border-radius:8px;background:#f8fafc;color:#334155}
.state.error{color:#b91c1c;background:#fef2f2}
.recon-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.recon-tip{font-size:12px;color:#64748b}
.recon-display{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;justify-items:start}
.recon-display.dual{grid-template-columns:512px 1fr;gap:16px;align-items:start}
.viewer-card{border:1px solid rgba(148,163,184,0.35);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;background:#fff;max-width:512px;width:100%;box-sizing:border-box;margin:0;justify-self:start}
.viewer-head{display:flex;align-items:center;justify-content:space-between;font-size:13px;color:#1f2937}
.viewer-meta{font-size:12px;color:#64748b}
.viewer-canvas{position:relative;height:280px;border-radius:10px;overflow:hidden;border:1px solid rgba(148,163,184,0.4);max-width:512px;width:100%;box-sizing:border-box;margin:0}
.viewer-canvas canvas{width:100%;height:100%;display:block;cursor:grab;background:#f8fafc;max-width:100%}
.viewer-canvas canvas:active{cursor:grabbing}
.viewer-overlay{position:absolute;left:12px;bottom:10px;display:flex;flex-direction:column;gap:4px;font-size:11px;color:#0f172a;background:rgba(255,255,255,0.72);padding:6px 8px;border-radius:6px}
.recon-controls{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;justify-items:start}
.recon-controls.dual{grid-template-columns:512px 1fr}
.control-card{border-radius:12px;border:1px dashed rgba(148,163,184,0.4);padding:12px;background:#f8fafc;max-width:512px;width:100%;box-sizing:border-box;margin:0;justify-self:start}
.control-title{font-size:13px;color:#1f2937;font-weight:600;margin-bottom:8px}
.control-actions{display:flex;flex-direction:column;gap:10px}
.control-slider{display:flex;align-items:center;gap:10px}
.slider-label{font-size:12px;color:#64748b;min-width:32px}
.modal-card{width:min(92vw,720px);border-radius:12px;box-shadow:0 20px 50px rgba(2,6,23,0.2)}
.modal-title{display:flex;align-items:center;justify-content:space-between;gap:12px}
.modal-body{padding:8px 0 4px}
.modal-tip{font-size:14px;color:#1f2937}
.hidden-input{display:none}
:deep(.n-modal-mask){backdrop-filter:blur(6px);background:rgba(15,23,42,0.35)}
@media (max-width: 900px){
  .recon-display.dual{grid-template-columns:1fr}
  .recon-controls.dual{grid-template-columns:1fr}
}
</style>
