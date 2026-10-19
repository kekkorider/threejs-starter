<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '../../lib/format'
import { useEditorStore } from '../../stores/editor'
import PropRow from './PropRow.vue'
import Section from './Section.vue'

const store = useEditorStore()
const node = computed(() => store.selected)
const grid = computed(() => store.gridSettings)
const query = computed(() => store.inspectorFilter.trim().toLowerCase())
const visible = computed(() => {
  if (!node.value?.isRoot) return false
  if (!query.value) return true
  return ['grid', 'size', 'divisions', 'color', 'cell', 'center', 'position'].some((label) => label.includes(query.value))
})

function writePosition(axis: 'x' | 'y' | 'z', event: Event): void {
  store.setGridPosition(axis, Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <Section v-if="visible" title="Grid" section-key="grid">
    <PropRow label="Visible" :reset="() => store.resetGrid('visible')">
      <label class="check">
        <input type="checkbox" :checked="grid.visible" @change="store.setGridVisible(($event.target as HTMLInputElement).checked)" />
      </label>
    </PropRow>
    <PropRow label="Position" :reset="() => store.resetGrid('position')">
      <div class="vec3">
        <template v-for="axis in (['x', 'y', 'z'] as const)" :key="axis">
          <span class="axis" :class="axis">{{ axis }}</span>
          <input type="number" step="0.1" :value="formatNumber(grid.position[axis])" @change="writePosition(axis, $event)" />
        </template>
      </div>
    </PropRow>
    <PropRow label="Size" :reset="() => store.resetGrid('size')">
      <input type="number" min="1" max="400" step="1" :value="formatNumber(grid.size)" @change="store.setGridSize(Number(($event.target as HTMLInputElement).value))" />
    </PropRow>
    <PropRow label="Divisions" :reset="() => store.resetGrid('divisions')">
      <input type="number" min="1" max="200" step="1" :value="formatNumber(grid.divisions)" @change="store.setGridDivisions(Number(($event.target as HTMLInputElement).value))" />
    </PropRow>
    <PropRow label="Center" :reset="() => store.resetGrid('center')">
      <input type="color" :value="grid.center" @input="store.setGridCenter(($event.target as HTMLInputElement).value)" />
    </PropRow>
    <PropRow label="Cell" :reset="() => store.resetGrid('color')">
      <input type="color" :value="grid.color" @input="store.setGridColor(($event.target as HTMLInputElement).value)" />
    </PropRow>
  </Section>
</template>
