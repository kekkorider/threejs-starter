<script setup lang="ts">
import OutputPanel from './OutputPanel.vue'
import TslEditor from './TslEditor.vue'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
</script>

<template>
  <section class="bottom">
    <div class="bottom-tabs">
      <button type="button" class="bottom-tab" :class="{ active: store.bottomTab === 'tsl' }" @click="store.bottomTab = 'tsl'">TSL</button>
      <button type="button" class="bottom-tab" :class="{ active: store.bottomTab === 'output' }" @click="store.bottomTab = 'output'">Output</button>
    </div>
    <div class="bottom-body" :data-tab="store.bottomTab">
      <TslEditor />
      <OutputPanel />
    </div>
  </section>
</template>
