<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
const query = computed(() => store.fileFilter.trim().toLowerCase())

const scenePath = 'res://World.tscn'
const showScene = computed(() => !query.value || scenePath.toLowerCase().includes(query.value))

const meshes = computed(() => store.geometryFiles.filter((file) => {
  const path = `res://meshes/${file.name}.tres`
  return !query.value || path.toLowerCase().includes(query.value)
}))

const materials = computed(() => store.materialFiles.filter((file) => {
  const path = `res://materials/${file.name}.tsl`
  return !query.value || path.toLowerCase().includes(query.value)
}))

const empty = computed(() => !showScene.value && meshes.value.length === 0 && materials.value.length === 0)
</script>

<template>
  <section class="dock files-dock">
    <div class="dock-title">FileSystem</div>
    <input v-model="store.fileFilter" class="filter file-filter" placeholder="Filter files" />
    <div class="tree files">
      <div v-if="empty" class="empty-note">No resources yet. Create a MeshInstance3D.</div>
      <div
        v-if="showScene"
        class="file-row"
        :class="{ selected: store.selectedId === store.rootId }"
        @click="store.select(store.rootId)"
      >
        <span class="kind-icon scene"><Icon name="scene" /></span>
        <span class="label">{{ scenePath }}</span>
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
    </div>
  </section>
</template>
