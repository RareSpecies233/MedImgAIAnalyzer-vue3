<template>
  <section class="module">
    <div class="module-head">
      <h2>Ai问诊</h2>
    </div>
    <div class="module-body">
      <div class="toolbar">
        <n-space size="small" align="center" wrap>
          <n-button size="small" tertiary :disabled="pending || uploadPending" @click="openUploadModal">
            上传文档
          </n-button>
          <span class="toolbar-note">当前为项目级问诊，支持项目文档、历史记录与 Markdown 渲染</span>
        </n-space>
      </div>

      <div class="chat-board" ref="chatBoardRef">
        <div v-if="loadingHistory" class="empty">正在加载历史对话…</div>
        <div v-else-if="messages.length === 0" class="empty">请输入问题开始问诊，输入与回复都支持 Markdown</div>
        <template v-else>
          <template v-for="(item, index) in messages" :key="item.id">
            <div v-if="shouldShowCurrentDivider(index)" class="session-divider">
              <span>当前对话</span>
            </div>
            <div class="msg" :class="[item.role, item.origin]">
              <div class="msg-meta">
                <div class="msg-role">{{ item.role === 'user' ? '你' : 'Ai' }}</div>
                <div class="msg-badges">
                  <span class="origin-badge" :class="item.origin">{{ item.origin === 'history' ? '历史' : '当前' }}</span>
                  <span v-if="item.timestamp" class="msg-time">{{ formatTime(item.timestamp) }}</span>
                </div>
              </div>
              <div class="msg-text markdown-body" v-html="renderMarkdown(item.content)"></div>
            </div>
          </template>
        </template>
        <div v-if="pending" class="msg assistant current">
          <div class="msg-meta">
            <div class="msg-role">Ai</div>
            <div class="msg-badges">
              <span class="origin-badge current">当前</span>
            </div>
          </div>
          <div class="msg-text">正在思考中…</div>
        </div>
      </div>

      <div class="composer">
        <n-input
          v-model:value="question"
          type="textarea"
          :autosize="{ minRows: 3, maxRows: 7 }"
          placeholder="请输入问诊问题，支持 Markdown；Enter 发送，Shift+Enter 换行"
          @keydown.enter.exact.prevent="send"
        />
        <div class="composer-error-wrap">
          <div v-if="error" class="error">{{ error }}</div>
        </div>
        <div class="composer-actions">
          <n-button size="small" tertiary :disabled="pending || clearing" @click="showClearModal = true">
            清空对话
          </n-button>
          <n-button size="small" type="primary" :loading="pending" @click="send">发送</n-button>
        </div>
      </div>
    </div>
  </section>

  <n-modal
    v-if="showUploadModal"
    :show="showUploadModal"
    teleported
    :mask-closable="!uploadPending"
    :close-on-esc="!uploadPending"
    @update:show="handleUploadModalUpdate"
  >
    <n-card class="modal-card" :bordered="false" role="dialog" aria-labelledby="upload-doc-title">
      <template #header>
        <div class="modal-title">
          <span id="upload-doc-title">上传项目文档</span>
        </div>
      </template>
      <div class="modal-body">
        <div class="modal-note">上传后的文档会立即参与当前项目的 AI问诊检索。</div>
        <n-space size="small" align="center" wrap>
          <n-button size="small" type="primary" :disabled="uploadPending" @click="triggerFilePicker">
            选择文档
          </n-button>
          <span class="file-count">已选择 {{ selectedFiles.length }} 个文件</span>
        </n-space>
        <input ref="fileInput" type="file" multiple class="hidden-input" @change="handleFilesSelected" />

        <div v-if="selectedFiles.length" class="file-list">
          <div v-for="file in selectedFiles" :key="`${file.name}-${file.size}`" class="file-item">
            <span class="file-name">{{ file.name }}</span>
            <span class="file-size">{{ formatFileSize(file.size) }}</span>
          </div>
        </div>

        <div v-if="uploadResultMessage" class="upload-result success">{{ uploadResultMessage }}</div>
        <div v-if="uploadError" class="upload-result error">{{ uploadError }}</div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button size="small" tertiary :disabled="uploadPending" @click="showUploadModal = false">关闭</n-button>
          <n-button
            size="small"
            type="primary"
            :loading="uploadPending"
            :disabled="selectedFiles.length === 0"
            @click="uploadDocuments"
          >
            上传
          </n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>

  <n-modal
    v-if="showClearModal"
    :show="showClearModal"
    teleported
    :mask-closable="!clearing"
    :close-on-esc="!clearing"
    @update:show="handleClearModalUpdate"
  >
    <n-card class="modal-card" :bordered="false" role="dialog" aria-labelledby="clear-title">
      <template #header>
        <div class="modal-title">
          <span id="clear-title">确认清空</span>
        </div>
      </template>
      <div class="modal-body">
        会清空所有历史对话记录及以上传文档，是否确定？
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button size="small" tertiary :disabled="clearing" @click="showClearModal = false">取消</n-button>
          <n-button size="small" type="primary" :loading="clearing" @click="confirmClear">确定</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { computed, nextTick, ref, watch } from 'vue'
