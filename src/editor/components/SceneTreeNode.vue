<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { kindClass, kindIcon } from '../lib/format'
import { useEditorStore } from '../stores/editor'

const props = defineProps<{ id: string, depth: number, query: string }>()
const store = useEditorStore()
const drop = ref(false)
const renameInput = ref<HTMLInputElement | null>(null)

const node = computed(() => store.nodeById.get(props.id))
const selfMatch = computed(() => !props.query || (node.value?.name.toLowerCase().includes(props.query) ?? false))
const childHits = computed(() => node.value?.childIds.map((childId) => store.nodeMatches(childId, props.query)) ?? [])
const visible = computed(() => !props.query || selfMatch.value || childHits.value.some(Boolean))
const open = computed(() => store.expanded.has(props.id) || props.query.length > 0)
const renaming = computed(() => store.renamingId === props.id)

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

function onDrop(event: DragEvent): void {
  drop.value = false
  const id = event.dataTransfer?.getData('text/plain')
  if (!id) return
  store.reparent(id, props.id)
}

function onEscape(event: KeyboardEvent): void {
  const input = event.target as HTMLInputElement
  input.value = node.value?.name ?? ''
  input.blur()
}

function onBlur(event: FocusEvent): void {
  store.commitRename(props.id, (event.target as HTMLInputElement).value)
}
</script>

<template>
  <template v-if="node && visible">
    <div
      class="tree-row"
      :class="{ selected: store.selectedId === node.id, 'drop-target': drop }"
      :style="{ paddingLeft: `${6 + depth * 14}px` }"
      :draggable="!node.isRoot"
      @click="store.select(node.id)"
      @dblclick.stop="store.beginRename(node.id)"
      @contextmenu.prevent="store.openContextMenu(node.id, $event.clientX, $event.clientY)"
      @dragstart="onDragStart"
      @dragover.stop.prevent="drop = true"
      @dragleave="drop = false"
      @drop.stop.prevent="onDrop"
    >
      <button
        type="button"
        class="twist"
        :class="{ empty: node.childIds.length === 0, collapsed: !store.expanded.has(node.id) }"
        @click.stop="store.toggleExpanded(node.id)"
      >
        <Icon name="chevron-down" />
      </button>
      <span class="kind-icon" :class="kindClass(node.kind)">
        <Icon :name="kindIcon(node.kind)" />
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
