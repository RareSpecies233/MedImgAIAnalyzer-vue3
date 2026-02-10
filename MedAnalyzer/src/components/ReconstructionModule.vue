<template>
  <section class="module">
    <div class="module-head">
      <h2>三维重建</h2>
      <n-tag size="small" type="success" :bordered="false">可用</n-tag>
    </div>
    <div class="module-body">
      <div v-if="errorConfig" class="state error">加载失败：{{ errorConfig }}</div>
      <div v-else-if="modelError" class="state error">模型加载失败：{{ modelError }}</div>

      <div class="recon-top">
        <n-space size="small" align="center">
          <n-button size="small" type="primary" @click="openRebuildModal">
            开始/重新三维重建
          </n-button>
          <span class="recon-tip">【重建会覆盖当前三维结果】</span>
        </n-space>
        <n-space v-if="has3d" size="small" align="center">
          <n-button size="small" @click="toggleSyncRotate">
            {{ syncRotate ? '关闭同步旋转' : '同步旋转' }}
          </n-button>
          <n-button size="small" @click="toggleSyncZoom">
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
              <span>Ai分析影像标注三维显示</span>
              <div class="viewer-meta">{{ processedViewerMeta }}</div>
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
                <n-button size="small" @click="toggleGrid('raw')">
                  {{ viewerStates.raw.showGrid ? '隐藏网格' : '显示网格' }}
                </n-button>
                <n-button size="small" @click="toggleAxes('raw')">
                  {{ viewerStates.raw.showAxes ? '隐藏坐标轴' : '显示坐标轴' }}
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
                <n-button size="small" @click="toggleGrid('processed')">
                  {{ viewerStates.processed.showGrid ? '隐藏网格' : '显示网格' }}
                </n-button>
                <n-button size="small" @click="toggleAxes('processed')">
                  {{ viewerStates.processed.showAxes ? '隐藏坐标轴' : '显示坐标轴' }}
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
                  :max="3"
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
          <div class="modal-tip">请先进行Ai分析后再进行三维重建</div>
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
          <div class="modal-tip">处理失败，请稍后重试</div>
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
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { getProjectJson, type ProjectConfig } from '../api/projects'

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
  syncingZoom: boolean
  lastSpherical: THREE.Spherical
}

const props = defineProps<{ uuid: string }>()

const projectConfig = ref<ProjectConfig | null>(null)
const errorConfig = ref<string | null>(null)
const modelError = ref<string | null>(null)
const showRebuildModal = ref(false)
const rebuildPhase = ref<RebuildPhase>('idle')
const rebuildTimer = ref<number | null>(null)

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

const viewerStates = reactive({
  raw: createViewerState(),
  processed: createViewerState(),
})

const viewers: Record<ViewerKey, ViewerContext | null> = {
  raw: null,
  processed: null,
}

const has3d = computed(() => (projectConfig.value ? projectConfig.value['PD-3d'] !== false : false))
const showDual = computed(() => projectConfig.value?.raw === 'markednpz')
const rawViewerMeta = computed(() => (showDual.value ? '原始标注三维模型' : ''))
const processedViewerMeta = computed(() => (projectConfig.value?.PD ? `Ai分析模式：${projectConfig.value.PD}` : ''))

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
  try {
    projectConfig.value = await getProjectJson(props.uuid)
  } catch (err: any) {
    console.error(err)
    errorConfig.value = err?.message || String(err)
  }
}

async function refreshModule() {
  await loadConfig()
  await nextTick()
  if (!has3d.value) return
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

function openRebuildModal() {
  showRebuildModal.value = true
  if (!projectConfig.value) {
    rebuildPhase.value = 'confirm'
    loadConfig().finally(() => {
      decideRebuildPhase()
    })
    return
  }
  decideRebuildPhase()
}

function decideRebuildPhase() {
  if (projectConfig.value?.PD === false) {
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
  rebuildPhase.value = 'running'
  try {
    await fetch(`/api/project/${props.uuid}/to_3d_model`, {
      method: 'POST',
    })
    startRebuildPolling()
  } catch (err) {
    console.error(err)
    rebuildPhase.value = 'error'
  }
}

function startRebuildPolling() {
  stopRebuildPolling()
  rebuildTimer.value = window.setInterval(async () => {
    await loadConfig()
    if (projectConfig.value?.['PD-3d'] !== false) {
      rebuildPhase.value = 'done'
      stopRebuildPolling()
    }
  }, 500)
}

function stopRebuildPolling() {
  if (rebuildTimer.value) {
    window.clearInterval(rebuildTimer.value)
    rebuildTimer.value = null
  }
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
      (error: Error) => reject(error),
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

  const resizeObserver = new ResizeObserver(() => resizeRenderer(key))
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
  viewer.renderer.setSize(width, height, false)
  viewer.camera.aspect = width / height
  viewer.camera.updateProjectionMatrix()
}

async function loadModel(key: ViewerKey) {
  const viewer = viewers[key]
  if (!viewer) return
  const url = key === 'raw' ? `/api/project/${props.uuid}/download/OG3d` : `/api/project/${props.uuid}/download/3d`
  const arrayBuffer = await fetchArrayBuffer(url)
  const loader = new GLTFLoader()
  const gltf = await new Promise<THREE.Group>((resolve, reject) => {
    loader.parse(
      arrayBuffer,
      '',
      (result: GLTF) => resolve(result.scene),
      (error: Error) => reject(error),
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

watch([has3d, showDual], async ([nextHas3d, nextDual]) => {
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
.recon-display{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
.recon-display.dual{grid-template-columns:repeat(2,minmax(0,1fr))}
.viewer-card{border:1px solid rgba(148,163,184,0.35);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;background:#fff}
.viewer-head{display:flex;align-items:center;justify-content:space-between;font-size:13px;color:#1f2937}
.viewer-meta{font-size:12px;color:#64748b}
.viewer-canvas{position:relative;height:280px;border-radius:10px;overflow:hidden;border:1px solid rgba(148,163,184,0.4)}
.viewer-canvas canvas{width:100%;height:100%;display:block;cursor:grab;background:#f8fafc}
.viewer-canvas canvas:active{cursor:grabbing}
.viewer-overlay{position:absolute;left:12px;bottom:10px;display:flex;flex-direction:column;gap:4px;font-size:11px;color:#0f172a;background:rgba(255,255,255,0.72);padding:6px 8px;border-radius:6px}
.recon-controls{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
.recon-controls.dual{grid-template-columns:repeat(2,minmax(0,1fr))}
.control-card{border-radius:12px;border:1px dashed rgba(148,163,184,0.4);padding:12px;background:#f8fafc}
.control-title{font-size:13px;color:#1f2937;font-weight:600;margin-bottom:8px}
.control-actions{display:flex;flex-direction:column;gap:10px}
.control-slider{display:flex;align-items:center;gap:10px}
.slider-label{font-size:12px;color:#64748b;min-width:32px}
.modal-card{width:min(92vw,720px);border-radius:12px;box-shadow:0 20px 50px rgba(2,6,23,0.2)}
.modal-title{display:flex;align-items:center;justify-content:space-between;gap:12px}
.modal-body{padding:8px 0 4px}
.modal-tip{font-size:14px;color:#1f2937}
:deep(.n-modal-mask){backdrop-filter:blur(6px);background:rgba(15,23,42,0.35)}
@media (max-width: 900px){
  .recon-display.dual{grid-template-columns:1fr}
  .recon-controls.dual{grid-template-columns:1fr}
}
</style>
