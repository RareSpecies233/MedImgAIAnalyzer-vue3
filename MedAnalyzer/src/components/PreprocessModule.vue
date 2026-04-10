<template>
  <section class="module">
    <div class="module-head">
      <h2>预处理</h2>
    </div>
      <div class="module-body">
        <div v-if="errorConfig" class="error">配置加载失败：{{ errorConfig }}</div>
        <div class="layout">
        <div class="viewer">
          <template v-if="loadingConfig">
            <div class="upload-box">正在加载项目配置…</div>
          </template>
          <template v-else-if="initing">
            <div class="upload-box">正在初始化中…</div>
          </template>
          <template v-else-if="rawValue === false">
            <n-button class="upload-box clickable" quaternary @click="openUpload">
              <div class="upload-icon">⬆</div>
              <div>尚未上传文件</div>
            </n-button>
          </template>
          <template v-else>
            <div class="player">
              <div class="slider-label">{{ sliderIndicator }}</div>
              <n-slider
                v-model:value="currentIndex"
                :min="0"
                :max="Math.max(0, pngList.length - 1)"
                :step="1"
                :disabled="pngList.length === 0"
                :show-tooltip="false"
                :tooltip="false"
                class="slider"
              />
              <n-button size="small" secondary :disabled="pngList.length === 0" @click="togglePlay">
                {{ isPlaying ? '暂停' : '播放' }}
              </n-button>
            </div>
            <div class="image-frame">
              <template v-if="pngList.length === 0">
                <div class="upload-box">暂无 PNG 序列</div>
              </template>
              <template v-else>
                <div class="image-canvas" :style="imageTransformStyle">
                  <div class="crop-window" :style="cropWindowStyle">
                    <img class="base-image" :style="cropImageStyle" :src="currentImageUrl" alt="png" />
                    <div v-if="showMarked" class="mark-layer">
                      <img
                        class="mark-image"
                        :style="cropImageStyle"
                        :src="currentMarkedUrl"
                        alt="marked png"
                      />
                    </div>
                  </div>
                  <div v-if="showCropOverlay" class="crop-overlay" :style="cropOverlayStyle"></div>
                </div>
              </template>
            </div>
            <div v-if="showCropHint" class="crop-hint">当前显示裁切过的影像，在裁切图片将所有值设置为【-1】以关闭裁切</div>
          </template>
        </div>

        <div class="actions">
          <template v-if="rawValue === false">
            <p class="note">为初始化，请先上传文件</p>
            <n-button size="small" @click="openUpload">上传文件</n-button>
          </template>

          <template v-else-if="!isCropping">
            <div class="action-module">
              <div class="action-module-head">格式转换</div>
              <div class="action-module-body">
                <n-space vertical :size="10">
                  <n-button size="small" @click="openPngDownloadModal">下载PNG</n-button>
                  <n-button size="small" @click="downloadImmediate('npz')">转换为npz</n-button>
                  <n-button size="small" @click="downloadProcessed('nii')">转换为nii</n-button>
                  <n-button size="small" @click="downloadProcessed('dcm')">转换为dcm</n-button>
                </n-space>
              </div>
            </div>

            <div class="action-module">
              <div class="action-module-head">数据增强</div>
              <div class="action-module-body">
                <n-space vertical :size="10">
                  <n-button size="small" type="primary" :disabled="pngList.length === 0" @click="openEnhanceModal">数据增强</n-button>
                  <n-divider />
                  <n-button size="small" @click="rotateClockwise">旋转（顺时针90度）</n-button>
                  <n-button size="small" @click="enterCrop">裁切图像</n-button>
                  <n-button v-if="canToggleMark" size="small" @click="toggleMark">
                    {{ showMarked ? '关闭标注显示' : '启用标注显示' }}
                  </n-button>
                </n-space>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="crop-controls">
              <div class="crop-row" v-for="field in cropFields" :key="field.key">
                <div class="crop-label">{{ field.label }}</div>
                <n-slider
                  v-model:value="cropDraft[field.key]"
                  :min="-1"
                  :max="511"
                  :step="1"
                  class="crop-slider"
                />
                <n-input-number v-model:value="cropDraft[field.key]" :min="-1" :max="511" size="small" />
              </div>
              <n-space justify="end" align="center">
                <n-button size="small" @click="rotateClockwise">旋转（顺时针90度）</n-button>
                <span class="crop-tip">【-1】为不裁切</span>
                <n-button size="small" tertiary @click="cancelCrop">取消</n-button>
                <n-button size="small" type="primary" :loading="savingCrop" @click="saveCrop">确定</n-button>
              </n-space>
            </div>
          </template>
        </div>
      </div>
    </div>
  </section>

  <n-modal
    v-if="showUploadModal"
    :show="showUploadModal"
    teleported
    :mask-closable="false"
    :close-on-esc="false"
    @update:show="handleUploadModalUpdate"
  >
    <n-card class="modal-card" :bordered="false" role="dialog" aria-labelledby="upload-title">
      <template #header>
        <div class="modal-title">
          <span id="upload-title">上传文件</span>
        </div>
      </template>
      <div class="modal-body">
        <div class="type-row">
          <n-radio-group v-model:value="selectedType" size="small">
            <n-space>
              <n-radio-button value="png">PNG序列</n-radio-button>
              <n-radio-button value="npz">NPZ序列</n-radio-button>
              <n-radio-button value="markednpz">带有标注信息的NPZ序列</n-radio-button>
              <n-radio-button value="nii">NII文件</n-radio-button>
              <n-radio-button value="dcm">DCM序列</n-radio-button>
            </n-space>
          </n-radio-group>
        </div>
        <p class="hint">【只有带有标注信息的NPZ序列才能使用Ai推理与人工标注的比较功能】</p>
        <div class="upload-row">
          <n-button size="small" type="primary" @click="triggerFilePicker" :disabled="uploading">上传文件</n-button>
        </div>
        <input
          ref="fileInput"
          type="file"
          class="hidden-input"
          :accept="fileAccept"
          multiple
          @change="handleFilesSelected"
        />

        <div class="file-list" v-if="uploads.length">
          <div v-for="item in uploads" :key="item.id" class="file-item">
            <div class="file-name" :title="item.name">{{ item.name }}</div>
            <div class="file-status">{{ item.statusLabel }}</div>
            <div class="file-progress">
              <n-progress v-if="item.status !== 'queued'" type="line" :percentage="item.progress" :show-indicator="false" />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button tertiary @click="cancelUpload">取消</n-button>
          <n-button type="primary" :disabled="!canConfirmUpload" @click="showConfirmModal = true">确定</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>

  <n-modal
    v-if="showConfirmModal"
    :show="showConfirmModal"
    teleported
    :mask-closable="false"
    :close-on-esc="false"
    @update:show="(v: boolean) => (showConfirmModal = v)"
  >
    <n-card class="modal-card" :bordered="false" role="dialog" aria-labelledby="confirm-title">
      <template #header>
        <div class="modal-title">
          <span id="confirm-title">确定？</span>
        </div>
      </template>
      <div class="modal-body">
        每个项目仅可初始化一次，请务必确定全部上传完后再点击确定，否则需要重新新建项目<br>（初始化需要一段时间，请耐心等待）
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button tertiary :disabled="confirming" @click="showConfirmModal = false">返回</n-button>
          <n-button type="primary" :loading="confirming" @click="confirmInit">确定</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>

  <n-modal
    v-if="showEnhanceModal"
    :show="showEnhanceModal"
    teleported
    :mask-closable="enhancePhase !== 'processing'"
    :close-on-esc="enhancePhase !== 'processing'"
    @update:show="handleEnhanceModalUpdate"
  >
    <n-card class="enhance-modal-card" :bordered="false" role="dialog" aria-labelledby="enhance-title">
      <template #header>
        <div class="modal-title">
          <span id="enhance-title">高级数据增强</span>
        </div>
      </template>
      <div class="enhance-layout">
        <div class="enhance-preview-panel">
          <div class="enhance-note">数据为Float64格式，前端无法完整显示细节，仅供参考，最终以后端处理结果为准</div>
          <div class="enhance-player">
            <div class="slider-label">{{ enhanceSliderIndicator }}</div>
            <n-slider
              v-model:value="currentIndex"
              :min="0"
              :max="Math.max(0, pngList.length - 1)"
              :step="1"
              :disabled="pngList.length === 0"
              :show-tooltip="false"
              :tooltip="false"
              class="slider"
            />
            <n-button size="small" secondary :disabled="pngList.length === 0" @click="togglePlay">
              {{ isPlaying ? '暂停' : '播放' }}
            </n-button>
          </div>
          <div class="enhance-preview-frame">
            <template v-if="!currentImageUrl">
              <div class="upload-box">暂无 PNG 序列</div>
            </template>
            <template v-else>
              <div class="enhance-preview-window">
                <div class="enhance-preview-fit" :style="enhancePreviewFitStyle">
                  <div class="enhance-preview-crop" :style="enhancePreviewCropStyle">
                    <div class="enhance-preview-stage" :style="enhancePreviewStageStyle">
                      <img
                        class="enhance-preview-image"
                        :style="enhancePreviewImageStyle"
                        :src="currentImageUrl"
                        alt="增强预览"
                        draggable="false"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <div class="enhance-control-panel">
          <template v-if="enhancePhase === 'config' || enhancePhase === 'error'">
            <div v-if="enhancePhase === 'error' && enhanceError" class="error">增强失败：{{ enhanceError }}</div>

            <div class="enhance-row">
              <div class="enhance-label">缩放</div>
              <n-slider v-model:value="enhanceForm.scale" :min="0.25" :max="4" :step="0.05" class="enhance-slider" />
              <n-input-number v-model:value="enhanceForm.scale" :min="0.25" :max="4" :step="0.05" size="small" />
            </div>

            <div class="enhance-row">
              <div class="enhance-label">旋转</div>
              <n-slider v-model:value="enhanceForm.rotate" :min="-180" :max="180" :step="1" class="enhance-slider" />
              <n-input-number v-model:value="enhanceForm.rotate" :min="-180" :max="180" :step="1" size="small" />
            </div>

            <div class="enhance-row enhance-row--four">
              <div class="enhance-label">裁切</div>
              <div class="enhance-crop-grid">
                <div class="enhance-crop-item">
                  <span>X</span>
                  <n-slider v-model:value="enhanceForm.cropX" :min="0" :max="511" :step="1" class="enhance-crop-slider" />
                  <n-input-number v-model:value="enhanceForm.cropX" :min="0" :max="511" size="small" />
                </div>
                <div class="enhance-crop-item">
                  <span>Y</span>
                  <n-slider v-model:value="enhanceForm.cropY" :min="0" :max="511" :step="1" class="enhance-crop-slider" />
                  <n-input-number v-model:value="enhanceForm.cropY" :min="0" :max="511" size="small" />
                </div>
                <div class="enhance-crop-item">
                  <span>宽</span>
                  <n-slider v-model:value="enhanceForm.cropW" :min="1" :max="enhanceCropWMax" :step="1" class="enhance-crop-slider" />
                  <n-input-number v-model:value="enhanceForm.cropW" :min="1" :max="enhanceCropWMax" size="small" />
                </div>
                <div class="enhance-crop-item">
                  <span>高</span>
                  <n-slider v-model:value="enhanceForm.cropH" :min="1" :max="enhanceCropHMax" :step="1" class="enhance-crop-slider" />
                  <n-input-number v-model:value="enhanceForm.cropH" :min="1" :max="enhanceCropHMax" size="small" />
                </div>
              </div>
            </div>

            <div class="enhance-row">
              <div class="enhance-label">对比度调整</div>
              <n-slider v-model:value="enhanceForm.contrast" :min="0.2" :max="3" :step="0.05" class="enhance-slider" />
              <n-input-number v-model:value="enhanceForm.contrast" :min="0.2" :max="3" :step="0.05" size="small" />
            </div>

            <div class="enhance-row">
              <div class="enhance-label">伽马调整</div>
              <n-slider v-model:value="enhanceForm.gamma" :min="0.2" :max="3" :step="0.05" class="enhance-slider" />
              <n-input-number v-model:value="enhanceForm.gamma" :min="0.2" :max="3" :step="0.05" size="small" />
            </div>

            <div class="enhance-switch-row">
              <span>是否保持原分辨率</span>
              <n-switch v-model:value="enhanceForm.preserveResolution" />
            </div>

            <n-space justify="end">
              <n-button size="small" tertiary @click="showEnhanceModal = false">关闭</n-button>
              <n-button size="small" type="primary" @click="applyEnhancement">应用增强</n-button>
            </n-space>
          </template>

          <template v-else-if="enhancePhase === 'processing'">
            <div class="enhance-status">
              <div class="enhance-status-title">正在处理中</div>
              <div class="enhance-status-desc">正在向后端提交数据增强请求，请稍候…（数据量较大时需要较长时间，请耐心等待）</div>
            </div>
          </template>

          <template v-else>
            <div class="enhance-status">
              <div class="enhance-status-title">处理完成</div>
              <div class="enhance-status-desc">本次已处理 {{ enhanceProcessedCount ?? 0 }} 个文件。</div>
            </div>
            <div class="enhance-downloads">
              <n-space vertical :size="10">
                <n-button size="small" @click="downloadEnhancementResult('npz')">下载NPZ</n-button>
                <n-button size="small" @click="downloadEnhancementResult('dcm')">下载DCM</n-button>
                <n-button size="small" @click="downloadEnhancementResult('nii')">下载NII</n-button>
                <n-button size="small" @click="downloadEnhancementResult('png')">下载PNG</n-button>
                <n-button size="small" :disabled="!canDownloadMarkedPng" @click="downloadEnhancementResult('markedpng')">下载标注层PNG</n-button>
                <n-button size="small" :disabled="!canDownloadMarkedPng" @click="downloadEnhancementResult('fused')">下载带有标注的PNG</n-button>
              </n-space>
            </div>
            <n-space justify="end">
              <n-button size="small" tertiary @click="resetEnhancePhase">返回调整</n-button>
              <n-button size="small" type="primary" @click="showEnhanceModal = false">完成</n-button>
            </n-space>
          </template>
        </div>
      </div>
    </n-card>
  </n-modal>

  <n-modal
    v-if="showPngDownloadModal"
    :show="showPngDownloadModal"
    teleported
    :mask-closable="true"
    :close-on-esc="true"
    @update:show="(value: boolean) => (showPngDownloadModal = value)"
  >
    <n-card class="modal-card" :bordered="false" role="dialog" aria-labelledby="png-download-title">
      <template #header>
        <div class="modal-title">
          <span id="png-download-title">选择 PNG 下载内容</span>
        </div>
      </template>
      <div class="modal-body">
        <n-space vertical :size="10">
          <n-button size="small"  @click="downloadPngVariant('image')">
            下载影像PNG文件
          </n-button>
          <n-button size="small" :disabled="!canDownloadMarkedPng" @click="downloadPngVariant('marked')">
            下载标注PNG
          </n-button>
          <n-button size="small" :disabled="!canDownloadMarkedPng" @click="downloadPngVariant('fused')">
            下载带标注的影像PNG
          </n-button>
        </n-space>
        <div v-if="!canDownloadMarkedPng" class="download-hint">当前项目无标注数据，仅可下载影像 PNG。</div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button size="small" tertiary @click="showPngDownloadModal = false">关闭</n-button>
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
          <n-button v-if="downloadClosable" tertiary @click="showDownloadModal = false">关闭</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { getProjectJson, type ProjectConfig, type ProjectScope } from '../api/projects'

