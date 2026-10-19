<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '../../lib/format'
import { useEditorStore } from '../../stores/editor'
import type { ShadowTypeName } from '../../state'
import PropRow from './PropRow.vue'
import Section from './Section.vue'

const store = useEditorStore()
const node = computed(() => store.selected)
const scene = computed(() => store.sceneSettings)
const query = computed(() => store.inspectorFilter.trim().toLowerCase())
const visible = computed(() => {
  if (!node.value?.isRoot) return false
  if (!query.value) return true
  return ['scene', 'background', 'environment', 'shadow'].some((label) => label.includes(query.value))
})

function onIntensity(kind: 'background' | 'environment', event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (kind === 'background') store.setBackgroundIntensity(value)
  else store.setEnvironmentIntensity(value)
}
</script>

<template>
  <Section v-if="visible" title="Scene" section-key="scene">
    <PropRow label="Background" :reset="() => store.resetScene('background')">
      <input type="color" :value="scene.background" @input="store.setBackground(($event.target as HTMLInputElement).value)" />
    </PropRow>
    <PropRow label="Background Intensity" :reset="() => store.resetScene('backgroundIntensity')">
      <input type="number" min="0" max="10" step="0.05" :value="formatNumber(scene.backgroundIntensity)" @change="onIntensity('background', $event)" />
    </PropRow>
    <PropRow label="Environment Intensity" :reset="() => store.resetScene('environmentIntensity')">
      <input type="number" min="0" max="10" step="0.05" :value="formatNumber(scene.environmentIntensity)" @change="onIntensity('environment', $event)" />
    </PropRow>
    <PropRow label="Shadows" :reset="() => store.resetScene('shadows')">
      <label class="check">
        <input type="checkbox" :checked="scene.shadows" @change="store.setShadows(($event.target as HTMLInputElement).checked)" />
      </label>
    </PropRow>
    <PropRow label="Shadow Type" :reset="() => store.resetScene('shadowType')">
      <select :value="scene.shadowType" @change="store.setShadowType(($event.target as HTMLSelectElement).value as ShadowTypeName)">
        <option value="basic">Basic</option>
        <option value="pcf">PCF</option>
        <option value="vsm">VSM</option>
      </select>
    </PropRow>
  </Section>
</template>
