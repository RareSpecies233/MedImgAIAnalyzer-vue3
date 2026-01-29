<script setup lang="ts">
import Layers from '@vicons/tabler/Layers'
import { Icon } from '@vicons/utils'

const props = defineProps({
  size: { type: [String, Number], default: 18 },
  color: { type: String, default: 'currentColor' },
  tag: { type: String, default: 'span' }
})
</script>

<template>
  <Icon :size="props.size" :color="props.color" :tag="props.tag">
    <Layers />
  </Icon>
</template>
