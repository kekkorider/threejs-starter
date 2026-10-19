<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatNumber } from '../../lib/format'
import { useEditorStore } from '../../stores/editor'
import PropRow from './PropRow.vue'
import Section from './Section.vue'

const store = useEditorStore()
const node = computed(() => store.selected)
const light = computed(() => node.value?.light ?? null)
const target = ref({ x: '0', y: '0', z: '0' })

function commit(read: (value: number) => void, event: Event): void {
  read(Number((event.target as HTMLInputElement).value))
}

function pullTarget(): void {
  const id = node.value?.id
  if (!id) return
  const look = store.readLookAt(id)
  if (!look) return
  const active = document.activeElement
  for (const axis of ['x', 'y', 'z'] as const) {
    if (active instanceof HTMLInputElement && active.dataset.look === '1' && active.dataset.axis === axis) continue
    target.value[axis] = formatNumber(look[axis])
  }
}

watch(() => store.transformTick, pullTarget)
watch(() => store.revision, pullTarget)
watch(() => store.selectedId, pullTarget)
pullTarget()

function writeTarget(axis: 'x' | 'y' | 'z', value: number): void {
  const id = node.value?.id
  if (!id || !Number.isFinite(value)) return
  target.value[axis] = formatNumber(value)
  store.setLookAt(id, axis, value)
}

function resetEnabled(): void {
  const id = node.value?.id
  if (id) store.resetLookAtEnabled(id)
}

function resetTarget(): void {
  const id = node.value?.id
  if (id) store.resetLookAt(id)
}

function resetField(field: 'color' | 'ground' | 'intensity' | 'range' | 'angle' | 'penumbra'): void {
  const id = node.value?.id
  if (id) store.resetLight(id, field)
}
</script>

<template>
  <Section v-if="node && light" title="Light" section-key="light">
    <PropRow label="Color" :reset="() => resetField('color')">
      <input type="color" :value="light.color" @input="store.setLightColor(node.id, ($event.target as HTMLInputElement).value)" />
    </PropRow>
    <PropRow label="Energy" :reset="() => resetField('intensity')">
      <input type="number" min="0" max="50" step="0.1" :value="formatNumber(light.intensity)" @change="commit((value) => store.setLightIntensity(node!.id, value), $event)" />
    </PropRow>
    <PropRow v-if="light.ground !== null" label="Ground" :reset="() => resetField('ground')">
      <input type="color" :value="light.ground" @input="store.setLightColor(node.id, ($event.target as HTMLInputElement).value, 'ground')" />
    </PropRow>
    <PropRow v-if="light.range !== null" label="Range" :reset="() => resetField('range')">
      <input type="number" min="0" max="200" step="0.1" :value="formatNumber(light.range)" @change="commit((value) => store.setLightRange(node!.id, value), $event)" />
    </PropRow>
    <PropRow v-if="light.angle !== null" label="Angle" :reset="() => resetField('angle')">
      <input type="number" min="1" max="90" step="1" :value="formatNumber(light.angle)" @change="commit((value) => store.setSpotAngle(node!.id, value), $event)" />
    </PropRow>
    <PropRow v-if="light.penumbra !== null" label="Penumbra" :reset="() => resetField('penumbra')">
      <input type="number" min="0" max="1" step="0.01" :value="formatNumber(light.penumbra)" @change="commit((value) => store.setSpotPenumbra(node!.id, value), $event)" />
    </PropRow>
    <PropRow v-if="light.lookAt" label="Look at" :reset="resetEnabled">
      <label class="check">
        <input type="checkbox" :checked="light.lookAt.enabled" @change="store.setLookAtEnabled(node.id, ($event.target as HTMLInputElement).checked)" />
      </label>
    </PropRow>
    <PropRow v-if="light.lookAt?.enabled" label="Target" :reset="resetTarget">
      <div class="vec3">
        <template v-for="axis in (['x', 'y', 'z'] as const)" :key="axis">
          <span class="axis" :class="axis">{{ axis }}</span>
          <input
            type="number"
            step="0.1"
            data-look="1"
            :data-axis="axis"
            :value="target[axis]"
            @change="writeTarget(axis, Number(($event.target as HTMLInputElement).value))"
          />
        </template>
      </div>
    </PropRow>
    <div v-if="light.lookAt && !light.lookAt.enabled" class="hint">Look at is off. Rotate the node to aim it.</div>
    <div v-else-if="light.lookAt?.enabled" class="hint">The light aims at the target point.</div>
  </Section>
</template>
