<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { COMPONENT_DRAG_PREFIX, INSTANCE_DRAG_PREFIX } from '../behaviors'
import { isSceneDrag, sceneDragPath } from '../sceneFile'
import { kindClass, kindIcon } from '../lib/format'
import { useEditorStore } from '../stores/editor'
import Icon from './Icon.vue'

const props = defineProps<{ id: string, depth: number, query: string }>()
const store = useEditorStore()
const drop = ref(false)
const renameInput = ref<HTMLInputElement | null>(null)

const node = computed(() => store.nodeById.get(props.id))
const selfMatch = computed(() => !props.query || (node.value?.name.toLowerCase().includes(props.query) ?? false))
const componentHits = computed(() => node.value?.componentIds.some((componentId) => {
  return store.componentById.get(componentId)?.name.toLowerCase().includes(props.query) ?? false
}) ?? false)
const childHits = computed(() => node.value?.childIds.map((childId) => store.nodeMatches(childId, props.query)) ?? [])
const visible = computed(() => !props.query || selfMatch.value || componentHits.value || childHits.value.some(Boolean))
const open = computed(() => store.expanded.has(props.id) || props.query.length > 0)
const renaming = computed(() => store.renamingId === props.id)
const nested = computed(() => (node.value?.childIds.length ?? 0) + (node.value?.componentIds.length ?? 0) > 0)

watch(renaming, async (active) => {
  if (!active) return
  await nextTick()
  renameInput.value?.focus()
  renameInput.value?.select()
})

function onDragStart(event: DragEvent): void {
  if (!node.value || node.value.isRoot) {
    event.preventDefault()
    return
  }
  event.dataTransfer?.setData('text/plain', props.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onInstanceDrag(event: DragEvent, instanceId: string): void {
  event.stopPropagation()
  event.dataTransfer?.setData('text/plain', `${INSTANCE_DRAG_PREFIX}${instanceId}`)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function allowDrop(event: DragEvent): void {
  const transfer = event.dataTransfer
  if (!transfer) return
  transfer.dropEffect = isSceneDrag(transfer) || transfer.effectAllowed === 'copy' ? 'copy' : 'move'
  drop.value = true
}

function clearDrop(event: DragEvent): void {
  const next = event.relatedTarget
  const current = event.currentTarget
  if (next instanceof Node && current instanceof Node && current.contains(next)) return
  drop.value = false
}

function acceptDrop(event: DragEvent): void {
  drop.value = false
  const scenePath = sceneDragPath(event.dataTransfer)
  if (scenePath) {
    store.instanceScene(scenePath, props.id)
    return
  }
  const data = event.dataTransfer?.getData('text/plain') ?? ''
  if (!data) return
  if (data.startsWith(COMPONENT_DRAG_PREFIX)) {
    store.attachComponent(data.slice(COMPONENT_DRAG_PREFIX.length), props.id)
    return
  }
  if (data.startsWith(INSTANCE_DRAG_PREFIX)) {
    store.moveComponent(data.slice(INSTANCE_DRAG_PREFIX.length), props.id)
    return
  }
  store.reparent(data, props.id)
}

function onEscape(event: KeyboardEvent): void {
  const input = event.target as HTMLInputElement
  input.value = node.value?.name ?? ''
  input.blur()
}

function onBlur(event: FocusEvent): void {
  store.commitRename(props.id, (event.target as HTMLInputElement).value)
}

function componentVisible(componentId: string): boolean {
  if (!props.query) return true
  return store.componentById.get(componentId)?.name.toLowerCase().includes(props.query) ?? false
}
</script>

<template>
  <template v-if="node && visible">
    <div
      class="tree-row"
      :class="{ selected: store.selectedId === node.id && !node.componentIds.includes(store.selectedComponentId ?? ''), 'drop-target': drop }"
      :style="{ paddingLeft: `${6 + depth * 14}px` }"
      :draggable="!node.isRoot"
      :title="node.instancePath ? `Instance of ${node.instancePath}` : undefined"
      @click="store.select(node.id)"
      @dblclick.stop="store.beginRename(node.id)"
      @contextmenu.prevent="store.openContextMenu(node.id, $event.clientX, $event.clientY)"
      @dragstart="onDragStart"
      @dragenter.stop.prevent="allowDrop"
      @dragover.stop.prevent="allowDrop"
      @dragleave="clearDrop"
      @drop.stop.prevent="acceptDrop"
    >
      <button
        type="button"
        class="twist"
        :class="{ empty: !nested, collapsed: !store.expanded.has(node.id) }"
        @click.stop="store.toggleExpanded(node.id)"
      >
        <Icon name="chevron-down" />
      </button>
      <span class="kind-icon" :class="node.instancePath ? 'scene' : kindClass(node.kind)">
        <Icon :name="node.instancePath ? 'scene' : kindIcon(node.kind)" />
      </span>
      <input
        v-if="renaming"
        ref="renameInput"
        class="rename-input"
        :value="node.name"
        @click.stop
        @keydown.enter="($event.target as HTMLInputElement).blur()"
        @keydown.escape="onEscape"
        @blur="onBlur"
      />
      <span v-else class="label">{{ node.name }}</span>
    </div>
    <template v-if="open">
      <div
        v-for="componentId in node.componentIds"
        v-show="componentVisible(componentId)"
        :key="componentId"
        class="tree-row"
        :class="{ selected: store.selectedComponentId === componentId }"
        :style="{ paddingLeft: `${6 + (depth + 1) * 14}px` }"
        draggable="true"
        @click.stop="store.selectComponent(componentId)"
        @dblclick.stop="store.editComponent(componentId)"
        @contextmenu.prevent.stop="store.openComponentMenu(componentId, $event.clientX, $event.clientY)"
        @dragstart="onInstanceDrag($event, componentId)"
        @dragenter.stop.prevent="allowDrop"
        @dragover.stop.prevent="allowDrop"
        @dragleave="clearDrop"
        @drop.stop.prevent="acceptDrop"
      >
        <button type="button" class="twist empty"><Icon name="chevron-down" /></button>
        <span class="kind-icon component"><Icon name="component" /></span>
        <span class="label">{{ store.componentById.get(componentId)?.name }}</span>
      </div>
      <SceneTreeNode
        v-for="(childId, index) in node.childIds"
        v-show="!query || childHits[index] || store.nodeById.get(childId)?.name.toLowerCase().includes(query)"
        :key="childId"
        :id="childId"
        :depth="depth + 1"
        :query="query"
      />
    </template>
  </template>
</template>