import {
  chatWithProjectRag,
  clearProjectLlmHistory,
  getProjectLlmHistory,
  listRagDocuments,
  uploadProjectRagDocuments,
  type ProjectScope,
  type ProjectLlmHistoryEntry,
} from '../api/llm'

type ChatRole = 'user' | 'assistant'
type ChatOrigin = 'history' | 'current'

type ChatMessage = {
  id: number
  role: ChatRole
  content: string
  origin: ChatOrigin
  timestamp?: string
}

const props = withDefaults(
  defineProps<{
    uuid: string
    scope?: ProjectScope
    externalTools?: boolean
    ensureTempUuid?: () => Promise<string>
  }>(),
  { scope: 'project' },
)

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

const chatBoardRef = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const messages = ref<ChatMessage[]>([])
const question = ref('')
const error = ref('')
const uploadError = ref('')
const uploadResultMessage = ref('')
const pending = ref(false)
const uploadPending = ref(false)
const loadingHistory = ref(false)
const clearing = ref(false)
const seed = ref(0)
const ragDocNames = ref<string[]>([])
const projectDocNames = ref<string[]>([])
const selectedFiles = ref<File[]>([])
const showUploadModal = ref(false)
const showClearModal = ref(false)

const hasUsableUuid = computed(() => props.uuid.trim().length > 0)

const knownDocNames = computed(() => [...new Set([...ragDocNames.value, ...projectDocNames.value])])

async function scrollToBottom() {
  await nextTick()
  if (!chatBoardRef.value) return
  chatBoardRef.value.scrollTop = chatBoardRef.value.scrollHeight
}

function nextId() {
  seed.value += 1
  return seed.value
}

function renderMarkdown(content: string) {
  return md.render(content || '')
}

function pushMessage(role: ChatRole, content: string, origin: ChatOrigin, timestamp?: string) {
  messages.value.push({ id: nextId(), role, content, origin, timestamp })
}

function formatTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

function shouldShowCurrentDivider(index: number) {
  const item = messages.value[index]
  const previous = messages.value[index - 1]
  return item?.origin === 'current' && previous?.origin === 'history'
}

function handleUploadModalUpdate(value: boolean) {
  if (uploadPending.value && !value) return
  showUploadModal.value = value
  if (!value) {
    selectedFiles.value = []
    uploadError.value = ''
    uploadResultMessage.value = ''
  }
}

function handleClearModalUpdate(value: boolean) {
  if (clearing.value && !value) return
  showClearModal.value = value
}

function triggerFilePicker() {
  fileInput.value?.click()
}

function handleFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length) return
  selectedFiles.value = files
  uploadError.value = ''
  uploadResultMessage.value = ''
  input.value = ''
}

function collectHitDocuments(contexts: string[]) {
  const matched = new Set<string>()
  for (const context of contexts) {
    for (const name of knownDocNames.value) {
      if (name && context.includes(name)) {
        matched.add(name)
      }
    }
  }
  return Array.from(matched)
}

function notifyDevPanel(payload: {
  question: string
  answer: string
  chunks: number
  contexts: string[]
  hitDocuments: string[]
}) {
  window.dispatchEvent(
    new CustomEvent('llm-chat-updated', {
      detail: {
        ...payload,
        updatedAt: new Date().toISOString(),
      },
    }),
  )
}