type UploadStatus = 'queued' | 'uploading' | 'done' | 'error'
type UploadItem = {
  id: string
  name: string
  size: number
  file: File
  status: UploadStatus
  progress: number
  statusLabel: string
}

type CropValues = {
  'semi-xL': number
  'semi-xR': number
  'semi-yL': number
  'semi-yR': number
}

type EnhancePhase = 'config' | 'processing' | 'done' | 'error'
type EnhanceDownloadType = 'npz' | 'dcm' | 'nii' | 'png' | 'markedpng' | 'fused'

const props = withDefaults(
  defineProps<{ uuid: string; scope?: ProjectScope; externalTools?: boolean }>(),
  { scope: 'project' },
)

const apiBase = computed(() =>
  props.scope === 'temp' ? `/api/temp/${props.uuid}` : `/api/project/${props.uuid}`,
)
const metaApiBase = computed(() =>
  props.scope === 'temp' ? `/api/temp/${props.uuid}` : `/api/projects/${props.uuid}`,
)

const projectConfig = ref<ProjectConfig | null>(null)
const loadingConfig = ref(true)
const errorConfig = ref<string | null>(null)
const pngList = ref<string[]>([])
const markedList = ref<string[]>([])
const currentIndex = ref(0)
const isPlaying = ref(false)
const playTimer = ref<number | null>(null)
const showUploadModal = ref(false)
const showConfirmModal = ref(false)
const confirming = ref(false)
const initing = ref(false)
const selectedType = ref<'png' | 'npz' | 'markednpz' | 'nii' | 'dcm'>('png')
const uploads = ref<UploadItem[]>([])
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const showDownloadModal = ref(false)
const downloadMessage = ref('')
const downloadClosable = ref(true)
const showPngDownloadModal = ref(false)
const showEnhanceModal = ref(false)
const isCropping = ref(false)
const savingCrop = ref(false)
const showMarked = ref(false)
const pollingTimer = ref<number | null>(null)
const currentImageUrl = ref('')
const currentMarkedUrl = ref('')
const pngCache = new Map<string, string>()
const markedCache = new Map<string, string>()
const imageRotation = ref(90)
const enhancePhase = ref<EnhancePhase>('config')
const enhanceError = ref('')
const enhanceProcessedCount = ref<number | null>(null)

