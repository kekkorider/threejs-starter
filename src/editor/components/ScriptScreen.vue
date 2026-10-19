<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../stores/editor'
import CodeEditor from './CodeEditor.vue'
import Icon from './Icon.vue'

const store = useEditorStore()
const active = computed(() => store.openScripts.find((file) => file.id === store.activeScriptId) ?? null)
</script>

<template>
  <div class="script-screen">
    <div class="script-main">
      <div class="tsl-bar">
        <span class="name">{{ active ? active.path : 'No script' }}</span>
        <span class="spacer" />
        <span class="status" :class="store.scriptError ? 'error' : 'ok'">{{ store.scriptStatus }}</span>
        <button type="button" class="btn" :disabled="!active" @click="store.saveActiveScript(true)">Apply</button>
      </div>
      <CodeEditor v-if="active" v-model="store.scriptSource" @change="store.onScriptChange" />
      <div v-else class="empty-note script-empty">Double-click a component in the scene tree, or right-click it and choose Edit.</div>
    </div>
    <aside class="script-files">
      <div class="dock-title">Open scripts</div>
      <div class="tree">
        <div v-if="store.openScripts.length === 0" class="empty-note">No scripts open.</div>
        <div
          v-for="file in store.openScripts"
          :key="file.id"
          class="tree-row"
          :class="{ selected: file.id === store.activeScriptId }"
          @click="store.showScript(file.id)"
        >
          <span class="kind-icon component"><Icon name="component" /></span>
          <span class="label">{{ file.name }}.ts</span>
          <button type="button" class="icon-btn danger row-delete" title="Delete" @click.stop="store.requestDeleteComponent(file.id)">
            <Icon name="delete" />
          </button>
        </div>
      </div>
    </aside>
  </div>
</template>
