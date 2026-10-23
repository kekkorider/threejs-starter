<script setup lang="ts">
import { formatNumber } from '../lib/format'
import type { AmbientSource, BackgroundMode, EnvironmentNumberField } from '../environment'
import type { ShadowTypeName } from '../state'
import { useEditorStore } from '../stores/editor'
import PropRow from './inspector/PropRow.vue'

const store = useEditorStore()

function onSunEnergy(event: Event): void {
  store.setPreviewSunEnergy(Number((event.target as HTMLInputElement).value))
}

function onAltitude(event: Event): void {
  store.setPreviewSunAltitude(Number((event.target as HTMLInputElement).value))
}

function onAzimuth(event: Event): void {
  store.setPreviewSunAzimuth(Number((event.target as HTMLInputElement).value))
}

function onEnvNumber(field: EnvironmentNumberField, event: Event): void {
  store.setPreviewEnvNumber(field, Number((event.target as HTMLInputElement).value))
}

function addSun(event: MouseEvent): void {
  store.addPreviewSunToScene(event.shiftKey)
}

function addEnv(event: MouseEvent): void {
  store.addPreviewEnvironmentToScene(event.shiftKey)
}
</script>

<template>
  <div class="preview-menu" role="dialog" aria-label="Sun and Environment settings" @click.stop>
    <section class="preview-section">
      <h3>Preview Sun</h3>
      <PropRow label="Color" :reset="() => store.resetPreviewSunField('color')">
        <input type="color" :value="store.previewSunSettings.color" @input="store.setPreviewSunColor(($event.target as HTMLInputElement).value)" />
      </PropRow>
      <PropRow label="Energy" :reset="() => store.resetPreviewSunField('energy')">
        <input type="number" min="0" max="16" step="0.05" :value="formatNumber(store.previewSunSettings.energy)" @change="onSunEnergy" />
      </PropRow>
      <PropRow label="Altitude" :reset="() => store.resetPreviewSunField('altitude')">
        <input type="number" min="-90" max="90" step="1" :value="formatNumber(store.previewSunSettings.altitude)" @change="onAltitude" />
      </PropRow>
      <PropRow label="Azimuth" :reset="() => store.resetPreviewSunField('azimuth')">
        <input type="number" min="-180" max="180" step="1" :value="formatNumber(store.previewSunSettings.azimuth)" @change="onAzimuth" />
      </PropRow>
      <PropRow label="Shadows" :reset="() => store.resetPreviewSunField('shadows')">
        <label class="check">
          <input type="checkbox" :checked="store.previewSunSettings.shadows" @change="store.setPreviewSunShadows(($event.target as HTMLInputElement).checked)" />
          Enabled
        </label>
      </PropRow>
    </section>
    <section class="preview-section">
      <h3>Preview Environment</h3>
      <PropRow label="Mode" :reset="() => store.resetPreviewEnvField('backgroundMode')">
        <select :value="store.previewEnvSettings.backgroundMode" @change="store.setPreviewEnvBackgroundMode(($event.target as HTMLSelectElement).value as BackgroundMode)">
          <option value="color">Color</option>
          <option value="sky">Sky</option>
          <option value="canvas">Canvas</option>
        </select>
      </PropRow>
      <PropRow v-if="store.previewEnvSettings.backgroundMode === 'color'" label="Color" :reset="() => store.resetPreviewEnvField('backgroundColor')">
        <input type="color" :value="store.previewEnvSettings.backgroundColor" @input="store.setPreviewEnvColor('backgroundColor', ($event.target as HTMLInputElement).value)" />
      </PropRow>
      <PropRow v-if="store.previewEnvSettings.backgroundMode !== 'canvas'" label="Energy" :reset="() => store.resetPreviewEnvField('backgroundEnergy')">
        <input type="number" min="0" max="10" step="0.05" :value="formatNumber(store.previewEnvSettings.backgroundEnergy)" @change="onEnvNumber('backgroundEnergy', $event)" />
      </PropRow>
      <PropRow label="Ambient" :reset="() => store.resetPreviewEnvField('ambientSource')">
        <select :value="store.previewEnvSettings.ambientSource" @change="store.setPreviewEnvAmbientSource(($event.target as HTMLSelectElement).value as AmbientSource)">
          <option value="background">Background</option>
          <option value="disabled">Disabled</option>
          <option value="color">Color</option>
          <option value="sky">Sky</option>
        </select>
      </PropRow>
      <PropRow v-if="store.previewEnvSettings.ambientSource === 'color'" label="Amb. Color" :reset="() => store.resetPreviewEnvField('ambientColor')">
        <input type="color" :value="store.previewEnvSettings.ambientColor" @input="store.setPreviewEnvColor('ambientColor', ($event.target as HTMLInputElement).value)" />
      </PropRow>
      <PropRow v-if="store.previewEnvSettings.ambientSource !== 'disabled'" label="Amb. Energy" :reset="() => store.resetPreviewEnvField('ambientEnergy')">
        <input type="number" min="0" max="10" step="0.05" :value="formatNumber(store.previewEnvSettings.ambientEnergy)" @change="onEnvNumber('ambientEnergy', $event)" />
      </PropRow>
      <PropRow
        v-if="store.previewEnvSettings.ambientSource === 'color' || store.previewEnvSettings.ambientSource === 'background'"
        label="Sky Contrib"
        :reset="() => store.resetPreviewEnvField('ambientSkyContribution')"
      >
        <input type="number" min="0" max="1" step="0.05" :value="formatNumber(store.previewEnvSettings.ambientSkyContribution)" @change="onEnvNumber('ambientSkyContribution', $event)" />
      </PropRow>
      <PropRow label="Shadows" :reset="() => store.resetPreviewEnvField('shadows')">
        <label class="check">
          <input type="checkbox" :checked="store.previewEnvSettings.shadows" @change="store.setPreviewEnvFlag('shadows', ($event.target as HTMLInputElement).checked)" />
          Enabled
        </label>
      </PropRow>
      <PropRow v-if="store.previewEnvSettings.shadows" label="Shadow Type" :reset="() => store.resetPreviewEnvField('shadowType')">
        <select :value="store.previewEnvSettings.shadowType" @change="store.setPreviewEnvShadowType(($event.target as HTMLSelectElement).value as ShadowTypeName)">
          <option value="basic">Basic</option>
          <option value="pcf">PCF</option>
          <option value="vsm">VSM</option>
        </select>
      </PropRow>
    </section>
    <div class="preview-actions">
      <button
        type="button"
        class="preview-add"
        :disabled="!store.canTogglePreviewSun"
        title="Add a DirectionalLight from these settings. Hold Shift to also add the environment."
        @click="addSun"
      >
        Add Sun to Scene
      </button>
      <button
        type="button"
        class="preview-add"
        :disabled="!store.canTogglePreviewEnv"
        title="Add a WorldEnvironment from these settings. Hold Shift to also add the sun."
        @click="addEnv"
      >
        Add Environment to Scene
      </button>
    </div>
  </div>
</template>
