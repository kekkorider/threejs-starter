<script setup lang="ts">
import { bindScrub } from '../../lib/scrub'
import { useEditorStore } from '../../stores/editor'

const props = defineProps<{ label: string, scrub?: boolean, reset?: () => void }>()
const emit = defineEmits<{ scrub: [delta: number] }>()
const store = useEditorStore()

function onPointer(event: PointerEvent): void {
  if (!props.scrub) return
  bindScrub(event, (delta) => emit('scrub', delta))
}

function onContext(event: MouseEvent): void {
  if (!props.reset) return
  event.preventDefault()
  store.openPropertyMenu(event.clientX, event.clientY, props.reset)
}
</script>

<template>
  <div class="prop" @contextmenu="onContext">
    <div class="prop-label" :class="{ scrub }" :title="reset ? 'Right-click to reset' : undefined" @pointerdown="onPointer">{{ label }}</div>
    <slot />
  </div>
</template>
