<script setup lang="ts">
import Wrench from '@vicons/tabler/Wrench'
import { Icon } from '@vicons/utils'

const props = defineProps({
  size: { type: [String, Number], default: 24 },
  color: { type: String, default: 'currentColor' },
  tag: { type: String, default: 'span' }
})
</script>

<template>
  <Icon :size="props.size" :color="props.color" :tag="props.tag">
    <Wrench />
  </Icon>
</template>