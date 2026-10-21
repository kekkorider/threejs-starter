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
          <button type="button" class="icon-btn row-close" title="Close" @click.stop="store.closeScript(file.id)">
            <Icon name="close" />
          </button>
        </div>
      </div>
    </aside>
    <div class="script-main">
      <div class="tsl-bar">
        <span class="name">{{ active ? active.path : 'No script' }}</span>
        <span class="spacer" />
        <span
          v-if="store.scriptStatus"
          :key="store.scriptStatusKey"
          class="status"
          :class="{ error: store.scriptError, ok: !store.scriptError, fade: store.scriptStatus === 'Applied' }"
        >{{ store.scriptStatus }}</span>
        <button type="button" class="btn" :disabled="!store.scriptDirty" @click="store.saveActiveScript(true)">Apply</button>
      </div>
      <CodeEditor v-if="active" v-model="store.scriptSource" language="typescript" @change="store.onScriptChange" />
      <div v-else class="empty-note script-empty">Double-click a component in the scene tree, right-click it and choose Edit, or open a script from the Script dock.</div>
    </div>
  </div>
</template>
