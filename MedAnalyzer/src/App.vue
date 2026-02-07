<template>
  <div id="app">
    <div class="container">
      <header class="nav">
        <div class="nav-left">哈基米</div>
        <nav class="nav-right">
          <n-space align="center" size="medium">
            <router-link to="/">打开项目</router-link>
            <router-link to="/about">南北绿豆</router-link>
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const showDevButton = computed(() => route.name === 'project')

function openDevModal() {
  window.dispatchEvent(new CustomEvent('open-dev-modal'))
}
</script>

<style scoped>
:root{--gap:16px;--accent:#3b82f6;--muted:#6b7280}
#app{min-height:100vh;display:flex;flex-direction:column}
.nav{height:40px;display:flex;align-items:center;justify-content:space-between;padding:0 30px;border-bottom:1px solid #eee;background:linear-gradient(180deg,#fff, #fbfdff)}
.nav-left{font-weight:700}
.nav-right a{margin-left:16px;color:var(--muted);text-decoration:none}
/* make the page body full-bleed and let children control inner width */
.page-body{flex:1;padding:24px;width:100%;min-height:0;height:calc(100vh - 64px);display:flex;flex-direction:column;overflow:auto}
.app-footer{height:36px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px;border-top:1px solid #f3f4f6}
</style>
