<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import SceneTreeNode from './SceneTreeNode.vue'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
const query = computed(() => store.sceneFilter.trim().toLowerCase())
</script>

<template>
  <section class="dock scene-dock">
    <div class="dock-title">Scene</div>
    <div class="dock-tools">
      <button type="button" class="icon-btn" title="Add Child Node (Ctrl+A)" @click="store.openCreate()">
        <Icon name="add" />
      </button>
      <button type="button" class="icon-btn" title="Duplicate (Ctrl+D)" @click="store.duplicateSelection()">
        <Icon name="duplicate" />
      </button>
      <button type="button" class="icon-btn danger" title="Delete (Del)" @click="store.deleteSelection()">
        <Icon name="delete" />
      </button>
    </div>
    <input v-model="store.sceneFilter" class="filter scene-filter" placeholder="Filter nodes" />
    <div class="tree scene-tree">
      <SceneTreeNode v-if="store.rootId" :id="store.rootId" :depth="0" :query="query" />
      <div v-else class="empty-note">Scene is empty.</div>
    </div>
  </section>
</template>
