<script setup lang="ts">
import { computed, ref } from 'vue'
import { isScriptDrag } from '../behaviors'
import { useEditorStore } from '../stores/editor'
import CodeEditor from './CodeEditor.vue'
import Icon from './Icon.vue'

const store = useEditorStore()
const drop = ref(false)

const node = computed(() => (store.selectedId ? store.nodeById.get(store.selectedId) ?? null : null))
const scripts = computed(() => store.dockScriptRows)
const active = computed(() => scripts.value.find((row) => row.id === store.dockInstanceId) ?? null)
const shared = computed(() => !!active.value && active.value.resourceId === store.activeScriptId)
const slotText = computed(() => {
  const current = active.value
  if (!current) return '[empty]'
  if (scripts.value.length > 1) return current.label
  return `${current.name}.ts`
})
const status = computed(() => (shared.value ? store.scriptStatus : store.dockStatus))
const statusError = computed(() => (shared.value ? store.scriptError : store.dockError))
const statusKey = computed(() => (shared.value ? store.scriptStatusKey : store.dockStatusKey))

function onSlot(): void {
  const current = active.value
  if (!current) {
    store.openComponentDialog()
    return
  }
  store.editComponent(current.id)
}

function openMenu(event: MouseEvent): void {
  const target = event.currentTarget
  if (target instanceof HTMLElement) store.openScriptSlotMenu(target)
}

function allowDrop(event: DragEvent): void {
  if (!node.value || !isScriptDrag(event.dataTransfer)) return
  event.preventDefault()
  const transfer = event.dataTransfer
  if (transfer) transfer.dropEffect = transfer.effectAllowed === 'copy' ? 'copy' : 'move'
  drop.value = true
}

function clearDrop(event: DragEvent): void {
  const next = event.relatedTarget
  const current = event.currentTarget
  if (next instanceof Node && current instanceof Node && current.contains(next)) return
  drop.value = false
}

function onDrop(event: DragEvent): void {
  drop.value = false
  const data = event.dataTransfer?.getData('text/plain') ?? ''
  if (!data) return
  store.dropOnScriptDock(data)
}
</script>

<template>
  <section
    class="dock script-dock"
    :class="{ 'drop-target': drop }"
    @dragenter="allowDrop"
    @dragover="allowDrop"
    @dragleave="clearDrop"
    @drop.prevent="onDrop"
  >
    <div class="dock-title">Script</div>
    <template v-if="node">
      <div class="script-picker">
        <span class="slot-label">Script</span>
        <button
          type="button"
          class="resource-btn"
          :class="{ empty: !active }"
          :title="active ? `Open in Script Editor: ${active.path}` : 'Attach Script'"
          @click="onSlot"
        >
          <span class="kind-icon component"><Icon name="script" /></span>
          <span class="label">{{ slotText }}</span>
        </button>
        <button
          type="button"
          class="icon-btn slot-menu"
          title="Script options"
          @click="openMenu"
        >
          <Icon name="chevron-down" />
        </button>
      </div>
      <div v-if="scripts.length > 1" class="script-switch">
        <div
          v-for="row in scripts"
          :key="row.id"
          class="tree-row"
          :class="{ selected: row.id === store.dockInstanceId }"
          :title="row.path"
          @click="store.showDockScript(row.id)"
        >
          <span class="kind-icon component"><Icon name="script" /></span>
          <span class="label">{{ row.label }}</span>
        </div>
      </div>
      <div v-if="active" class="script-main dock-script">
        <div class="tsl-bar">
          <span class="name" :title="active.path">{{ scripts.length > 1 ? `${active.label} · ${active.name}.ts` : `${active.name}.ts` }}</span>
          <span class="spacer" />
          <span
            v-if="status"
            :key="statusKey"
            class="status"
            :title="status"
            :class="{ error: statusError, ok: !statusError, fade: status === 'Applied' }"
          >{{ status }}</span>
          <button type="button" class="icon-btn" title="Open in Script Editor" @click="store.editComponent(active.id)">
            <Icon name="script" />
          </button>
          <button type="button" class="btn" :disabled="!store.dockDirty" @click="store.saveDockScript()">Apply</button>
        </div>
        <CodeEditor
          v-if="shared"
          :key="`${active.resourceId}:shared`"
          v-model="store.scriptSource"
          language="typescript"
          @change="store.onScriptChange"
        />
        <CodeEditor
          v-else
          :key="active.resourceId"
          v-model="store.dockSource"
          language="typescript"
          @change="store.onDockScriptChange"
        />
      </div>
      <div v-else class="empty-note">
        <p>This node has no script.</p>
        <button type="button" class="btn" @click="store.openComponentDialog()">Attach Script</button>
      </div>
    </template>
    <div v-else class="empty-note">Select a node to edit its script.</div>
  </section>
</template>
