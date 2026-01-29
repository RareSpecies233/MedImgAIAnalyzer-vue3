<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listProjects, deleteProject, type Project } from '../api/projects'
import NewProjectModal from '../components/NewProjectModal.vue'

const router = useRouter()
const projects = ref<Project[]>([])
const loading = ref(false)
const selected = ref<Project | null>(null)
const showNew = ref(false)
const deleting = ref(false)
const showDeleteConfirm = ref(false)
const deleteConfirm = ref('')

async function load() {
  loading.value = true
  try {
    projects.value = await listProjects()
  } finally {
    loading.value = false
  }
}

async function confirmDelete() {
  if (!selected.value) return
  const v = deleteConfirm.value.trim().toLowerCase()
  if (v !== '是' && v !== 'yes') return alert('请输入“是”或“yes”以确认删除')
  deleting.value = true
  try {
    const res = await deleteProject(selected.value.uuid)
    if (!res.ok) throw new Error(await res.text())
    // 等待 200ms 后刷新并隐藏确认框
    setTimeout(() => {
      load()
      selected.value = null
      deleteConfirm.value = ''
      showDeleteConfirm.value = false
    }, 200)
  } catch (err: any) {
    console.error(err)
    alert('删除失败：' + (err.message || err))
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
  }
}

onMounted(load)

function select(p: Project) {
  selected.value = p
}

function openProject(p: Project) {
  // 跳转并传递 uuid
  router.push({ name: 'project', params: { uuid: p.uuid } })
}
</script>

<template>
  <div class="home-root">
    <section class="heading">
      <h1>打开项目</h1>
      <div class="actions">
        <n-button class="btn btn-secondary" tertiary size="small" @click="showNew = true">新建项目</n-button>
      </div> 
    </section>

    <div class="card-wrap">
      <section class="selector-area">
        <div class="list">
          <div v-if="loading" class="empty" role="status" aria-live="polite">正在加载项目…</div>
          <div v-else-if="projects.length === 0" class="empty" role="status" aria-live="polite">暂无项目</div>
          <ul v-else>
            <li
              v-for="p in projects"
              :key="p.uuid"
              :class="{active: selected && selected.uuid===p.uuid}"
              @click="select(p)"
              tabindex="0"
              role="button"
              :aria-selected="selected && selected.uuid===p.uuid"
              @keydown.enter.prevent="select(p)"
            >
              <div class="row">
                <div class="name">{{ p.name }}</div>
                <div class="meta">{{ new Date(p.updatedAt).toLocaleString() }}</div>
              </div>
              <div class="sub">创建：{{ new Date(p.createdAt).toLocaleDateString() }} · {{ (p.note||'').slice(0,24) }}{{ (p.note||'').length>24? '…':'' }}</div>
            </li>
          </ul>
        </div>

        <div class="detail" v-if="selected">
          <div class="detail-scroll">
            <h2>{{ selected.name }}</h2>
            <div class="fields">
              <div><strong>UUID：</strong>{{ selected.uuid }}</div>
              <div><strong>创建时间：</strong>{{ new Date(selected.createdAt).toLocaleString() }}</div>
              <div><strong>修改时间：</strong>{{ new Date(selected.updatedAt).toLocaleString() }}</div>
              <div class="note"><strong>备注：</strong><pre>{{ selected.note || '—' }}</pre></div>
            </div>
          </div>

          <div class="detail-actions">
            <n-button class="btn btn-danger" size="small" secondary @click="showDeleteConfirm = true; deleteConfirm = ''">删除项目</n-button>
            <n-button class="btn btn-primary" size="small" @click="openProject(selected)">打开项目</n-button>
          </div> 

          <!-- 删除确认区（内联实现，按 spec 要求输入 是 或 yes） -->
          <div class="confirm-box" v-show="showDeleteConfirm">
            <div class="confirm-row"><strong>是否要删除？</strong></div>
            <div class="confirm-row">请输入 <code>是</code> 或 <code>yes</code> 以确认：</div>
            <input v-model="deleteConfirm" placeholder="输入 是 或 yes" />
            <div class="confirm-row buttons">
              <button class="btn" @click="showDeleteConfirm = false; deleteConfirm = ''">取消</button>
              <button class="btn btn-danger" :disabled="deleting" @click="confirmDelete">确认删除</button>
            </div>
          </div>
        </div>

        <div class="detail empty-detail" v-else>
          <div class="empty-state" role="status" aria-live="polite">
            <p class="empty-title">暂无项目</p>
            <p class="empty-sub">创建第一个项目以开始分析，或从已有项目导入数据。</p>
            <n-button class="primary-cta" size="large" @click="showNew = true">创建第一个项目</n-button> 
          </div>
        </div>
      </section>
    </div>

    <NewProjectModal v-model:show="showNew" />
  </div>
</template>