function normalizeHistoryEntries(payload: unknown): ProjectLlmHistoryEntry[] {
  if (!Array.isArray(payload)) return []
  return payload
    .map((item) => {
      const entry = item as Partial<ProjectLlmHistoryEntry>
      return {
        timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : '',
        question: typeof entry.question === 'string' ? entry.question : '',
        answer: typeof entry.answer === 'string' ? entry.answer : '',
        contexts: Array.isArray(entry.contexts)
          ? entry.contexts.filter((ctx): ctx is string => typeof ctx === 'string')
          : [],
      }
    })
    .filter((entry) => entry.question || entry.answer)
}

async function loadHistory() {
  if (props.scope === 'temp' && !hasUsableUuid.value) {
    messages.value = []
    loadingHistory.value = false
    return
  }
  loadingHistory.value = true
  try {
    const history = normalizeHistoryEntries(await getProjectLlmHistory(props.uuid, props.scope))
    messages.value = []
    for (const entry of history) {
      pushMessage('user', entry.question, 'history', entry.timestamp)
      pushMessage('assistant', entry.answer, 'history', entry.timestamp)
    }
  } catch (err: any) {
    error.value = err?.message || String(err)
    messages.value = []
  } finally {
    loadingHistory.value = false
    await scrollToBottom()
  }
}

async function loadGlobalDocNames() {
  try {
    const response = await listRagDocuments()
    ragDocNames.value = response.documents.map((doc) => doc.name)
  } catch {
    ragDocNames.value = []
  }
}

async function initializeModule() {
  error.value = ''
  question.value = ''
  projectDocNames.value = []
  selectedFiles.value = []
  uploadError.value = ''
  uploadResultMessage.value = ''
  await Promise.all([loadHistory(), loadGlobalDocNames()])
}

async function resolveOperationUuid() {
  if (hasUsableUuid.value) return props.uuid
  if (props.scope === 'temp' && props.ensureTempUuid) {
    return await props.ensureTempUuid()
  }
  throw new Error('当前项目未初始化')
}

async function uploadDocuments() {
  if (!selectedFiles.value.length || uploadPending.value) return
  const files = [...selectedFiles.value]
  uploadPending.value = true
  uploadError.value = ''
  uploadResultMessage.value = ''
  try {
    const uuid = await resolveOperationUuid()
    const response = await uploadProjectRagDocuments(uuid, files, props.scope)
    projectDocNames.value = Array.from(
      new Set([...projectDocNames.value, ...files.map((file) => file.name)]),
    )
    uploadResultMessage.value = response.message || '文档上传成功'
    selectedFiles.value = []
  } catch (err: any) {
    uploadError.value = err?.message || String(err)
  } finally {
    uploadPending.value = false
  }
}

async function send() {
  const content = question.value.trim()
  if (!content || pending.value) return

  let uuid = props.uuid
  try {
    uuid = await resolveOperationUuid()
  } catch (err: any) {
    error.value = `发送失败：${err?.message || String(err)}`
    return
  }

  error.value = ''
  question.value = ''
  pushMessage('user', content, 'current', new Date().toISOString())
  pending.value = true
  await scrollToBottom()

  try {
    const response = await chatWithProjectRag(uuid, { question: content }, props.scope)
    const answer = (response.answer || '').trim() || '模型未返回内容'
    pushMessage('assistant', answer, 'current', new Date().toISOString())
    const hitDocuments = collectHitDocuments(response.contexts || [])
    notifyDevPanel({
      question: content,
      answer,
      chunks: response.chunks || 0,
      contexts: response.contexts || [],
      hitDocuments,
    })
  } catch (err: any) {
    const message = err?.message || String(err)
    error.value = `发送失败：${message}`
    pushMessage('assistant', '请求失败，请检查大模型配置、项目文档与网络后重试。', 'current')
  } finally {
    pending.value = false
    await scrollToBottom()
  }
}

async function confirmClear() {
  if (clearing.value) return
  if (props.scope === 'temp' && !hasUsableUuid.value) {
    messages.value = []
    question.value = ''
    error.value = ''
    uploadError.value = ''
    uploadResultMessage.value = ''
    selectedFiles.value = []
    showClearModal.value = false
    return
  }
  clearing.value = true
  try {
    const uuid = await resolveOperationUuid()
    await clearProjectLlmHistory(uuid, props.scope)
    messages.value = []
    projectDocNames.value = []
    question.value = ''
    error.value = ''
    uploadError.value = ''
    uploadResultMessage.value = ''
    selectedFiles.value = []
    showClearModal.value = false
  } catch (err: any) {
    error.value = err?.message || String(err)
  } finally {
    clearing.value = false
  }
}