const enhanceForm = reactive({
  scale: 1,
  rotate: -90,
  cropX: 0,
  cropY: 0,
  cropW: 512,
  cropH: 512,
  contrast: 1,
  gamma: 1,
  preserveResolution: false,
})

const cropDraft = reactive<CropValues>({
  'semi-xL': -1,
  'semi-xR': -1,
  'semi-yL': -1,
  'semi-yR': -1,
})

const cropFields: Array<{ key: keyof CropValues; label: string }> = [
  { key: 'semi-xL', label: '左侧' },
  { key: 'semi-xR', label: '右侧' },
  { key: 'semi-yL', label: '上侧' },
  { key: 'semi-yR', label: '下侧' },
]

const rawValue = computed(() => projectConfig.value?.raw ?? false)
const canToggleMark = computed(() => rawValue.value === 'markednpz')
const canDownloadMarkedPng = computed(() => rawValue.value === 'markednpz')
const showCropHint = computed(() =>
  !isCropping.value && projectConfig.value ? projectConfig.value.semi === true : false,
)

const fileAccept = computed(() => {
  if (selectedType.value === 'png') return '.png'
  if (selectedType.value === 'npz' || selectedType.value === 'markednpz') return '.npz'
  if (selectedType.value === 'nii') return '.nii,.nii.gz'
  return '.dcm'
})

