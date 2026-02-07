<template>
  <div id="app">
    <div class="container">
      <header class="nav">
        <div class="nav-left">哈基米</div>
        <nav class="nav-right">
          <n-space align="center" size="medium">
            <router-link to="/" custom v-slot="{ href }">
              <a :href="href" @click.prevent="handleNavClick('/', href)">打开项目</a>
            </router-link>
            <router-link to="/about" custom v-slot="{ href }">
              <a :href="href" @click.prevent="handleNavClick('/about', href)">南北绿豆</a>
            </router-link>
            <n-button v-if="showDevButton" size="small" tertiary @click="openDevModal">
              开发者模式
            </n-button>
          </n-space>
        </nav>
      </header> 

      <main class="page-body">
        <router-view />
      </main>
    </div>
  </div>

  <n-modal
    v-if="showLeaveConfirm"
    :show="showLeaveConfirm"
    teleported
    :mask-closable="false"
    :close-on-esc="false"
    @update:show="(v: boolean) => (showLeaveConfirm = v)"
  >
    <n-card class="modal-card" :bordered="false" role="dialog" aria-labelledby="leave-title">
      <template #header>
        <div class="modal-title">
          <span id="leave-title">是否离开当前项目</span>
        </div>
      </template>
      <div class="modal-body">确认离开当前项目页面？</div>
      <template #footer>
        <n-space justify="end">
          <n-button tertiary @click="showLeaveConfirm = false">取消</n-button>
          <n-button tertiary @click="openInNewTab">在新标签页中打开</n-button>
          <n-button type="primary" @click="confirmLeave">确定</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

const route = useRoute()
const router = useRouter()
const showDevButton = computed(() => route.name === 'project')
const showLeaveConfirm = ref(false)
const pendingTo = ref<RouteLocationRaw | null>(null)
const pendingHref = ref('')

function openDevModal() {
  window.dispatchEvent(new CustomEvent('open-dev-modal'))
}

function handleNavClick(to: RouteLocationRaw, href: string) {
  if (route.name !== 'project') {
    router.push(to)
    return
  }
  pendingTo.value = to
  pendingHref.value = href
  showLeaveConfirm.value = true
}

function confirmLeave() {
  if (pendingTo.value) {
    router.push(pendingTo.value)
  }
  showLeaveConfirm.value = false
}

function openInNewTab() {
  if (pendingHref.value) {
    window.open(pendingHref.value, '_blank')
  }
  showLeaveConfirm.value = false
}
</script>

<style scoped>
:root{--gap:16px;--accent:#3b82f6;--muted:#6b7280}
#app{min-height:100vh;display:flex;flex-direction:column}
.nav{height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 30px;border-bottom:1px solid #eee;background:linear-gradient(180deg,#fff, #fbfdff)}
.nav-left{font-weight:700}
.nav-right a{margin-left:16px;color:var(--muted);text-decoration:none}
.modal-card{width:min(92vw,520px);border-radius:12px;box-shadow:0 20px 50px rgba(2,6,23,0.2)}
.modal-title{display:flex;align-items:center;justify-content:space-between}
.modal-body{font-size:14px;color:#334155}
/* make the page body full-bleed and let children control inner width */
.page-body{flex:1;padding:24px;width:100%;min-height:0;height:calc(100vh - 64px);display:flex;flex-direction:column;overflow:auto}
.app-footer{height:36px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px;border-top:1px solid #f3f4f6}
</style>
