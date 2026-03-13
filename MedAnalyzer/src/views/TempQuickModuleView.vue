<template>
  <div class="temp-quick-view">
    <section class="page-header">
      <div class="header-left">
        <h1>{{ moduleTitle }}</h1>
        <p class="subtitle">临时快速模式（/temp）</p>
        <p class="warn-tip">此为临时项目，关闭界面后删除，如需下次访问，请点击保存</p>
        <p v-if="tempUUID" class="subtitle">当前临时项目 UUID：{{ tempUUID }}</p>
      </div>
      <n-space v-if="showTempImageTools" size="small">
        <n-button size="small" tertiary :loading="uploading" @click="openUploadModal">上传文件</n-button>
        <n-button size="small" type="primary" :loading="savingProject" @click="openSaveProjectModal">保存项目</n-button>
      </n-space>
    </section>

    <div v-if="loading" class="state">正在读取临时项目状态…</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <div v-else-if="!tempUUID && moduleKey !== 'consult'" class="state">尚未创建临时项目，请直接上传文件开始使用。</div>
    <component
      v-else-if="activeComponent && (tempUUID || moduleKey === 'consult')"
      :key="moduleRenderKey"
      :is="activeComponent"
      :uuid="tempUUID"
      scope="temp"
      :external-tools="true"
      v-bind="activeComponentProps"
    />
  </div>

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
              <template v-if="moduleKey === 'reconstruction'">
                <n-radio-button value="markednpz">带有标注信息的NPZ序列</n-radio-button>
              </template>
              <template v-else>
                <n-radio-button value="png">PNG序列</n-radio-button>
                <n-radio-button value="npz">NPZ序列</n-radio-button>
                <n-radio-button value="markednpz">带有标注信息的NPZ序列</n-radio-button>
                <n-radio-button value="nii">NII文件</n-radio-button>
                <n-radio-button value="dcm">DCM序列</n-radio-button>
              </template>
            </n-space>
          </n-radio-group>
        </div>
        <p class="hint">【只有带有标注信息的NPZ序列才能使用Ai推理与人工标注的比较功能】</p>
        <div class="upload-row">
          <n-button size="small" type="primary" :disabled="uploading" @click="triggerFilePicker">上传文件</n-button>
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
        每个项目仅可初始化一次，请务必确定全部上传完后再点击确定，否则需要重新新建项目
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
    v-if="showSaveProjectModal"
    :show="showSaveProjectModal"
    teleported
    :mask-closable="!savingProject"
    :close-on-esc="!savingProject"
    @update:show="(v: boolean) => handleSaveProjectModalUpdate(v)"
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
          <n-button size="small" tertiary :disabled="savingProject" @click="showSaveProjectModal = false">取消</n-button>
          <n-button size="small" type="primary" :loading="savingProject" @click="confirmSaveProject">确定</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>

  <n-modal
    v-if="showNoticeModal"
    :show="showNoticeModal"
    teleported
    :mask-closable="noticeClosable"
    :close-on-esc="noticeClosable"
    @update:show="(v: boolean) => handleNoticeModalUpdate(v)"
  >
    <n-card class="modal-card" :bordered="false" role="dialog" aria-labelledby="notice-title">
      <template #header>
        <div class="modal-title">
          <span id="notice-title">提示</span>
        </div>
      </template>
      <div class="modal-body">{{ noticeMessage }}</div>
      <template #footer>
        <n-space justify="end">
          <n-button v-if="noticeClosable" type="primary" @click="showNoticeModal = false">关闭</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PreprocessModule from '../components/PreprocessModule.vue'
import AiAnalysisModule from '../components/AiAnalysisModule.vue'
import ReconstructionModule from '../components/ReconstructionModule.vue'
import AiConsultModule from '../components/AiConsultModule.vue'
import { convertTempProject, createTempProject, getProjectJson } from '../api/projects'
import { clearStoredTempUUID } from '../utils/tempProjectSession'

type TempModuleKey = 'preprocess' | 'analysis' | 'reconstruction' | 'consult'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const error = ref('')
const tempUUID = ref('')
const moduleRenderKey = ref(0)

type UploadStatus = 'queued' | 'uploading' | 'done' | 'error'
type UploadItem = {
  id: string
  name: string
  file: File
  status: UploadStatus
  progress: number
  statusLabel: string
}

