<script setup lang="ts">
import CodeEditor from './CodeEditor.vue'
import { TSL_PRESETS } from '../tsl'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()

function onPreset(event: Event): void {
  store.applyBoundPreset((event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div class="tsl-pane">
    <div class="tsl-bar">
      <span class="name">{{ store.tslName }}</span>
      <select :value="store.tslPresetId" :disabled="store.tslDisabled" @change="onPreset">
        <option value="custom">Custom</option>
        <option v-for="preset in TSL_PRESETS" :key="preset.id" :value="preset.id">{{ preset.name }}</option>
      </select>
      <span class="spacer" />
      <span class="status" :class="store.tslError ? 'error' : 'ok'">{{ store.tslStatus }}</span>
      <button type="button" class="btn" :disabled="store.tslDisabled" @click="store.compileBound(true)">Apply</button>
    </div>
    <Teleport to="#script-code-host" :disabled="store.screen !== 'script'">
      <CodeEditor v-model="store.tslSource" :disabled="store.tslDisabled" @change="store.onTslChange" />
    </Teleport>
  </div>
</template>