const canConfirmUpload = computed(() =>
  uploads.value.length > 0 && uploads.value.every((item) => item.status === 'done'),
)

const sliderIndicator = computed(() => {
  if (!pngList.value.length) return '0 / 0'
  return `${currentIndex.value + 1} / ${pngList.value.length}`
})

const enhanceSliderIndicator = computed(() => {
  if (!pngList.value.length) return '0 / 0'
  return `${currentIndex.value + 1} / ${pngList.value.length}`
})

const isSemiActive = computed(() => (projectConfig.value ? projectConfig.value.semi !== false : false))
const isCropApplied = computed(() => !isCropping.value && isSemiActive.value)

const showCropOverlay = computed(() => isCropping.value)
const imageTransformStyle = computed(() => ({
  transform: `rotate(${imageRotation.value}deg)`,
}))

const enhanceCropBounds = computed(() => {
  const cropX = clampPlainValue(enhanceForm.cropX, 0, 511)
  const cropY = clampPlainValue(enhanceForm.cropY, 0, 511)
  const maxW = Math.max(1, 512 - cropX)
  const maxH = Math.max(1, 512 - cropY)
  const cropW = clampPlainValue(enhanceForm.cropW, 1, maxW)
  const cropH = clampPlainValue(enhanceForm.cropH, 1, maxH)
  return { cropX, cropY, cropW, cropH }
})

const enhanceCropWMax = computed(() => Math.max(1, 512 - clampPlainValue(enhanceForm.cropX, 0, 511)))
const enhanceCropHMax = computed(() => Math.max(1, 512 - clampPlainValue(enhanceForm.cropY, 0, 511)))

const enhancePreviewFitStyle = computed(() => {
  const { cropW, cropH } = enhanceCropBounds.value
  const scale = Math.min(512 / cropW, 512 / cropH)
  return {
    transform: `scale(${scale})`,
  }
})

const enhancePreviewCropStyle = computed(() => {
  const { cropW, cropH } = enhanceCropBounds.value
  return {
    width: `${cropW}px`,
    height: `${cropH}px`,
  }
})