const showUploadModal = ref(false)
const showConfirmModal = ref(false)
const confirming = ref(false)
const uploading = ref(false)
const selectedType = ref<'png' | 'npz' | 'markednpz' | 'nii' | 'dcm'>('png')
const uploads = ref<UploadItem[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const showSaveProjectModal = ref(false)
const savingProject = ref(false)
const saveProjectForm = reactive({ name: '', note: '' })
const showNoticeModal = ref(false)
const noticeMessage = ref('')
const noticeClosable = ref(true)
const pollingTimer = ref<number | null>(null)

const routePrefix = computed(() => String(route.meta.routePrefix || ''))

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

const activeComponentProps = computed(() => {
  if (moduleKey.value === 'consult') {
    return { ensureTempUuid: ensureTempUUIDForAction }
  }
  return {}
})

const moduleTitle = computed(() => {
  if (moduleKey.value === 'analysis') return '临时快速Ai分析'
  if (moduleKey.value === 'reconstruction') return '临时快速三维重建'
  if (moduleKey.value === 'consult') return '临时快速Ai问诊'
  return '临时快速预处理'
})

const modulePathSegment = computed(() => {
  if (moduleKey.value === 'analysis') return 'analysis'
  if (moduleKey.value === 'reconstruction') return 'reconstruction'
  if (moduleKey.value === 'consult') return 'consult'
  return 'preprocess'
})

const showTempImageTools = computed(
  () => !loading.value && !error.value && moduleKey.value !== 'consult',
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

function buildTempModulePath(uuid: string) {
  return `${routePrefix.value}/temp/${encodeURIComponent(uuid)}/${modulePathSegment.value}`
}

async function ensureTempProject() {
  const uuidParam = typeof route.params.uuid === 'string' ? route.params.uuid.trim() : ''
  if (!uuidParam) {
    tempUUID.value = ''
    return
  }

  tempUUID.value = uuidParam
  await getProjectJson(uuidParam, 'temp')
}

async function ensureTempUUIDForAction() {
  if (tempUUID.value) return tempUUID.value
  const created = await createTempProject('临时快速项目')
  tempUUID.value = created.tempUUID
  await router.replace(buildTempModulePath(created.tempUUID))
  return created.tempUUID
}

async function initTempProject() {
  loading.value = true
  error.value = ''
  try {
    await ensureTempProject()
  } catch (err: any) {
    console.error(err)
    error.value = err?.message || '临时项目初始化失败'
  } finally {
    loading.value = false
  }
}

function openUploadModal() {
  if (moduleKey.value === 'reconstruction') {
    selectedType.value = 'markednpz'
  }
  showUploadModal.value = true
}

function handleUploadModalUpdate(value: boolean) {
  showUploadModal.value = value
  if (!value) resetUploadState()
}

function resetUploadState() {
  uploads.value = []
  uploading.value = false
  selectedType.value = moduleKey.value === 'reconstruction' ? 'markednpz' : 'png'
}

function triggerFilePicker() {
  fileInput.value?.click()
}

function handleFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const files = Array.from(input.files)
  input.value = ''
  addUploads(files)
}

function addUploads(files: File[]) {
  const items = files.map((file) => ({
    id: `${file.name}-${Date.now()}-${Math.random()}`,
    name: file.name,
    file,
    status: 'queued' as UploadStatus,
    progress: 0,
    statusLabel: '等待上传',
  }))
  uploads.value = [...uploads.value, ...items]
  void uploadQueue()
}

async function uploadQueue() {
  if (uploading.value) return
  if (!tempUUID.value) {
    try {
      await ensureTempUUIDForAction()
    } catch (err) {
      console.error(err)
      openNotice('创建临时项目失败，请稍后重试')
      return
    }
  }
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
    xhr.open('POST', `/api/temp/${encodeURIComponent(tempUUID.value)}/upload`)
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
  if (!tempUUID.value) {
    showUploadModal.value = false
    showConfirmModal.value = false
    resetUploadState()
    return
  }
  try {
    await fetch(`/api/temp/${encodeURIComponent(tempUUID.value)}/uninit`, { method: 'POST' })
  } catch (err) {
    console.error(err)
  } finally {
    showUploadModal.value = false
    showConfirmModal.value = false
    resetUploadState()
  }
}

async function confirmInit() {
  if (!tempUUID.value) {
    openNotice('请先上传文件')
    return
  }
  confirming.value = true
  try {
    const res = await fetch(`/api/temp/${encodeURIComponent(tempUUID.value)}/inited`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: selectedType.value }),
    })
    if (!res.ok) throw new Error('初始化失败')
    showConfirmModal.value = false
    showUploadModal.value = false
    startPollingRaw()
  } catch (err) {
    console.error(err)
    openNotice('初始化失败，请稍后重试')
  } finally {
    confirming.value = false
  }
}

