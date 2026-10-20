<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { isSceneDrag, sceneDragPath } from '../sceneFile'
import Icon from './Icon.vue'
import SceneTreeNode from './SceneTreeNode.vue'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
const query = computed(() => store.sceneFilter.trim().toLowerCase())
const treeDrop = ref(false)

function onTreeOver(event: DragEvent): void {
  if (!isSceneDrag(event.dataTransfer)) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  treeDrop.value = true
}

function onTreeLeave(event: DragEvent): void {
  const next = event.relatedTarget
  const current = event.currentTarget
  if (next instanceof Node && current instanceof Node && current.contains(next)) return
  treeDrop.value = false
}

function onTreeDrop(event: DragEvent): void {
  treeDrop.value = false
  const path = sceneDragPath(event.dataTransfer)
  if (!path || !store.rootId) return
  store.instanceScene(path, store.rootId)
}

function clearTreeDrop(): void {
  treeDrop.value = false
}

onMounted(() => {
  document.addEventListener('drop', clearTreeDrop, true)
  document.addEventListener('dragend', clearTreeDrop, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('drop', clearTreeDrop, true)
  document.removeEventListener('dragend', clearTreeDrop, true)
})
</script>

<template>
  <section class="dock scene-dock">
    <div class="dock-title">Scene</div>
    <div class="dock-tools">
      <button type="button" class="icon-btn" title="Add Child Node (Ctrl+A)" @click="store.openCreate()">
        <Icon name="add" />
      </button>
      <button type="button" class="icon-btn" title="Create Component (Ctrl+C)" @click="store.openComponentDialog()">
        <Icon name="component" />
      </button>
      <button type="button" class="icon-btn" title="Duplicate (Ctrl+D)" @click="store.duplicateSelection()">
        <Icon name="duplicate" />
      </button>
      <button type="button" class="icon-btn danger" title="Delete (Del)" @click="store.deleteSelection()">
        <Icon name="delete" />
      </button>
    </div>
    <input v-model="store.sceneFilter" class="filter scene-filter" placeholder="Filter nodes" />
    <div
      class="tree scene-tree"
      :class="{ 'drop-target': treeDrop }"
      @dragenter="onTreeOver"
      @dragover="onTreeOver"
      @dragleave="onTreeLeave"
      @drop.prevent="onTreeDrop"
    >
      <SceneTreeNode v-if="store.rootId" :id="store.rootId" :depth="0" :query="query" />
      <div v-else class="empty-note">Scene is empty.</div>
    </div>
  </section>
</template>
