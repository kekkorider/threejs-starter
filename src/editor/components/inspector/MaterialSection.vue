<script setup lang="ts">
import { computed } from 'vue'
import { TSL_PRESETS, type MaterialSide } from '../../tsl'
import { useEditorStore } from '../../stores/editor'
import PropRow from './PropRow.vue'
import Section from './Section.vue'

const store = useEditorStore()
const node = computed(() => store.selected)
const material = computed(() => node.value?.material ?? null)

function openMenu(event: MouseEvent): void {
  const id = node.value?.id
  if (!id) return
  store.openMaterialMenu(id, event.currentTarget as HTMLElement)
}

function onPreset(event: Event): void {
  store.applyNodePreset((event.target as HTMLSelectElement).value)
}

function onSide(event: Event): void {
  if (!material.value) return
  store.setMaterialFlags(material.value.id, { side: (event.target as HTMLSelectElement).value as MaterialSide })
}

function onName(event: Event): void {
  if (!material.value) return
  store.setMaterialName(material.value.id, (event.target as HTMLInputElement).value)
}
</script>

<template>
  <Section v-if="node?.hasGeometry" title="Material" section-key="material" tone="sub mat">
    <PropRow label="Material">
      <button type="button" class="resource-btn" @click="openMenu">{{ material?.name ?? 'Empty' }}</button>
    </PropRow>
    <template v-if="material">
      <PropRow label="Name" :reset="() => store.resetMaterialName(material.id)">
        <input type="text" :value="material.name" @change="onName" />
      </PropRow>
      <PropRow label="Preset" :reset="() => store.resetMaterialSource(material.id)">
        <select :value="material.presetId" @change="onPreset">
          <option value="custom">Custom</option>
          <option v-for="preset in TSL_PRESETS" :key="preset.id" :value="preset.id">{{ preset.name }}</option>
        </select>
      </PropRow>
      <PropRow label="Cull" :reset="() => store.resetMaterialFlag(material.id, 'side')">
        <select :value="material.side" @change="onSide">
          <option value="front">Front</option>
          <option value="back">Back</option>
          <option value="double">Double</option>
        </select>
      </PropRow>
      <PropRow label="Transparent" :reset="() => store.resetMaterialFlag(material.id, 'transparent')">
        <label class="check">
          <input type="checkbox" :checked="material.transparent" @change="store.setMaterialFlags(material.id, { transparent: ($event.target as HTMLInputElement).checked })" />
        </label>
      </PropRow>
      <PropRow label="Wireframe" :reset="() => store.resetMaterialFlag(material.id, 'wireframe')">
        <label class="check">
          <input type="checkbox" :checked="material.wireframe" @change="store.setMaterialFlags(material.id, { wireframe: ($event.target as HTMLInputElement).checked })" />
        </label>
      </PropRow>
      <PropRow label="">
        <button type="button" class="btn" @click="store.bottomTab = 'tsl'">Edit TSL</button>
      </PropRow>
      <div v-if="material.error" class="hint">{{ material.error }}</div>
    </template>
    <div v-else class="hint">Assign a TSL material to drive this surface with Three Shading Language.</div>
  </Section>
</template>
