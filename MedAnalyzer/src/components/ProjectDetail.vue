<template>
  <n-card class="pd-root">
    <template #header>
      <h2>{{ project.name }}</h2>
    </template>

    <div class="scroll">
      <n-descriptions column="1" size="small">
        <n-descriptions-item title="UUID">{{ project.uuid }}</n-descriptions-item>
        <n-descriptions-item title="创建">{{ new Date(project.createdAt).toLocaleString() }}</n-descriptions-item>
        <n-descriptions-item title="修改">{{ new Date(project.updatedAt).toLocaleString() }}</n-descriptions-item>
        <n-descriptions-item title="备注">
          <pre class="note-pre">{{ project.note || '—' }}</pre>
        </n-descriptions-item>
      </n-descriptions>
    </div>

    <template #action>
      <div class="sticky-actions">
        <slot name="actions" />
      </div>
    </template>
  </n-card>
</template>

<script setup lang="ts">
import { type Project } from '../api/projects'
const props = defineProps<{ project: Project }>()
</script>

<style scoped>
.pd-root{display:flex;flex-direction:column;min-height:260px}
.scroll{overflow:auto;padding-right:8px}
.field{margin:10px 0}
.note pre{white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:6px}
.sticky-actions{display:flex;gap:12px;position:sticky;bottom:10px;padding-top:10px;background:linear-gradient(180deg,transparent,rgba(255,255,255,0.9))}
</style>