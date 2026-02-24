<template>
  <section class="module">
    <div class="module-head">
      <h2>Ai问诊</h2>
      <n-tag size="small" type="warning" :bordered="false">开发中</n-tag>
    </div>
    <div class="module-body">
      <div class="chat-board" ref="chatBoardRef">
        <div v-if="messages.length === 0" class="empty">请输入问题开始问诊</div>
        <div v-for="item in messages" :key="item.id" class="msg" :class="item.role">
          <div class="msg-role">{{ item.role === 'user' ? '你' : 'Ai' }}</div>
          <div class="msg-text">{{ item.content }}</div>
        </div>
        <div v-if="pending" class="msg assistant">
          <div class="msg-role">Ai</div>
          <div class="msg-text">正在思考中…</div>
        </div>
      </div>
      <div class="composer">
        <n-input
          v-model:value="question"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 5 }"
          placeholder="请输入问诊问题"
          @keydown.enter.exact.prevent="send"
        />
        <div class="composer-actions">
          <div v-if="error" class="error">{{ error }}</div>
          <n-space>
            <n-button size="small" tertiary :disabled="pending || question.trim().length === 0" @click="clear">
              清空对话
            </n-button>
            <n-button size="small" type="primary" :loading="pending" @click="send">发送</n-button>
          </n-space>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { chatWithRag, listRagDocuments } from '../api/llm'

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: number
  role: ChatRole
  content: string
}

const chatBoardRef = ref<HTMLElement | null>(null)
const messages = ref<ChatMessage[]>([])
const question = ref('')
const error = ref('')
const pending = ref(false)
const seed = ref(0)
const ragDocNames = ref<string[]>([])

async function scrollToBottom() {
  await nextTick()
  if (!chatBoardRef.value) return
  chatBoardRef.value.scrollTop = chatBoardRef.value.scrollHeight
}

function pushMessage(role: ChatRole, content: string) {
  seed.value += 1
  messages.value.push({ id: seed.value, role, content })
}

function collectHitDocuments(contexts: string[]) {
  const matched = new Set<string>()
  for (const context of contexts) {
    for (const name of ragDocNames.value) {
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

async function send() {
  const content = question.value.trim()
  if (!content || pending.value) return

  error.value = ''
  question.value = ''
  pushMessage('user', content)
  pending.value = true
  scrollToBottom()

  try {
    const response = await chatWithRag({ question: content })
    const answer = (response.answer || '').trim() || '模型未返回内容'
    pushMessage('assistant', answer)
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
    pushMessage('assistant', '请求失败，请检查大模型配置与网络后重试。')
  } finally {
    pending.value = false
    scrollToBottom()
  }
}

function clear() {
  messages.value = []
  error.value = ''
}

onMounted(async () => {
  try {
    const response = await listRagDocuments()
    ragDocNames.value = response.documents.map((doc) => doc.name)
  } catch {
    ragDocNames.value = []
  }
})
</script>

<style scoped>
.module{background:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(2,6,23,0.12)}
.module-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--color-border)}
.module-head h2{margin:0;font-size:16px}
.module-body{padding:16px}
.chat-board{height:320px;overflow:auto;border:1px solid var(--color-border);border-radius:10px;background:#f8fafc;padding:12px;display:flex;flex-direction:column;gap:10px}
.empty{height:100%;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:13px}
.msg{max-width:88%;padding:10px 12px;border-radius:8px;display:flex;flex-direction:column;gap:4px}
.msg.user{align-self:flex-end;background:#eef2ff}
.msg.assistant{align-self:flex-start;background:#fff;box-shadow:inset 0 0 0 1px rgba(148,163,184,0.24)}
.msg-role{font-size:12px;color:#64748b}
.msg-text{white-space:pre-wrap;word-break:break-word;color:#1f2937}
.composer{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.composer-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}
.error{font-size:12px;color:#b91c1c}
</style>
