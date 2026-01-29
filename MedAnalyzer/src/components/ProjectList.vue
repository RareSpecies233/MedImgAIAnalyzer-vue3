<template>
  <div>
    <slot name="header" />
    <n-list class="plist" bordered>
      <template v-for="p in projects" :key="p.uuid">
        <n-list-item
          class="item"
          :aria-label="`打开 ${p.name}`"
          tabindex="0"
          @click="$emit('select', p)"
          @keydown.enter.prevent="$emit('select', p)"
        >
          <div class="title">{{ p.name }}</div>
          <div class="meta">{{ new Date(p.updatedAt).toLocaleString() }}</div>
          <div class="note">{{ (p.note||'').slice(0,28) }}{{ (p.note||'').length>28 ? '…' : '' }}</div>
        </n-list-item>
      </template>
    </n-list> 
  </div>
</template>

<script setup lang="ts">
import { type Project } from '../api/projects'
const props = defineProps<{ projects: Project[] }>()
</script>

<style scoped>
.plist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.item{padding:10px;border-radius:10px;border:1px solid var(--color-border);cursor:pointer;background:linear-gradient(180deg,#fff,#fff)}
.item:focus{outline:3px solid rgba(122,208,255,0.16);outline-offset:3px}
.title{font-weight:600;color:var(--color-heading)}
.meta{color:rgba(75,85,99,0.9);font-size:12px}
.note{color:rgba(63,63,70,0.95);font-size:13px;margin-top:6px}
</style>