function openUploadModal() {
  showUploadModal.value = true
}

watch(
  () => props.uuid,
  (nextUuid, previousUuid) => {
    if (
      props.scope === 'temp' &&
      !previousUuid &&
      !!nextUuid &&
      (pending.value || uploadPending.value || messages.value.length > 0 || selectedFiles.value.length > 0)
    ) {
      return
    }
    void initializeModule()
  },
  { immediate: true },
)
</script>

<style scoped>
.module{background:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(2,6,23,0.12)}
.module-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--color-border)}
.module-head h2{margin:0;font-size:16px}
.module-body{padding:16px;display:flex;flex-direction:column;gap:12px;min-height:470px}
.toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px}
.toolbar-note{font-size:12px;color:#64748b}
.chat-board{flex:1;min-height:320px;overflow:auto;border:1px solid var(--color-border);border-radius:10px;background:#f8fafc;padding:12px;display:flex;flex-direction:column;gap:10px}
.empty{height:100%;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:13px;text-align:center;padding:24px}
.session-divider{display:flex;align-items:center;justify-content:center;margin:4px 0}
.session-divider span{font-size:12px;color:#64748b;background:#e2e8f0;padding:4px 10px;border-radius:999px}
.msg{max-width:88%;padding:10px 12px;border-radius:8px;display:flex;flex-direction:column;gap:6px}
.msg.user{align-self:flex-end;background:#eef2ff}
.msg.assistant{align-self:flex-start;background:#fff;box-shadow:inset 0 0 0 1px rgba(148,163,184,0.24)}
.msg.history{opacity:0.9}
.msg-meta{display:flex;align-items:center;justify-content:space-between;gap:12px}
.msg-role{font-size:12px;color:#64748b;font-weight:600}
.msg-badges{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.origin-badge{font-size:11px;line-height:1;padding:4px 6px;border-radius:999px;background:#e2e8f0;color:#475569}
.origin-badge.current{background:#dbeafe;color:#1d4ed8}
.origin-badge.history{background:#e5e7eb;color:#4b5563}
.msg-time{font-size:11px;color:#94a3b8}
.msg-text{word-break:break-word;color:#1f2937}
.composer{display:flex;flex-direction:column;gap:8px;margin-top:auto}
.composer-error-wrap{min-height:18px}
.composer-actions{display:flex;align-items:center;justify-content:flex-start;gap:10px;background:#fff;padding-top:2px}
.error{font-size:12px;color:#b91c1c}
.modal-card{width:min(92vw,640px);border-radius:12px;box-shadow:0 20px 50px rgba(2,6,23,0.2)}
.modal-title{display:flex;align-items:center;justify-content:space-between}
.modal-body{display:flex;flex-direction:column;gap:12px}
.modal-note,.file-count{font-size:13px;color:#64748b}
.hidden-input{display:none}
.file-list{display:flex;flex-direction:column;gap:8px;max-height:260px;overflow:auto}
.file-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 10px;border-radius:8px;background:#f8fafc}
.file-name{font-size:13px;color:#1f2937;word-break:break-all}
.file-size{font-size:12px;color:#64748b;white-space:nowrap}
.upload-result{font-size:12px;padding:8px 10px;border-radius:8px}
.upload-result.success{background:#ecfdf5;color:#047857}
.upload-result.error{background:#fef2f2;color:#b91c1c}
.markdown-body :deep(p){margin:0 0 8px}
.markdown-body :deep(p:last-child){margin-bottom:0}
.markdown-body :deep(pre){margin:8px 0 0;padding:10px;border-radius:8px;background:#0f172a;color:#e2e8f0;overflow:auto}
.markdown-body :deep(code){font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px}
.markdown-body :deep(:not(pre) > code){padding:2px 4px;border-radius:4px;background:rgba(148,163,184,0.18);color:#0f172a}
.markdown-body :deep(ul),.markdown-body :deep(ol){margin:0;padding-left:20px}
.markdown-body :deep(li + li){margin-top:4px}
.markdown-body :deep(blockquote){margin:8px 0 0;padding-left:12px;border-left:3px solid #cbd5e1;color:#475569}
.markdown-body :deep(a){color:#2563eb;text-decoration:none}
.markdown-body :deep(a:hover){text-decoration:underline}
:deep(.n-modal-mask){backdrop-filter:blur(6px);background:rgba(15,23,42,0.35)}
</style>
