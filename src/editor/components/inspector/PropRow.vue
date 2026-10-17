<script setup lang="ts">
import { bindScrub } from '../../lib/scrub'

const props = defineProps<{ label: string, scrub?: boolean }>()
const emit = defineEmits<{ scrub: [delta: number] }>()

function onPointer(event: PointerEvent): void {
  if (!props.scrub) return
  bindScrub(event, (delta) => emit('scrub', delta))
}
</script>

<template>
  <div class="prop">
    <div class="prop-label" :class="{ scrub }" @pointerdown="onPointer">{{ label }}</div>
    <slot />
  </div>
</template>