const enhancePreviewStageStyle = computed(() => {
  const { cropX, cropY, cropW, cropH } = enhanceCropBounds.value
  const scale = clampPlainValue(enhanceForm.scale, 0.25, 4)
  const rotate = -clampPlainValue(enhanceForm.rotate, -180, 180)
  const translateX = 256 - (cropX + cropW / 2)
  const translateY = 256 - (cropY + cropH / 2)
  return {
    transform: `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
    transformOrigin: '256px 256px',
  }
})

const enhancePreviewImageStyle = computed(() => {
  const gamma = clampPlainValue(enhanceForm.gamma, 0.2, 3)
  const contrast = clampPlainValue(enhanceForm.contrast, 0.2, 3)
  return {
    filter: `contrast(${contrast}) brightness(${1 / gamma})`,
  }
})

function getActiveCropValues(): CropValues {
  const config = projectConfig.value
  return isCropping.value
    ? cropDraft
    : {
        'semi-xL': config?.['semi-xL'] ?? -1,
        'semi-xR': config?.['semi-xR'] ?? -1,
        'semi-yL': config?.['semi-yL'] ?? -1,
        'semi-yR': config?.['semi-yR'] ?? -1,
      }
}

function normalizeCrop(values: CropValues) {
  const size = 512
  const left = clampValue(values['semi-xL'], 0, size)
  const top = clampValue(values['semi-yL'], 0, size)
  const rightEdge = values['semi-xR'] === -1 ? size : clampValue(values['semi-xR'], 0, size)
  const bottomEdge = values['semi-yR'] === -1 ? size : clampValue(values['semi-yR'], 0, size)
  const width = Math.max(0, rightEdge - left)
  const height = Math.max(0, bottomEdge - top)
  return { left, top, width, height, rightEdge, bottomEdge }
}

const cropOverlayStyle = computed(() => {
  const { left, top, rightEdge, bottomEdge } = normalizeCrop(getActiveCropValues())
  const size = 512
  const right = Math.max(0, size - rightEdge)
  const bottom = Math.max(0, size - bottomEdge)
  return {
    left: `${left}px`,
    top: `${top}px`,
    right: `${right}px`,
    bottom: `${bottom}px`,
  }
})

const cropWindowStyle = computed(() => {
  if (isCropping.value) {
    return { width: '100%', height: '100%' }
  }
  if (isCropApplied.value) {
    const { width, height } = normalizeCrop(getActiveCropValues())
    return {
      width: `${Math.max(1, width)}px`,
      height: `${Math.max(1, height)}px`,
    }
  }
  return { width: '100%', height: '100%' }
})

const cropImageStyle = computed(() => {
  if (isCropping.value) return {}
  if (!isCropApplied.value) return {}
  const { left, top } = normalizeCrop(getActiveCropValues())
  return {
    transform: `translate(${-left}px, ${-top}px)`,
  }
})

function clampValue(value: number, min: number, max: number) {
  if (value === -1) return 0
  return Math.min(Math.max(value, min), max)
}

function clampPlainValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}


function buildPngUrl(filename: string) {
  return `${apiBase.value}/png/${filename}`
}

function buildMarkedUrl(filename: string) {
  return `${apiBase.value}/markedpng/${filename}`
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

async function updateCurrentImages() {
  if (!pngList.value.length) {
    currentImageUrl.value = ''
    currentMarkedUrl.value = ''
    return
  }
  const filename = pngList.value[currentIndex.value]
  if (!filename) return
  try {
    currentImageUrl.value = await ensureCachedUrl(pngCache, filename, buildPngUrl(filename))
  } catch (err) {
    console.error(err)
    currentImageUrl.value = buildPngUrl(filename)
  }

  if (canToggleMark.value && showMarked.value) {
    if (!markedList.value.length) {
      await loadMarkedList()
    }
    const markedFilename = markedList.value[currentIndex.value] || filename
    try {
      currentMarkedUrl.value = await ensureCachedUrl(
        markedCache,
        markedFilename,
        buildMarkedUrl(markedFilename),
      )
    } catch (err) {
      console.error(err)
      currentMarkedUrl.value = buildMarkedUrl(markedFilename)
    }
  } else {
    currentMarkedUrl.value = ''
  }
}

function revokeCache(cache: Map<string, string>) {
  for (const url of cache.values()) {
    URL.revokeObjectURL(url)
  }
  cache.clear()
}

async function loadConfig() {
  loadingConfig.value = true
  errorConfig.value = null
  try {
    projectConfig.value = await getProjectJson(props.uuid, props.scope)
  } catch (err: any) {
    console.error(err)
    errorConfig.value = err?.message || String(err)
  } finally {
    loadingConfig.value = false
  }
}

async function loadPngList() {
  try {
    const res = await fetch(`${apiBase.value}/png`)
    if (!res.ok) throw new Error('无法获取 PNG 列表')
    pngList.value = (await res.json()) as string[]
    if (currentIndex.value >= pngList.value.length) currentIndex.value = 0
  } catch (err) {
    console.error(err)
    pngList.value = []
  }
}

async function loadMarkedList() {
  try {
    const res = await fetch(`${apiBase.value}/markedpng`)
    if (!res.ok) throw new Error('无法获取标注 PNG 列表')
    markedList.value = (await res.json()) as string[]
  } catch (err) {
    console.error(err)
    markedList.value = []
  }
}

function openUpload() {
  showUploadModal.value = true
}

function handleUploadModalUpdate(value: boolean) {
  showUploadModal.value = value
  if (!value) resetUploadState()
}

function resetUploadState() {
  uploads.value = []
  uploading.value = false
  selectedType.value = 'png'
}

function triggerFilePicker() {
  fileInput.value?.click()
}

function handleFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const files = Array.from(input.files)
  input.value = ''
  addUploads(files)
}

function addUploads(files: File[]) {
  const items = files.map((file) => ({
    id: `${file.name}-${Date.now()}-${Math.random()}`,
    name: file.name,
    size: file.size,
    file,
    status: 'queued' as UploadStatus,
    progress: 0,
    statusLabel: '等待上传',
  }))
  uploads.value = [...uploads.value, ...items]
  uploadQueue()
}

async function uploadQueue() {
  if (uploading.value) return
  uploading.value = true
  for (const item of uploads.value) {
    if (item.status !== 'queued') continue
    await uploadSingle(item)
  }
  uploading.value = false
}

function uploadSingle(item: UploadItem) {
  item.status = 'uploading'
  item.statusLabel = '上传中'
  item.progress = 0
  return new Promise<void>((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${apiBase.value}/upload`)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        item.progress = Math.round((event.loaded / event.total) * 100)
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        item.status = 'done'
        item.statusLabel = '上传完成'
        item.progress = 100
      } else {
        item.status = 'error'
        item.statusLabel = '上传失败'
      }
      resolve()
    }
    xhr.onerror = () => {
      item.status = 'error'
      item.statusLabel = '上传失败'
      resolve()
    }
    const formData = new FormData()
    formData.append('file', item.file)
    xhr.send(formData)
  })
}

