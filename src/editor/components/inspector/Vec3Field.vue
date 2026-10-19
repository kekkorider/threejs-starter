<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatNumber } from '../../lib/format'
import { bindScrub } from '../../lib/scrub'
import { useEditorStore } from '../../stores/editor'
import PropRow from './PropRow.vue'

const props = defineProps<{
  label: string
  axis: 'pos' | 'rot' | 'scl'
  sensitivity?: number
}>()

const store = useEditorStore()
const values = ref({ x: '0', y: '0', z: '0' })
const inputs: Record<'x' | 'y' | 'z', HTMLInputElement | null> = { x: null, y: null, z: null }

function pull(): void {
  const id = store.selectedId
  if (!id) return
  const live = store.readTransform(id)
  if (!live) return
  const source = props.axis === 'pos' ? live.position : props.axis === 'rot' ? live.rotation : live.scale
  for (const key of ['x', 'y', 'z'] as const) {
    if (document.activeElement === inputs[key]) continue
    values.value[key] = formatNumber(source[key])
  }
}

watch(() => store.transformTick, pull)
watch(() => store.selectedId, pull)
watch(() => store.revision, pull)
pull()

function write(key: 'x' | 'y' | 'z', raw: number): void {
  const id = store.selectedId
  if (!id || !Number.isFinite(raw)) return
  values.value[key] = formatNumber(raw)
  if (props.axis === 'pos') store.setPosition(id, key, raw)
  else if (props.axis === 'rot') store.setRotation(id, key, raw)
  else store.setScale(id, key, raw)
}

function onScrub(key: 'x' | 'y' | 'z', event: PointerEvent): void {
  bindScrub(event, (delta) => {
    const sensitivity = props.sensitivity ?? 0.01
    write(key, Number(values.value[key]) + delta * sensitivity)
  })
}

function setInput(key: 'x' | 'y' | 'z', element: Element | null): void {
  inputs[key] = element as HTMLInputElement | null
}

function reset(): void {
  const id = store.selectedId
  if (!id) return
  store.resetTransform(id, props.axis)
}
</script>

<template>
  <PropRow :label="label" :reset="reset">
    <div class="vec3">
      <template v-for="key in (['x', 'y', 'z'] as const)" :key="key">
        <span class="axis" :class="key" @pointerdown="onScrub(key, $event)">{{ key }}</span>
        <input
          :ref="(element) => setInput(key, element as Element | null)"
          type="number"
          step="0.01"
          :value="values[key]"
          @change="write(key, Number(($event.target as HTMLInputElement).value))"
        />
      </template>
    </div>
  </PropRow>
</template>