<style scoped>
.home-root{display:flex;flex-direction:column;gap:20px;height:100%;max-width:1100px;margin:0 auto;padding:8px 6px;min-height:calc(100vh - 64px - 36px)}
.heading{display:flex;align-items:center;justify-content:space-between}
.heading h1{margin:0;font-size:22px}
.actions{display:flex;gap:12px}
/* 居中卡片：固定 min-height（视觉更紧凑）并在非常高的屏幕上限制最大高度 */
.card-wrap{display:flex;align-items:flex-start;justify-content:center;min-height:0}
/* 保持外层卡片高度稳定，内部滚动以避免切换项目时外框抖动 */
.selector-area{
  display:grid;
  /* prevent intrinsic content from growing the right column and causing layout shifts */
  grid-template-columns:420px minmax(0, 1fr);
  gap:28px;
  background:#fff;
  padding:22px;
  border-radius:10px;
  box-shadow:0 10px 30px rgba(2,6,23,0.12);
  align-items:stretch;
  flex:1 1 auto;
  /* 保持稳定高度（响应式）——内容超出时使用内部滚动而非外框伸缩 */
  height:clamp(520px, 55vh, 760px);
  max-height:calc(100vh - 220px);
  width:100%;
  max-width:1100px;
  margin:0 auto;
  overflow:hidden; /* 内部区域负责滚动 */
  transition: box-shadow 160ms ease; /* avoid transform transitions that cause scaling */
  will-change: box-shadow;
  /* Reserve scrollbar gutter to avoid layout shift when scrollbars appear */
  scrollbar-gutter: stable both-edges;
  /* containment improves layout stability for complex children */
  contain: layout;
}
.list{border-right:1px solid var(--color-border);padding-right:16px;display:flex;flex-direction:column;min-width:0}
.list .empty{flex:1;display:flex;align-items:center;justify-content:center}

/* allow detail column to shrink without forcing the grid wider */
.selector-area > .detail { min-width: 0; }
.list ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable}
.list li{padding:12px;border-radius:8px;cursor:pointer;transition:background-color 120ms ease, box-shadow 120ms ease;transform:none}
.list li:hover{background:linear-gradient(180deg,#fbfdff,#f7fbff)}
.list li.active{background:linear-gradient(90deg,#eef2ff,#fff);box-shadow:inset 0 0 0 1px rgba(59,130,246,0.06)}
.list li:focus{outline:3px solid rgba(122,208,255,0.14);outline-offset:2px}
.list li:active{transform:none}

/* prevent detail area scrollbar appearance from shifting layout */
.detail-scroll{flex:1;overflow:auto;padding-right:8px;min-height:0;scrollbar-gutter:stable}
.detail{transition: none; /* avoid layout/transform transitions on detail content changes */}
.row{display:flex;justify-content:space-between;align-items:center}
.name{font-weight:600;color:var(--color-heading)}
.meta{color:rgba(75,85,99,0.95);font-size:13px}
.sub{color:rgba(63,63,70,0.95);font-size:13px;margin-top:6px}
.detail{position:relative;display:flex;flex-direction:column;min-height:0}
.detail.empty-detail{display:flex;align-items:center;justify-content:center}
.detail-scroll{flex:1;overflow:auto;padding-right:8px;min-height:0}
.primary-cta{background:var(--accent);color:#0b1220;border:0;padding:10px 18px;border-radius:10px;box-shadow:0 12px 30px rgba(2,6,23,0.18);cursor:pointer}
.primary-cta:focus{outline:3px solid rgba(122,208,255,0.28);outline-offset:3px}
@media (max-width:820px){
  .selector-area{grid-template-columns:1fr;padding:14px;max-width:100%}
  .list{border-right:0;padding-right:0;margin-bottom:12px}
}
@media (min-width:1400px){
  .selector-area{grid-template-columns:480px minmax(0, 1fr)}
}

/* 响应式：窄屏时改为单列 */
@media (max-width:820px){
  .selector-area{grid-template-columns:1fr;padding:14px;max-width:100%}
  .list{border-right:0;padding-right:0;margin-bottom:12px}
}
.detail .fields{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.detail .note pre{white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:6px}
.detail-actions{display:flex;gap:12px;position:sticky;bottom:14px;background:linear-gradient(180deg,transparent,rgba(255,255,255,0.8));padding-top:12px}
.btn{padding:8px 12px;border-radius:6px;border:1px solid #e6e9ef;background:#fff;cursor:pointer;transition:background-color 120ms ease, box-shadow 120ms ease;transform:none}
.btn:active{transform:none}
.btn-primary{background:var(--accent);color:#fff;border-color:rgba(59,130,246,0.8)}
.btn-secondary{background:transparent;border:1px solid #e6e9ef}
.btn-danger{background:#ef4444;color:#fff;border-color:#ef4444}
.empty{color:rgba(75,85,99,0.9);padding:28px;text-align:center}
.empty-detail{display:flex;align-items:center;justify-content:center;color:rgba(75,85,99,0.9)}
.confirm-box{margin-top:18px;padding:12px;border-radius:8px;background:linear-gradient(180deg,#fff,#fff);box-shadow:0 1px 0 rgba(2,6,23,0.04)}
.confirm-row{margin:8px 0}
.confirm-row.buttons{display:flex;gap:10px}
.confirm-box input{padding:8px;border-radius:6px;border:1px solid #e6e9ef;width:220px}
</style>
