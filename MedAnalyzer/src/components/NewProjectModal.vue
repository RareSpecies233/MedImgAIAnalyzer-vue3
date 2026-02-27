<template>
  <n-modal
    v-if="show"
    :show="show"
    teleported
    :mask-closable="false"
    :close-on-esc="false"
    @update:show="$emit('update:show', $event)"
  >
    <n-card
      class="modal-card"
      role="dialog"
      aria-labelledby="new-project-title"
      aria-describedby="new-project-desc"
      :bordered="false"
    >
      <template #header>
        <div class="modal-title">
          <span id="new-project-title">新建项目</span>
        </div>
      </template>

      <div class="body">
        <template v-if="!created">
          <p class="hint" id="new-project-desc">请填写项目名称与备注</p>
          <div class="form">
            <label class="label" for="project-name">项目名称</label>
            <n-input
              id="project-name"
              v-model:value="name"
              placeholder="请输入项目名称"
              :disabled="submitting"
              maxlength="64"
              show-count
            />

            <label class="label" for="project-note">备注</label>
            <n-input
              id="project-note"
              v-model:value="note"
              type="textarea"
              :disabled="submitting"
              :autosize="{ minRows: 4, maxRows: 8 }"
              placeholder="可选：记录本项目说明"
            />

            <div v-if="error" class="error" role="alert">{{ error }}</div>
          </div>
        </template>
        <template v-else>
          <div class="success">创建完成</div>
          <div class="summary">
            <div><strong>名称：</strong>{{ created.name }}</div>
            <div><strong>UUID：</strong>{{ created.uuid }}</div>
            <div><strong>创建时间：</strong>{{ new Date(created.createdAt).toLocaleString() }}</div>
          </div>
          <p class="hint">是否立即进入该项目？</p>
        </template>
      </div>

      <template #footer>
        <n-space justify="end">
          <n-button v-if="!created" tertiary @click="close">取消</n-button>
          <n-button
            v-if="!created"
            type="primary"
            :disabled="!canSubmit"
            :loading="submitting"
            @click="submit"
          >创建项目</n-button>

          <template v-else>
            <n-button tertiary @click="chooseStay">稍后进入</n-button>
            <n-button type="primary" @click="chooseEnter">进入项目</n-button>
          </template>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { watch, ref, toRef, computed } from 'vue'
import { createProject, type Project } from '../api/projects'
const emit = defineEmits(['update:show', 'created', 'enter'])
const props = defineProps({ show: { type: Boolean, default: false } })
const show = toRef(props, 'show')
const name = ref('')
const note = ref('')
const submitting = ref(false)
const error = ref('')
const created = ref<Project | null>(null)

const canSubmit = computed(() => name.value.trim().length > 0 && !submitting.value)

function close() {
  emit('update:show', false)
}

function reset() {
  name.value = ''
  note.value = ''
  error.value = ''
  submitting.value = false
  created.value = null
}

async function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  error.value = ''
  try {
    const payload = { name: name.value.trim(), note: note.value.trim() }
    const project = await createProject(payload)
    created.value = project
  } catch (err: any) {
    console.error(err)
    error.value = err?.message || '创建失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

function chooseStay() {
  if (!created.value) return
  emit('created', created.value)
  close()
}

function chooseEnter() {
  if (!created.value) return
  emit('enter', created.value)
  close()
}

// Reset form state when modal closes.
watch(show, (v) => {
  if (!v) {
    reset()
  }
})
</script>

<style scoped>
.modal-card{width:min(92vw,560px);border-radius:12px;box-shadow:0 20px 50px rgba(2,6,23,0.2)}
.modal-title{display:flex;align-items:center;justify-content:space-between}
.body{padding:12px 0 4px}
.hint{color:rgba(63,63,70,0.85);margin-top:8px}
.form{display:flex;flex-direction:column;gap:10px;margin-top:12px}
.label{font-size:13px;color:rgba(63,63,70,0.9)}
.error{margin-top:6px;color:#ef4444;font-size:13px}
.success{font-size:20px;font-weight:700;color:#111}
.summary{margin-top:10px;display:flex;flex-direction:column;gap:6px;background:#f8fafc;padding:12px;border-radius:8px;font-size:13px}
</style>