async function cancelUpload() {
  try {
    await fetch(`${metaApiBase.value}/uninit`, { method: 'POST' })
  } catch (err) {
    console.error(err)
  } finally {
    showUploadModal.value = false
    resetUploadState()
    await loadConfig()
    if (rawValue.value !== false) {
      await loadPngList()
    } else {
      pngList.value = []
      currentIndex.value = 0
    }
  }
}

async function confirmInit() {
  confirming.value = true
  try {
    await fetch(`${apiBase.value}/inited`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: selectedType.value }),
    })
    showConfirmModal.value = false
    showUploadModal.value = false
    initing.value = true
    startPollingRaw()
  } catch (err) {
    console.error(err)
  } finally {
    confirming.value = false
  }
}

function startPollingRaw() {
  stopPolling()
  pollingTimer.value = window.setInterval(async () => {
    await loadConfig()
    if (projectConfig.value && projectConfig.value.raw !== false) {
      initing.value = false
      stopPolling()
      await loadPngList()
    }
  }, 1200)
}

function stopPolling() {
  if (pollingTimer.value) {
    window.clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

function togglePlay() {
  if (isPlaying.value) {
    stopPlay()
  } else {
    startPlay()
  }
}

function startPlay() {
  if (pngList.value.length === 0) return
  isPlaying.value = true
  stopPlayTimer()
  playTimer.value = window.setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % pngList.value.length
  }, 50)
}

function stopPlay() {
  isPlaying.value = false
  stopPlayTimer()
}

function stopPlayTimer() {
  if (playTimer.value) {
    window.clearInterval(playTimer.value)
    playTimer.value = null
  }
}

function toggleMark() {
  showMarked.value = !showMarked.value
}

function rotateClockwise() {
  imageRotation.value = (imageRotation.value + 90) % 360
}

function enterCrop() {
  isCropping.value = true
  const config = projectConfig.value
  cropDraft['semi-xL'] = config?.['semi-xL'] ?? -1
  cropDraft['semi-xR'] = config?.['semi-xR'] ?? -1
  cropDraft['semi-yL'] = config?.['semi-yL'] ?? -1
  cropDraft['semi-yR'] = config?.['semi-yR'] ?? -1
}

function cancelCrop() {
  isCropping.value = false
}

async function saveCrop() {
  savingCrop.value = true
  try {
    const nextSemi =
      cropDraft['semi-xL'] !== -1 ||
      cropDraft['semi-xR'] !== -1 ||
      cropDraft['semi-yL'] !== -1 ||
      cropDraft['semi-yR'] !== -1
    await fetch(`${metaApiBase.value}/semi`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'semi-xL': cropDraft['semi-xL'],
        'semi-xR': cropDraft['semi-xR'],
        'semi-yL': cropDraft['semi-yL'],
        'semi-yR': cropDraft['semi-yR'],
      }),
    })
    projectConfig.value = {
      ...(projectConfig.value || {}),
      semi: nextSemi,
      'semi-xL': cropDraft['semi-xL'],
      'semi-xR': cropDraft['semi-xR'],
      'semi-yL': cropDraft['semi-yL'],
      'semi-yR': cropDraft['semi-yR'],
    } as ProjectConfig
    isCropping.value = false
  } catch (err) {
    console.error(err)
  } finally {
    savingCrop.value = false
  }
}

function handleDownloadModalUpdate(value: boolean) {
  if (downloadClosable.value) showDownloadModal.value = value
}

function openEnhanceModal() {
  resetEnhanceForm()
  resetEnhancePhase()
  showEnhanceModal.value = true
}

function handleEnhanceModalUpdate(value: boolean) {
  if (enhancePhase.value === 'processing' && !value) return
  showEnhanceModal.value = value
  if (!value) {
    resetEnhanceForm()
    resetEnhancePhase()
  }
}

function resetEnhanceForm() {
  enhanceForm.scale = 1
  enhanceForm.rotate = -90
  enhanceForm.cropX = 0
  enhanceForm.cropY = 0
  enhanceForm.cropW = 512
  enhanceForm.cropH = 512
  enhanceForm.contrast = 1
  enhanceForm.gamma = 1
  enhanceForm.preserveResolution = false
}

function resetEnhancePhase() {
  enhancePhase.value = 'config'
  enhanceError.value = ''
  enhanceProcessedCount.value = null
}

