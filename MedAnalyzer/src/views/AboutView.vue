<template>
  <div class="about-page">
    <section class="page-head">
      <h1>南北绿豆</h1>
      <p>大模型配置与 RAG 文档管理</p>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>大模型 API 设置</h2>
        <n-space>
          <n-button size="small" tertiary :loading="loadingSettings" @click="loadSettings">刷新</n-button>
          <n-button size="small" type="primary" :loading="savingSettings" @click="saveSettings">保存设置</n-button>
        </n-space>
      </div>

      <div v-if="settingsError" class="state error">{{ settingsError }}</div>

      <div class="form-grid">
        <label class="field">
          <span>base_url</span>
          <n-input v-model:value="settings.base_url" placeholder="https://api.example.com/v1" />
        </label>
        <label class="field">
          <span>model</span>
          <n-input v-model:value="settings.model" placeholder="gpt-4o-mini" />
        </label>
        <label class="field full">
          <span>api_key</span>
          <n-input v-model:value="settings.api_key" type="password" show-password-on="click" placeholder="请输入 API Key" />
        </label>
        <label class="field">
          <span>temperature</span>
          <n-input-number v-model:value="settings.temperature" :min="0" :max="2" :step="0.1" style="width:100%" />
        </label>
        <label class="field">
          <span>top_k</span>
          <n-input-number v-model:value="settings.top_k" :min="1" :max="20" :step="1" style="width:100%" />
        </label>
        <label class="field full">
          <span>system_prompt</span>
          <n-input
            v-model:value="settings.system_prompt"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 8 }"
            placeholder="请输入系统提示词"
          />
        </label>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <h2>RAG 文档管理</h2>
        <n-space>
          <n-button size="small" tertiary :loading="loadingDocs" @click="loadDocuments">刷新</n-button>
          <n-button size="small" tertiary :loading="downloadingDocs" @click="downloadAll">下载全部</n-button>
        </n-space>
      </div>

      <div class="uploader">
        <input ref="fileInputRef" type="file" multiple @change="handleFileSelect" />
        <n-button size="small" type="primary" :loading="uploading" @click="uploadSelected" :disabled="selectedFiles.length === 0">
          上传选中文档
        </n-button>
        <span class="muted">已选 {{ selectedFiles.length }} 个文件</span>
      </div>

      <div v-if="docsError" class="state error">{{ docsError }}</div>

      <div v-if="documents.length === 0" class="state">暂无文档</div>
      <div v-else class="doc-list">
        <div v-for="doc in documents" :key="doc.name" class="doc-row">
          <div class="doc-meta">
            <div class="doc-name">{{ doc.name }}</div>
            <div class="doc-size">{{ formatSize(doc.size) }}</div>
          </div>
          <n-popconfirm @positive-click="() => removeDoc(doc.name)">
            <template #trigger>
              <n-button size="small" tertiary :loading="deletingDocName === doc.name">删除</n-button>
            </template>
            确认删除该文档？
          </n-popconfirm>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  deleteRagDocument,
  downloadRagDocuments,
  getLlmSettings,
  listRagDocuments,
  saveLlmSettings,
  uploadRagDocuments,
  type RagDocument,
} from '../api/llm'

const loadingSettings = ref(false)
const savingSettings = ref(false)
const settingsError = ref('')

const loadingDocs = ref(false)
const downloadingDocs = ref(false)
const uploading = ref(false)
const docsError = ref('')
const deletingDocName = ref('')

const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<File[]>([])
const documents = ref<RagDocument[]>([])

const settings = reactive({
  base_url: '',
  api_key: '',
  model: '',
  temperature: 0.2,
  top_k: 4,
  system_prompt: '',
})

function applySettings(data: Partial<typeof settings>) {
  settings.base_url = data.base_url || ''
  settings.api_key = data.api_key || ''
  settings.model = data.model || ''
  settings.temperature = typeof data.temperature === 'number' ? data.temperature : 0.2
  settings.top_k = typeof data.top_k === 'number' ? data.top_k : 4
  settings.system_prompt = data.system_prompt || ''
}

async function loadSettings() {
  loadingSettings.value = true
  settingsError.value = ''
  try {
    const data = await getLlmSettings()
    applySettings(data)
  } catch (err: any) {
    settingsError.value = err?.message || String(err)
  } finally {
    loadingSettings.value = false
  }
}

async function saveSettings() {
  savingSettings.value = true
  settingsError.value = ''
  try {
    await saveLlmSettings({
      base_url: settings.base_url.trim(),
      api_key: settings.api_key.trim(),
      model: settings.model.trim(),
      temperature: settings.temperature,
      top_k: settings.top_k,
      system_prompt: settings.system_prompt,
    })
  } catch (err: any) {
    settingsError.value = err?.message || String(err)
  } finally {
    savingSettings.value = false
  }
}

async function loadDocuments() {
  loadingDocs.value = true
  docsError.value = ''
  try {
    const response = await listRagDocuments()
    documents.value = response.documents
  } catch (err: any) {
    docsError.value = err?.message || String(err)
  } finally {
    loadingDocs.value = false
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  selectedFiles.value = Array.from(target.files || [])
}

async function uploadSelected() {
  if (selectedFiles.value.length === 0) return
  uploading.value = true
  docsError.value = ''
  try {
    await uploadRagDocuments(selectedFiles.value)
    selectedFiles.value = []
    if (fileInputRef.value) fileInputRef.value.value = ''
    await loadDocuments()
  } catch (err: any) {
    docsError.value = err?.message || String(err)
  } finally {
    uploading.value = false
  }
}

async function downloadAll() {
  downloadingDocs.value = true
  docsError.value = ''
  try {
    const blob = await downloadRagDocuments()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'llm_rag_documents.zip'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (err: any) {
    docsError.value = err?.message || String(err)
  } finally {
    downloadingDocs.value = false
  }
}

async function removeDoc(name: string) {
  deletingDocName.value = name
  docsError.value = ''
  try {
    await deleteRagDocument(name)
    await loadDocuments()
  } catch (err: any) {
    docsError.value = err?.message || String(err)
  } finally {
    deletingDocName.value = ''
  }
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

onMounted(async () => {
  await Promise.all([loadSettings(), loadDocuments()])
})
</script>

<style scoped>
.about-page{width:100%;max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:16px;padding:8px 6px}
.page-head h1{margin:0;font-size:22px}
.page-head p{margin:4px 0 0;color:#64748b;font-size:13px}
.panel{background:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(2,6,23,0.12);padding:16px}
.panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.panel-head h2{margin:0;font-size:16px}
.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.field{display:flex;flex-direction:column;gap:6px}
.field span{font-size:12px;color:#64748b}
.field.full{grid-column:1 / -1}
.state{padding:10px 12px;border-radius:8px;background:#f8fafc;color:#334155;margin-bottom:12px}
.state.error{background:#fef2f2;color:#b91c1c}
.uploader{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.muted{font-size:12px;color:#64748b}
.doc-list{display:flex;flex-direction:column;gap:8px}
.doc-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid var(--color-border);border-radius:8px}
.doc-meta{display:flex;align-items:center;gap:12px;min-width:0}
.doc-name{font-size:13px;color:#1f2937;word-break:break-word}
.doc-size{font-size:12px;color:#64748b;white-space:nowrap}
@media (max-width: 800px){
  .form-grid{grid-template-columns:1fr}
}
</style>
