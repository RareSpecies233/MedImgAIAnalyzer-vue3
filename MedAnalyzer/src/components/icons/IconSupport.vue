<script setup lang="ts">
import Heart from '@vicons/tabler/Heart'
import { Icon } from '@vicons/utils'

const props = defineProps({
  size: { type: [String, Number], default: 20 },
  color: { type: String, default: 'currentColor' },
  tag: { type: String, default: 'span' }
})
</script>

<template>
  <Icon :size="props.size" :color="props.color" :tag="props.tag">
    <Heart />
  </Icon>
</template>
