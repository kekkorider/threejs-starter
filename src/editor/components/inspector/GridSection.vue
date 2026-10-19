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
  return ['grid', 'size', 'divisions', 'color', 'cell', 'center'].some((label) => label.includes(query.value))
})
</script>

<template>
  <Section v-if="visible" title="Grid" section-key="grid">
    <PropRow label="Visible">
      <label class="check">
        <input type="checkbox" :checked="grid.visible" @change="store.setGridVisible(($event.target as HTMLInputElement).checked)" />
      </label>
    </PropRow>
    <PropRow label="Size">
      <input type="number" min="1" max="400" step="1" :value="formatNumber(grid.size)" @change="store.setGridSize(Number(($event.target as HTMLInputElement).value))" />
    </PropRow>
    <PropRow label="Divisions">
      <input type="number" min="1" max="200" step="1" :value="formatNumber(grid.divisions)" @change="store.setGridDivisions(Number(($event.target as HTMLInputElement).value))" />
    </PropRow>
    <PropRow label="Center">
      <input type="color" :value="grid.center" @input="store.setGridCenter(($event.target as HTMLInputElement).value)" />
    </PropRow>
    <PropRow label="Cell">
      <input type="color" :value="grid.color" @input="store.setGridColor(($event.target as HTMLInputElement).value)" />
    </PropRow>
    <div class="hint">Position is fixed at 0, 0, 0.</div>
  </Section>
</template>
