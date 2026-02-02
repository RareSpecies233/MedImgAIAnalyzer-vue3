<template>
  <div class="project-view">
    <section class="page-header">
      <div class="header-left">
        <h1>项目视图</h1>
        <p class="subtitle">当前项目：{{ project?.name || props.uuid }}</p>
      </div>
      <n-space>
        <n-button size="small" tertiary @click="goHome">返回</n-button>
      </n-space>
    </section>

    <section class="module dev">
      <div class="module-head">
        <h2>开发者模式</h2>
        <n-button size="small" tertiary :loading="loading" @click="load">刷新</n-button>
      </div>
      <div class="module-body">
        <div v-if="loading" class="state">正在加载项目信息…</div>
        <div v-else-if="error" class="state error">加载失败：{{ error }}</div>
        <div v-else class="dev-grid">
          <n-card size="small" class="panel" title="info.json（项目信息）（缓存-请刷新后查看最新内容）">
            <div class="kv-list">
              <div class="kv">
                <div class="kv-label">UUID</div>
                <pre class="mono">{{ project?.uuid || '—' }}</pre>
              </div>
              <div class="kv">
                <div class="kv-label">名称</div>
                <div class="mono">{{ project?.name || '—' }}</div>
              </div>
              <div class="kv">
                <div class="kv-label">创建时间</div>
                <div class="mono">{{ formatTime(project?.createdAt) }}</div>
              </div>
              <div class="kv">
                <div class="kv-label">修改时间</div>
                <div class="mono">{{ formatTime(project?.updatedAt) }}</div>
              </div>
              <div class="kv">
                <div class="kv-label">备注</div>
                <pre class="mono">{{ project?.note || '—' }}</pre>
              </div>
            </div>
          </n-card>

          <n-card size="small" class="panel" title="project.json（项目配置）（缓存-请刷新后查看最新内容）">
            <div class="kv-list">
              <div v-for="field in projectConfigFields" :key="field.key" class="kv">
                <div class="kv-label">{{ field.label }}</div>
                <pre class="mono">{{ formatConfigValue(field.key) }}</pre>
              </div>
            </div>
          </n-card>
        </div>
        <div class="tail">【这是尾巴】</div>
      </div>
    </section>

    <PreprocessModule :uuid="props.uuid" />
    <AiAnalysisModule />
    <ReconstructionModule />
    <AiConsultModule />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProject, getProjectJson, type Project, type ProjectConfig } from '../api/projects'
import PreprocessModule from '../components/PreprocessModule.vue'
import AiAnalysisModule from '../components/AiAnalysisModule.vue'
import ReconstructionModule from '../components/ReconstructionModule.vue'
import AiConsultModule from '../components/AiConsultModule.vue'

const props = defineProps<{ uuid: string }>()
const router = useRouter()
const project = ref<Project | null>(null)
const projectConfig = ref<ProjectConfig | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const projectConfigFields = [
  { key: 'uuid', label: 'UUID' },
  { key: 'raw', label: 'raw（源文件）' },
  { key: 'nii', label: 'nii（转为 nii）' },
  { key: 'dcm', label: 'dcm（转为 dcm）' },
  { key: 'semi', label: 'semi（增强）' },
  { key: 'semi-xL', label: 'semi-xL（x 轴起点）' },
  { key: 'semi-xR', label: 'semi-xR（x 轴终点）' },
  { key: 'semi-yL', label: 'semi-yL（y 轴起点）' },
  { key: 'semi-yR', label: 'semi-yR（y 轴终点）' },
  { key: 'PD', label: 'PD（推理输入）' },
  { key: 'PD-nii', label: 'PD-nii（推理转 nii）' },
  { key: 'PD-dcm', label: 'PD-dcm（推理转 dcm）' },
  { key: 'PD-3d', label: 'PD-3d（生成 3d）' },
]

async function load() {
  loading.value = true
  error.value = null
  try {
    const [info, config] = await Promise.all([getProject(props.uuid), getProjectJson(props.uuid)])
    project.value = info
    projectConfig.value = config
  } catch (err: any) {
    console.error(err)
    error.value = err?.message || String(err)
  } finally {
    loading.value = false
  }
}

function formatTime(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function formatConfigValue(key: string) {
  if (!projectConfig.value) return '—'
  const value = (projectConfig.value as Record<string, unknown>)[key]
  if (value === undefined || value === null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

function goHome() {
  router.push({ name: 'home' })
}

onMounted(load)
</script>

<style scoped>
.project-view{width:100%;max-width:none;margin:0 auto;display:flex;flex-direction:column;gap:20px;padding:8px 6px;min-height:0}
.page-header{display:flex;align-items:center;justify-content:space-between;gap:16px}
.page-header h1{margin:0;font-size:22px}
.subtitle{margin:4px 0 0;color:rgba(75,85,99,0.95);font-size:13px}
.module{background:#fff;border-radius:10px;box-shadow:0 10px 30px rgba(2,6,23,0.12)}
.module-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--color-border)}
.module-head h2{margin:0;font-size:16px}
.module-body{padding:16px}
.state{padding:12px;border-radius:8px;background:#f8fafc;color:#334155}
.state.error{color:#b91c1c;background:#fef2f2}
.dev-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.panel :deep(.n-card__content){padding-top:6px}
.kv-list{display:flex;flex-direction:column;gap:10px}
.kv{display:flex;flex-direction:column;gap:6px}
.kv-label{font-size:12px;color:#64748b;font-weight:600}
.kv-value{font-size:13px;color:#1f2937}
.mono{white-space:pre-wrap;background:#f8fafc;padding:10px;border-radius:6px;font-size:12px;line-height:1.5;margin:0}
.tail{margin-top:12px;color:#475569;font-size:13px}
@media (max-width: 900px){
  .dev-grid{grid-template-columns:1fr}
  .page-header{flex-direction:column;align-items:flex-start}
}
</style>
