<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listProjects, deleteProject, updateProjectNote, type Project, ServerOfflineError } from '../api/projects'
import NewProjectModal from '../components/NewProjectModal.vue'

const router = useRouter()
const projects = ref<Project[]>([])
const loading = ref(false)
const selected = ref<Project | null>(null)
const showNew = ref(false)
const deleting = ref(false)
const showDeleteConfirm = ref(false)
const deleteConfirm = ref('')
const isEditingNote = ref(false)
const savingNote = ref(false)
const noteDraft = ref('')
const serverOffline = ref(false)

async function load() {
  loading.value = true
  serverOffline.value = false
  try {
    projects.value = await listProjects()
  } catch (err: any) {
    if (err instanceof ServerOfflineError) {
      serverOffline.value = true
      projects.value = []
      selected.value = null
      return
    }
    console.error(err)
    alert('加载失败：' + (err?.message || err))
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

watch(selected, (next) => {
  if (!next) {
    isEditingNote.value = false
    noteDraft.value = ''
    return
  }
  isEditingNote.value = false
  showDeleteConfirm.value = false
  deleteConfirm.value = ''
  noteDraft.value = next.note || ''
})

function openProject(p: Project) {
  // 跳转并传递 uuid
  router.push({ name: 'project', params: { uuid: p.uuid } })
}

function handleCreated(project: Project) {
  projects.value = [project, ...projects.value.filter((p) => p.uuid !== project.uuid)].sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
  )
  selected.value = project
}

function handleEnter(project: Project) {
  handleCreated(project)
  openProject(project)
}

function startEditNote() {
  if (!selected.value) return
  noteDraft.value = selected.value.note || ''
  isEditingNote.value = true
  showDeleteConfirm.value = false
  deleteConfirm.value = ''
}

function cancelEditNote() {
  if (!selected.value) return
  noteDraft.value = selected.value.note || ''
  isEditingNote.value = false
}

async function saveNote() {
  if (!selected.value) return
  savingNote.value = true
  try {
    const updated = await updateProjectNote(selected.value.uuid, noteDraft.value)
    selected.value = updated
    projects.value = projects.value.map((p) => (p.uuid === updated.uuid ? updated : p))
    isEditingNote.value = false
  } catch (err: any) {
    console.error(err)
    alert('修改备注失败：' + (err?.message || err))
  } finally {
    savingNote.value = false
  }
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
          <div v-else-if="projects.length === 0" class="empty" role="status" aria-live="polite">
            <div class="empty-block">
              <p v-if="serverOffline">错误：服务器离线</p>
              <p v-else>暂无项目，请先创建项目</p>
              <n-button v-if="serverOffline" size="small" tertiary :loading="loading" @click="load">刷新</n-button>
            </div>
          </div>
          <ul v-else>
            <li
              v-for="p in projects"
              :key="p.uuid"
              :class="{active: selected && selected.uuid===p.uuid}"
              @click="select(p)"
              tabindex="0"
              role="button"
              :aria-selected="selected?.uuid === p.uuid"
              :aria-controls="'project-detail'"
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



        <!-- 详情面板：使用 transition 实现入场/出场动画（视觉折叠由 grid-template-columns 实现） -->
        <transition name="detail-pop" mode="out-in" appear>
          <div class="detail" id="project-detail" role="region" aria-label="项目详情" tabindex="-1">
            <div class="detail-scroll">
              <template v-if="selected">
                <h2>{{ selected.name }}</h2>
                <div class="fields">
                  <div class="uuid">
                    <strong>UUID：</strong>
                    <pre class="note-pre">{{ selected.uuid }}</pre>
                  </div>
                  <div><strong>创建时间：</strong>{{ new Date(selected.createdAt).toLocaleString() }}</div>
                  <div><strong>修改时间：</strong>{{ new Date(selected.updatedAt).toLocaleString() }}</div>
                  <div class="note">
                    <strong>备注：</strong>
                    <template v-if="isEditingNote">
                      <textarea v-model="noteDraft" class="note-edit" rows="6" />
                    </template>
                    <template v-else>
                      <pre class="note-pre">{{ selected.note || '—' }}</pre>
                    </template>
                  </div>
                </div>

                <div class="detail-actions">
                  <template v-if="!isEditingNote">
                    <n-button class="btn btn-danger" size="small" secondary @click="showDeleteConfirm = true; deleteConfirm = ''">删除项目</n-button>
                    <n-button class="btn btn-primary btn-open" size="small" @click="openProject(selected)">打开项目</n-button>
                    <n-button class="btn btn-secondary btn-edit" size="small" tertiary @click="startEditNote">修改备注</n-button>
                  </template>
                  <template v-else>
                    <n-button class="btn btn-primary btn-save" size="small" :loading="savingNote" @click="saveNote">保存备注</n-button>
                    <n-button class="btn btn-secondary btn-cancel" size="small" tertiary :disabled="savingNote" @click="cancelEditNote">取消修改</n-button>
                  </template>
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
              </template>
              <template v-else>
                <div class="empty-state" role="status" aria-live="polite">
                  <p class="empty-title">请打开项目</p>
                </div>
              </template>
            </div>
          </div>
        </transition>
      </section>
    </div>

    <NewProjectModal v-model:show="showNew" @created="handleCreated" @enter="handleEnter" />
  </div>
</template>

<style scoped>
.home-root{display:flex;flex-direction:column;gap:20px;height:100%;max-width:1100px;margin:0 auto;padding:8px 6px;min-height:0;width:100%;overflow:hidden}
.heading{display:flex;align-items:center;justify-content:space-between}
.heading h1{margin:0;font-size:22px}
.actions{display:flex;gap:12px}
/* 居中卡片：固定 min-height（视觉更紧凑）并在非常高的屏幕上限制最大高度 */
.card-wrap{display:flex;align-items:stretch;justify-content:center;flex:1;min-height:0;width:100%;overflow:hidden}
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
  height:100%;
  width:100%;
  min-width:100%;
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
.list{border-right:1px solid var(--color-border);padding-right:16px;display:flex;flex-direction:column;min-width:0;min-height:0}

/* 详情面板：入场使用位移+淡入，出场使用淡出+反向位移 */
.selector-area .detail{will-change:transform,opacity;overflow:hidden;display:flex;flex-direction:column;min-height:0;height:100%}
.detail-pop-enter-from{opacity:0;transform:translateX(14px) scale(.996)}
.detail-pop-enter-active{transition:opacity 200ms ease, transform 260ms cubic-bezier(.2,.9,.2,1)}
.detail-pop-enter-to{opacity:1;transform:none}
.detail-pop-leave-from{opacity:1;transform:none}
.detail-pop-leave-active{transition:opacity 180ms ease, transform 180ms ease}
.detail-pop-leave-to{opacity:0;transform:translateX(10px) scale(.996);pointer-events:none}

/* 可复用的无障碍隐藏类（保留在 DOM 中以便屏读器访问） */

/* Respect user preference for reduced motion */
@media (prefers-reduced-motion: reduce){
  .selector-area, .detail-pop-enter-active, .detail-pop-leave-active{transition:none !important}
  .detail-pop-enter-from, .detail-pop-leave-to{transform:none;opacity:1}
}
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
.detail-scroll{flex:1;overflow:auto;padding-right:8px;min-height:0;max-height:100%;scrollbar-gutter:stable;padding-bottom:72px}
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
.detail .fields{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.note-pre{white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:6px;font-size:13px;line-height:1.5;margin:6px 0 0}
.detail .note .note-edit{width:100%;resize:vertical;background:#f8fafc;border:1px solid #e6e9ef;border-radius:6px;padding:10px;min-height:120px;font-family:inherit;font-size:13px;line-height:1.5;white-space:pre-wrap}
.detail-actions{display:flex;gap:12px;position:sticky;bottom:0;background:linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,0.85) 40%,#fff);padding:14px 0 8px;z-index:2}
.detail-actions::after{content:"";position:absolute;left:0;right:0;bottom:-8px;height:8px;background:#fff}
.btn{padding:8px 12px;border-radius:6px;border:1px solid #e6e9ef;background:#fff;cursor:pointer;transition:background-color 120ms ease, box-shadow 120ms ease;transform:none}
.btn:active{transform:none}
.btn-primary{background:var(--accent);color:#22c55e;border-color:rgba(59,130,246,0.8)}
.btn-secondary{background:transparent;border:1px solid #e6e9ef}
.btn-danger{background:#fff;color:#ef4444;border-color:#ef4444}
.btn-open{border-color:#22c55e}
.btn-save{border-color:#22c55e}
.btn-edit{border-color:#93c5fd}
.btn-cancel{border-color:#ef4444}
.empty{color:rgba(75,85,99,0.9);padding:28px;text-align:center}
.empty-detail{display:flex;align-items:center;justify-content:center;color:rgba(75,85,99,0.9)}
.empty-state{display:flex;align-items:center;justify-content:center;height:100%;color:rgba(75,85,99,0.9)}
.confirm-box{margin-top:18px;padding:12px;border-radius:8px;background:linear-gradient(180deg,#fff,#fff);box-shadow:0 1px 0 rgba(2,6,23,0.04)}
.confirm-row{margin:8px 0}
.confirm-row.buttons{display:flex;gap:10px}
.confirm-box input{padding:8px;border-radius:6px;border:1px solid #e6e9ef;width:220px}
</style>
