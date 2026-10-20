<script setup lang="ts">
import { computed } from 'vue'
import { COMPONENT_DRAG_PREFIX } from '../behaviors'
import { writeSceneDrag } from '../sceneFile'
import Icon from './Icon.vue'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
let suppressClick = false
const query = computed(() => store.fileFilter.trim().toLowerCase())

const scenes = computed(() => store.sceneFiles.filter((file) => {
  return !query.value || file.path.toLowerCase().includes(query.value)
}))

const meshes = computed(() => store.geometryFiles.filter((file) => {
  const path = `res://meshes/${file.name}.tres`
  return !query.value || path.toLowerCase().includes(query.value)
}))

const materials = computed(() => store.materialFiles.filter((file) => {
  const path = `res://materials/${file.name}.tsl`
  return !query.value || path.toLowerCase().includes(query.value)
}))

const components = computed(() => store.componentFiles.filter((file) => {
  return !query.value || file.path.toLowerCase().includes(query.value) || file.name.toLowerCase().includes(query.value)
}))

const empty = computed(() => scenes.value.length === 0 && meshes.value.length === 0 && materials.value.length === 0 && components.value.length === 0)

function onSceneClick(path: string): void {
  if (suppressClick) {
    suppressClick = false
    return
  }
  store.openSceneFile(path)
}

function onSceneDrag(event: DragEvent, path: string): void {
  if (!event.dataTransfer) return
  suppressClick = true
  writeSceneDrag(event.dataTransfer, path)
}

function onComponentDrag(event: DragEvent, id: string): void {
  suppressClick = true
  event.dataTransfer?.setData('text/plain', `${COMPONENT_DRAG_PREFIX}${id}`)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}

function onComponentClick(id: string): void {
  if (suppressClick) {
    suppressClick = false
    return
  }
  store.openComponentDialog(id)
}
</script>

<template>
  <section class="dock files-dock">
    <div class="dock-title">File system</div>
    <input v-model="store.fileFilter" class="filter file-filter" placeholder="Filter files" />
    <div class="tree files">
      <div v-if="empty" class="empty-note">No resources yet. Create a MeshInstance.</div>
      <div
        v-for="file in scenes"
        :key="file.path"
        class="file-row"
        :class="{ selected: file.open && store.selectedId === store.rootId }"
        :data-scene-path="file.path"
        :title="file.saved && !file.open ? 'Drag onto the scene tree to instance' : (file.open ? 'Open scene' : 'Open this scene')"
        :draggable="file.saved && !file.open ? 'true' : 'false'"
        @click="onSceneClick(file.path)"
        @dragstart.stop="onSceneDrag($event, file.path)"
      >
        <span class="kind-icon scene"><Icon name="scene" /></span>
        <span class="label">{{ file.path }}{{ file.open && store.sceneDirty ? ' (*)' : '' }}</span>
        <button
          v-if="file.saved && !file.open"
          type="button"
          class="icon-btn danger row-delete"
          title="Delete"
          @mousedown.stop
          @click.stop="store.deleteSceneFile(file.path)"
        >
          <Icon name="delete" />
        </button>
      </div>
      <div v-if="meshes.length" class="group-label">res://meshes</div>
      <div
        v-for="file in meshes"
        :key="file.id"
        class="file-row"
        @click="store.selectGeometryFile(file.id)"
      >
        <span class="kind-icon mesh"><Icon name="meshfile" /></span>
        <span class="label">res://meshes/{{ file.name }}.tres</span>
      </div>
      <div v-if="materials.length" class="group-label">res://materials</div>
      <div
        v-for="file in materials"
        :key="file.id"
        class="file-row"
        :class="{ selected: file.id === store.boundMaterialId }"
        @click="store.selectMaterialFile(file.id)"
      >
        <span class="kind-icon mat"><Icon name="material" /></span>
        <span class="label">res://materials/{{ file.name }}.tsl</span>
      </div>
      <div v-if="components.length" class="group-label">res://components</div>
      <div
        v-for="file in components"
        :key="file.id"
        class="file-row"
        draggable="true"
        @click="onComponentClick(file.id)"
        @contextmenu.prevent="store.openComponentFileMenu(file.id, $event.clientX, $event.clientY)"
        @dragstart="onComponentDrag($event, file.id)"
      >
        <span class="kind-icon component"><Icon name="component" /></span>
        <span class="label">{{ file.path }}</span>
        <button type="button" class="icon-btn danger row-delete" title="Delete" @click.stop="store.requestDeleteComponent(file.id)">
          <Icon name="delete" />
        </button>
      </div>
    </div>
  </section>
</template>
