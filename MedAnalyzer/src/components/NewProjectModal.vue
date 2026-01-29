<template>
  <n-dialog :show="props.show" :closable="false" @update:show="(v) => emit('update:show', v)">
    <template #title>
      <div class="modal-title">
        <span id="new-project-title">新建项目</span>
        <n-space>
          <n-button quaternary size="small" ref="closeBtn" @click="close" aria-label="关闭对话框">✕</n-button>
        </n-space>
      </div>
    </template>

    <div class="body">
      <div class="dev">正在开发中</div>
      <p class="hint">（临时：新建功能尚未实现，后续会打开创建表单）</p>
    </div>

    <template #action>
      <n-space justify="end">
        <n-button tertiary @click="close">关闭</n-button>
      </n-space>
    </template>
  </n-dialog>
</template> 

<script setup lang="ts">
import { nextTick, watch, ref } from 'vue'
const emit = defineEmits(['update:show'])
const props = defineProps<{ show: boolean }>()
const closeBtn = ref<HTMLElement | null>(null)
function close() {
  emit('update:show', false)
}
watch(() => props.show, (v) => {
  if (v) nextTick(() => closeBtn.value?.focus())
})
</script>

<style scoped>
.overlay{position:fixed;inset:0;background:rgba(2,6,23,0.4);display:flex;align-items:center;justify-content:center;z-index:60}
.modal{width:520px;background:#fff;border-radius:10px;padding:18px;box-shadow:0 20px 50px rgba(2,6,23,0.2)}
.modal header{display:flex;justify-content:space-between;align-items:center}
.modal .body{padding:22px 0}
.dev{font-size:22px;font-weight:700;color:#111}
.hint{color:rgba(63,63,70,0.85);margin-top:8px}
.close{background:transparent;border:0;font-size:18px;cursor:pointer}
.close:focus{outline:3px solid rgba(122,208,255,0.28);outline-offset:3px;border-radius:6px}
footer{display:flex;justify-content:flex-end}
.btn{padding:8px 12px;border-radius:6px;border:1px solid #e6e9ef;background:#fff;cursor:pointer}
</style>