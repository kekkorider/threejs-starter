<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '../../lib/format'
import type { AmbientSource, BackgroundMode, EnvironmentNumberField, FogMode } from '../../environment'
import { useEditorStore } from '../../stores/editor'
import type { ShadowTypeName } from '../../state'
import PropRow from './PropRow.vue'
import Section from './Section.vue'

const store = useEditorStore()
const node = computed(() => store.selected)
const env = computed(() => node.value?.environment ?? null)
const settings = computed(() => env.value?.settings ?? null)
const query = computed(() => store.inspectorFilter.trim().toLowerCase())

function show(labels: string[]): boolean {
  if (!query.value) return true
  return labels.some((label) => label.includes(query.value))
}

function onNumber(field: EnvironmentNumberField, event: Event): void {
  const id = node.value?.id
  if (!id) return
  store.setEnvironmentNumber(id, field, Number((event.target as HTMLInputElement).value))
}

const showSkyContribution = computed(() => {
  const source = settings.value?.ambientSource
  return source === 'color' || source === 'background'
})
</script>

<template>
  <template v-if="node && env && settings && node.kind === 'WorldEnvironment'">
    <p v-if="env.total > 1" class="env-note" :class="env.active ? 'active' : 'inactive'">
      {{ env.active
        ? 'Active. This is the WorldEnvironment closest to the root.'
        : `Inactive. The viewport uses ${env.activeName}, the WorldEnvironment closest to the root.` }}
    </p>
    <Section v-if="show(['background', 'environment', 'color', 'energy', 'sky', 'canvas'])" title="Background" section-key="env-background">
      <PropRow label="Mode" :reset="() => store.resetEnvironment(node.id, 'backgroundMode')">
        <select :value="settings.backgroundMode" @change="store.setEnvironmentBackgroundMode(node.id, ($event.target as HTMLSelectElement).value as BackgroundMode)">
          <option value="color">Color</option>
          <option value="sky">Sky</option>
          <option value="canvas">Canvas</option>
        </select>
      </PropRow>
      <p v-if="settings.backgroundMode === 'sky'" class="env-note">Draws a sky behind the scene. The environment map still lights the scene.</p>
      <p v-else-if="settings.backgroundMode === 'canvas'" class="env-note">Draws no 3D background. The panel behind the viewport shows through.</p>
      <PropRow v-if="settings.backgroundMode === 'color'" label="Color" :reset="() => store.resetEnvironment(node.id, 'backgroundColor')">
        <input type="color" :value="settings.backgroundColor" @input="store.setEnvironmentColor(node.id, 'backgroundColor', ($event.target as HTMLInputElement).value)" />
      </PropRow>
      <PropRow v-if="settings.backgroundMode !== 'canvas'" label="Energy" :reset="() => store.resetEnvironment(node.id, 'backgroundEnergy')">
        <input type="number" min="0" max="10" step="0.05" :value="formatNumber(settings.backgroundEnergy)" @change="onNumber('backgroundEnergy', $event)" />
      </PropRow>
    </Section>
    <Section v-if="show(['ambient', 'environment', 'sky', 'energy', 'color'])" title="Ambient Light" section-key="env-ambient">
      <PropRow label="Source" :reset="() => store.resetEnvironment(node.id, 'ambientSource')">
        <select :value="settings.ambientSource" @change="store.setEnvironmentAmbientSource(node.id, ($event.target as HTMLSelectElement).value as AmbientSource)">
          <option value="background">Background</option>
          <option value="disabled">Disabled</option>
          <option value="color">Color</option>
          <option value="sky">Sky</option>
        </select>
      </PropRow>
      <PropRow v-if="settings.ambientSource === 'color'" label="Color" :reset="() => store.resetEnvironment(node.id, 'ambientColor')">
        <input type="color" :value="settings.ambientColor" @input="store.setEnvironmentColor(node.id, 'ambientColor', ($event.target as HTMLInputElement).value)" />
      </PropRow>
      <PropRow label="Energy" :reset="() => store.resetEnvironment(node.id, 'ambientEnergy')">
        <input type="number" min="0" max="10" step="0.05" :value="formatNumber(settings.ambientEnergy)" @change="onNumber('ambientEnergy', $event)" />
      </PropRow>
      <PropRow v-if="showSkyContribution" label="Sky Contribution" :reset="() => store.resetEnvironment(node.id, 'ambientSkyContribution')">
        <input type="number" min="0" max="1" step="0.05" :value="formatNumber(settings.ambientSkyContribution)" @change="onNumber('ambientSkyContribution', $event)" />
      </PropRow>
    </Section>
    <Section v-if="show(['fog', 'environment', 'density', 'depth'])" title="Fog" section-key="env-fog">
      <PropRow label="Enabled" :reset="() => store.resetEnvironment(node.id, 'fogEnabled')">
        <label class="check">
          <input type="checkbox" :checked="settings.fogEnabled" @change="store.setEnvironmentFlag(node.id, 'fogEnabled', ($event.target as HTMLInputElement).checked)" />
        </label>
      </PropRow>
      <PropRow label="Mode" :reset="() => store.resetEnvironment(node.id, 'fogMode')">
        <select :value="settings.fogMode" @change="store.setEnvironmentFogMode(node.id, ($event.target as HTMLSelectElement).value as FogMode)">
          <option value="exponential">Exponential</option>
          <option value="depth">Depth</option>
        </select>
      </PropRow>
      <PropRow label="Color" :reset="() => store.resetEnvironment(node.id, 'fogColor')">
        <input type="color" :value="settings.fogColor" @input="store.setEnvironmentColor(node.id, 'fogColor', ($event.target as HTMLInputElement).value)" />
      </PropRow>
      <PropRow v-if="settings.fogMode === 'exponential'" label="Density" :reset="() => store.resetEnvironment(node.id, 'fogDensity')">
        <input type="number" min="0" max="1" step="0.01" :value="formatNumber(settings.fogDensity)" @change="onNumber('fogDensity', $event)" />
      </PropRow>
      <template v-else>
        <PropRow label="Depth Begin" :reset="() => store.resetEnvironment(node.id, 'fogStart')">
          <input type="number" step="0.5" :value="formatNumber(settings.fogStart)" @change="onNumber('fogStart', $event)" />
        </PropRow>
        <PropRow label="Depth End" :reset="() => store.resetEnvironment(node.id, 'fogEnd')">
          <input type="number" step="0.5" :value="formatNumber(settings.fogEnd)" @change="onNumber('fogEnd', $event)" />
        </PropRow>
      </template>
    </Section>
    <Section v-if="show(['shadow', 'environment'])" title="Shadows" section-key="env-shadows">
      <PropRow label="Enabled" :reset="() => store.resetEnvironment(node.id, 'shadows')">
        <label class="check">
          <input type="checkbox" :checked="settings.shadows" @change="store.setEnvironmentFlag(node.id, 'shadows', ($event.target as HTMLInputElement).checked)" />
        </label>
      </PropRow>
      <PropRow label="Type" :reset="() => store.resetEnvironment(node.id, 'shadowType')">
        <select :value="settings.shadowType" @change="store.setEnvironmentShadowType(node.id, ($event.target as HTMLSelectElement).value as ShadowTypeName)">
          <option value="basic">Basic</option>
          <option value="pcf">PCF</option>
          <option value="vsm">VSM</option>
        </select>
      </PropRow>
    </Section>
  </template>
</template>
