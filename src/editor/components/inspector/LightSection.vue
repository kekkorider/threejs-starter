<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '../../lib/format'
import { useEditorStore } from '../../stores/editor'
import PropRow from './PropRow.vue'
import Section from './Section.vue'

const store = useEditorStore()
const node = computed(() => store.selected)
const light = computed(() => node.value?.light ?? null)

function commit(read: (value: number) => void, event: Event): void {
  read(Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <Section v-if="node && light" title="Light" section-key="light">
    <PropRow label="Color">
      <input type="color" :value="light.color" @input="store.setLightColor(node.id, ($event.target as HTMLInputElement).value)" />
    </PropRow>
    <PropRow label="Energy">
      <input type="number" min="0" max="50" step="0.1" :value="formatNumber(light.intensity)" @change="commit((value) => store.setLightIntensity(node!.id, value), $event)" />
    </PropRow>
    <PropRow v-if="light.ground !== null" label="Ground">
      <input type="color" :value="light.ground" @input="store.setLightColor(node.id, ($event.target as HTMLInputElement).value, 'ground')" />
    </PropRow>
    <PropRow v-if="light.range !== null" label="Range">
      <input type="number" min="0" max="200" step="0.1" :value="formatNumber(light.range)" @change="commit((value) => store.setLightRange(node!.id, value), $event)" />
    </PropRow>
    <PropRow v-if="light.angle !== null" label="Angle">
      <input type="number" min="1" max="90" step="1" :value="formatNumber(light.angle)" @change="commit((value) => store.setSpotAngle(node!.id, value), $event)" />
    </PropRow>
    <PropRow v-if="light.penumbra !== null" label="Penumbra">
      <input type="number" min="0" max="1" step="0.01" :value="formatNumber(light.penumbra)" @change="commit((value) => store.setSpotPenumbra(node!.id, value), $event)" />
    </PropRow>
    <div v-if="light.aimable" class="hint">Rotate the node to aim it.</div>
  </Section>
</template>