function startPollingRaw() {
  stopPolling()
  pollingTimer.value = window.setInterval(async () => {
    try {
      const config = await getProjectJson(tempUUID.value, 'temp')
      if (config.raw !== false) {
        stopPolling()
        moduleRenderKey.value += 1
      }
    } catch {
      // ignore polling errors
    }
  }, 1000)
}

function stopPolling() {
  if (pollingTimer.value) {
    window.clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

function openSaveProjectModal() {
  if (!tempUUID.value) {
    openNotice('请先上传并初始化文件后再保存项目')
    return
  }
  saveProjectForm.name = ''
  saveProjectForm.note = ''
  showSaveProjectModal.value = true
}

function handleSaveProjectModalUpdate(value: boolean) {
  if (savingProject.value && !value) return
  showSaveProjectModal.value = value
}

async function confirmSaveProject() {
  if (!tempUUID.value) return
  const name = saveProjectForm.name.trim()
  if (!name) {
    openNotice('请先输入项目名称')
    return
  }
  savingProject.value = true
  try {
    const project = await convertTempProject(tempUUID.value, {
      name,
      note: saveProjectForm.note.trim(),
    })
    clearStoredTempUUID()
    showSaveProjectModal.value = false
    await router.push(`${routePrefix.value}/project/${encodeURIComponent(project.uuid)}`)
  } catch (err) {
    console.error(err)
    openNotice('保存项目失败，请稍后重试')
  } finally {
    savingProject.value = false
  }
}

function openNotice(message: string) {
  noticeMessage.value = message
  noticeClosable.value = true
  showNoticeModal.value = true
}

function handleNoticeModalUpdate(value: boolean) {
  if (noticeClosable.value) showNoticeModal.value = value
}

watch(
  () => moduleTitle.value,
  (title) => {
    document.title = title
  },
  { immediate: true },
)

onMounted(() => {
  void initTempProject()
})

watch(
  () => route.fullPath,
  () => {
    void initTempProject()
  },
)

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<style scoped>
.temp-quick-view{width:100%;max-width:none;margin:0 auto;display:flex;flex-direction:column;gap:20px;padding:8px 6px;min-height:0}
.page-header{display:flex;align-items:center;justify-content:space-between;gap:16px}
.header-left{padding-left:15px}
.page-header h1{margin:0;font-size:22px}
.subtitle{margin:4px 0 0;color:rgba(75,85,99,0.95);font-size:13px}
.warn-tip{margin:6px 0 0;color:#dc2626;font-size:14px;font-weight:700}
.state{padding:12px;border-radius:8px;background:#f8fafc;color:#334155}
.state.error{color:#b91c1c;background:#fef2f2}
.modal-card{width:min(92vw,640px);border-radius:12px;box-shadow:0 20px 50px rgba(2,6,23,0.2)}
.modal-title{display:flex;align-items:center;justify-content:space-between}
.modal-body{display:flex;flex-direction:column;gap:12px}
.type-row{display:flex;flex-wrap:wrap;gap:8px}
.hint{color:rgba(63,63,70,0.85);font-size:13px}
.upload-row{display:flex;align-items:center;gap:12px}
.hidden-input{display:none}
.file-list{display:flex;flex-direction:column;gap:8px;max-height:300px;overflow:auto}
.file-item{padding:6px 8px;border-radius:8px;background:#f8fafc;display:grid;grid-template-columns:1fr 72px 120px;gap:8px;align-items:center}
.file-name{font-size:12px;color:#1f2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.file-status{font-size:12px;color:#475569;text-align:right}
:deep(.n-modal-mask){backdrop-filter:blur(6px);background:rgba(15,23,42,0.35)}
@media (max-width: 900px){
  .header-left{padding-left:0}
}
</style>