async function applyEnhancement() {
  enhancePhase.value = 'processing'
  enhanceError.value = ''
  enhanceProcessedCount.value = null

  const { cropX, cropY, cropW, cropH } = enhanceCropBounds.value

  try {
    const res = await fetch(`${apiBase.value}/start_enhdb`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'scale-x': clampPlainValue(enhanceForm.scale, 0.25, 4),
        'scale-y': clampPlainValue(enhanceForm.scale, 0.25, 4),
        rotate: clampPlainValue(enhanceForm.rotate, -180, 180),
        'crop-x': cropX,
        'crop-y': cropY,
        'crop-w': cropW,
        'crop-h': cropH,
        contrast: clampPlainValue(enhanceForm.contrast, 0.2, 3),
        gamma: clampPlainValue(enhanceForm.gamma, 0.2, 3),
        'preserve-resolution': enhanceForm.preserveResolution,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `请求失败：${res.status}`)
    }

    const payload = (await res.json().catch(() => ({}))) as { processed?: number }
    enhanceProcessedCount.value = payload.processed ?? 0
    enhancePhase.value = 'done'
  } catch (err: any) {
    console.error(err)
    enhanceError.value = err?.message || String(err)
    enhancePhase.value = 'error'
  }
}

async function downloadEnhancementResult(type: EnhanceDownloadType) {
  if ((type === 'markedpng' || type === 'fused') && !canDownloadMarkedPng.value) {
    return
  }

  const urlMap: Record<EnhanceDownloadType, string> = {
    npz: `${apiBase.value}/download/enhdb/npz`,
    dcm: `${apiBase.value}/download/enhdb/dcm`,
    nii: `${apiBase.value}/download/enhdb/nii`,
    png: `${apiBase.value}/download/enhdb/png`,
    markedpng: `${apiBase.value}/download/enhdb/markedpng`,
    fused: `${apiBase.value}/download/enhdb/fused/png`,
  }

  downloadMessage.value = '正在准备下载文件（数据量较大时需要较长时间，请耐心等待）'
  downloadClosable.value = false
  showDownloadModal.value = true
  try {
    await triggerDownload(urlMap[type])
    downloadMessage.value = '下载已开始'
    downloadClosable.value = true
  } catch (err) {
    console.error(err)
    downloadMessage.value = '下载失败，请稍后重试'
    downloadClosable.value = true
  }
}

function openPngDownloadModal() {
  showPngDownloadModal.value = true
}

async function downloadPngVariant(type: 'image' | 'marked' | 'fused') {
  const url =
    type === 'image'
      ? `${apiBase.value}/download/png`
      : type === 'marked'
        ? `${apiBase.value}/download/markedpng`
        : `${apiBase.value}/download/fused/png`
  if (type !== 'image' && !canDownloadMarkedPng.value) {
    return
  }
  showPngDownloadModal.value = false
  downloadMessage.value = '正在准备下载文件（数据量较大时需要较长时间，请耐心等待）'
  downloadClosable.value = false
  showDownloadModal.value = true
  try {
    await triggerDownload(url)
    downloadMessage.value = '处理完成，已开始下载'
    downloadClosable.value = true
  } catch (err) {
    console.error(err)
    downloadMessage.value = '下载失败，请稍后重试'
    downloadClosable.value = true
  }
}

async function downloadImmediate(type: 'png' | 'npz') {
  downloadMessage.value = '转换完成，已开始下载'
  downloadClosable.value = true
  showDownloadModal.value = true
  try {
    await triggerDownload(`${apiBase.value}/download/${type}`)
  } catch (err) {
    console.error(err)
    downloadMessage.value = '转换失败，请稍后重试'
  }
}

