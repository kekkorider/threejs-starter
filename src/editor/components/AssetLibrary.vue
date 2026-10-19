<script setup lang="ts">
import { TSL_PRESETS } from '../tsl'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
</script>

<template>
  <div class="placeholder screen-asset asset-grid">
    <article v-for="preset in TSL_PRESETS" :key="preset.id" class="asset-card">
      <h3>{{ preset.name }}</h3>
      <p>{{ preset.description }}</p>
      <div class="row">
        <button type="button" class="btn primary" @click="store.openCreate('MeshInstance3D', preset.id)">Create Mesh</button>
        <button type="button" class="btn" @click="store.applyAssetPreset(preset.id)">Apply</button>
      </div>
    </article>
  </div>
</template>