async function downloadProcessed(type: 'nii' | 'dcm') {
  downloadMessage.value = '正在处理转换中（数据量较大时需要较长时间，请耐心等待）'
  downloadClosable.value = false
  showDownloadModal.value = true
  try {
    await triggerDownload(`${apiBase.value}/download/${type}`)
    downloadMessage.value = '转换完成，已开始下载'
    downloadClosable.value = true
  } catch (err) {
    console.error(err)
    downloadMessage.value = '转换失败，请稍后重试'
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

onMounted(async () => {
  await loadConfig()
  if (rawValue.value !== false) {
    await loadPngList()
  }
})

watch(rawValue, (next) => {
  if (next !== false) loadPngList()
  if (next !== 'markednpz') {
    showMarked.value = false
    markedList.value = []
  }
})

watch(pngList, (list) => {
  if (list.length === 0) stopPlay()
  revokeCache(pngCache)
  revokeCache(markedCache)
  updateCurrentImages()
})

watch([currentIndex, showMarked], () => {
  updateCurrentImages()
})

watch(showMarked, (next) => {
  if (next && canToggleMark.value) {
    loadMarkedList().then(() => updateCurrentImages())
  }
})

onBeforeUnmount(() => {
  stopPlayTimer()
  stopPolling()
  revokeCache(pngCache)
  revokeCache(markedCache)
})
</script>

<style scoped>
.module{background:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(2,6,23,0.12)}
.module-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--color-border)}
.module-head h2{margin:0;font-size:16px}
.module-body{padding:16px}
.error{padding:10px 12px;margin-bottom:12px;border-radius:8px;background:#fef2f2;color:#b91c1c;font-size:13px}
.layout{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}
.viewer{display:flex;flex-direction:column;gap:10px}
.actions{width:300px;flex:0 0 300px;display:flex;flex-direction:column;gap:12px}
.upload-box{width:512px;height:512px;border:1px dashed var(--color-border);border-radius:12px;background:#f8fafc;color:#64748b;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:14px}
.upload-box.clickable{cursor:pointer}
.upload-icon{font-size:30px}
.image-frame{width:512px;height:512px;border-radius:12px;overflow:hidden;background:#0f172a;position:relative;display:flex;align-items:center;justify-content:center}
.image-canvas{width:512px;height:512px;position:relative;display:flex;align-items:center;justify-content:center;transform-origin:center center}
.base-image{width:512px;height:512px;object-fit:contain;display:block}
.mark-layer{position:absolute;inset:0;pointer-events:none}
.mark-image{width:512px;height:512px;object-fit:contain;display:block}
.crop-window{position:relative;overflow:hidden;display:flex;align-items:flex-start;justify-content:flex-start}
.crop-overlay{position:absolute;border:2px solid #38bdf8;box-shadow:0 0 0 9999px rgba(15,23,42,0.55);pointer-events:none}
.player{display:flex;align-items:center;gap:10px;margin-left:-8px}
.slider-label{min-width:48px;font-size:12px;color:#64748b;text-align:right}
.slider{width:420px}
.crop-hint{font-size:16px;color:#ff0000}
.note{color:#64748b;font-size:13px}
.crop-controls{display:flex;flex-direction:column;gap:12px}
.crop-row{display:grid;grid-template-columns:80px 1fr 120px;gap:10px;align-items:center}
.crop-label{font-size:13px;color:#475569}
.crop-tip{font-size:12px;color:#64748b}
.modal-card{width:min(92vw,640px);border-radius:12px;box-shadow:0 20px 50px rgba(2,6,23,0.2)}
.enhance-modal-card{width:min(96vw,1180px);border-radius:12px;box-shadow:0 20px 50px rgba(2,6,23,0.2)}
.modal-title{display:flex;align-items:center;justify-content:space-between}
.modal-body{display:flex;flex-direction:column;gap:12px}
.enhance-layout{display:grid;grid-template-columns:540px minmax(0,1fr);gap:18px;align-items:flex-start}
.enhance-preview-panel{display:flex;flex-direction:column;gap:10px}
.enhance-control-panel{display:flex;flex-direction:column;gap:14px;min-width:0}
.enhance-note{font-size:12px;color:#dc2626;font-weight:700}
.enhance-player{display:flex;align-items:center;gap:10px;margin-left:-8px}
.enhance-preview-frame{width:512px;height:512px;border-radius:12px;background:#0f172a;display:flex;align-items:center;justify-content:center;overflow:hidden}
.enhance-preview-window{width:512px;height:512px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
.enhance-preview-fit{display:flex;align-items:center;justify-content:center;transform-origin:center center}
.enhance-preview-crop{position:relative;overflow:hidden;background:#020617}
.enhance-preview-stage{width:512px;height:512px;position:relative;transform-origin:256px 256px}
.enhance-preview-image{width:512px;height:512px;object-fit:contain;display:block}
.enhance-row{display:grid;grid-template-columns:96px minmax(0,1fr) 120px;gap:10px;align-items:center}
.enhance-row--four{align-items:flex-start}
.enhance-label{font-size:13px;color:#475569}
.enhance-slider{width:100%}
.enhance-crop-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;grid-column:2 / 4}
.enhance-crop-item{display:grid;grid-template-columns:24px minmax(0,1fr) 120px;gap:8px;align-items:center}
.enhance-crop-item span{font-size:12px;color:#64748b}
.enhance-crop-slider{width:100%}
.enhance-switch-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0}
.enhance-status{display:flex;flex-direction:column;gap:8px;padding:18px 0}
.enhance-status-title{font-size:16px;color:#0f172a;font-weight:600}
.enhance-status-desc{font-size:13px;color:#64748b}
.enhance-downloads{display:flex;flex-direction:column;gap:10px}
:deep(.n-modal-mask){backdrop-filter:blur(6px);background:rgba(15,23,42,0.35)}
.type-row{display:flex;flex-wrap:wrap;gap:8px}
.hint{color:rgba(63,63,70,0.85);font-size:13px}
.upload-row{display:flex;align-items:center;gap:12px}
.sub-hint{color:#64748b;font-size:12px}
.hidden-input{display:none}
.file-list{display:flex;flex-direction:column;gap:8px;max-height:300px;overflow:auto}
.file-item{padding:6px 8px;border-radius:8px;background:#f8fafc;display:grid;grid-template-columns:1fr 72px 120px;gap:8px;align-items:center}
.file-name{font-size:12px;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.file-status{font-size:12px;color:#475569;text-align:right}
.file-progress :deep(.n-progress){margin:0}
.download-hint{font-size:12px;color:#64748b}
.action-module{border:1px solid var(--color-border);border-radius:8px;padding:10px;background:transparent;display:flex;flex-direction:column;gap:8px}
.action-module-head{font-size:13px;color:#0f172a;font-weight:600;margin-bottom:6px}
.action-module-body{display:flex;flex-direction:column;gap:8px}
@media (max-width: 900px){
  .upload-box,.image-frame{width:100%;height:auto;aspect-ratio:1/1}
  .slider{width:100%}
  .enhance-layout{grid-template-columns:1fr}
  .enhance-preview-frame{width:100%;height:auto;aspect-ratio:1/1}
  .enhance-row{grid-template-columns:1fr}
  .enhance-crop-grid{grid-column:auto;grid-template-columns:1fr}
  .enhance-crop-item{grid-template-columns:24px minmax(0,1fr) 120px}
}
</style>
