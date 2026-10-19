<script setup lang="ts">
import { computed } from 'vue'
import { kindClass, kindIcon } from '../lib/format'
import { useEditorStore } from '../stores/editor'
import ComponentSection from './inspector/ComponentSection.vue'
import GeometrySection from './inspector/GeometrySection.vue'
import GridSection from './inspector/GridSection.vue'
import LightSection from './inspector/LightSection.vue'
import MaterialSection from './inspector/MaterialSection.vue'
import SceneSection from './inspector/SceneSection.vue'
import TransformSection from './inspector/TransformSection.vue'
import VisibilitySection from './inspector/VisibilitySection.vue'
import Icon from './Icon.vue'

const store = useEditorStore()
const node = computed(() => store.selected)

function onName(event: Event): void {
  const current = node.value
  if (!current) return
  store.rename(current.id, (event.target as HTMLInputElement).value)
}
</script>

<template>
  <section class="dock inspector-dock">
    <div class="dock-title">Inspector</div>
    <div class="inspector-tools">
      <input v-model="store.inspectorFilter" class="filter inspector-filter" placeholder="Filter properties" />
    </div>
    <div class="inspector">
      <template v-if="store.selectedComponent">
        <div class="node-head">
          <span class="kind-icon component">
            <Icon name="component" />
          </span>
          <input :value="store.selectedComponent.name" disabled />
        </div>
        <div class="inherits">Object3DBehaviour</div>
        <ComponentSection />
      </template>
      <template v-else-if="node">
        <div class="node-head">
          <span class="kind-icon" :class="kindClass(node.kind)">
            <Icon :name="kindIcon(node.kind)" />
          </span>
          <input :value="node.name" :disabled="node.isRoot" @change="onName" />
        </div>
        <div class="inherits">{{ node.inherits }}</div>
        <SceneSection />
        <GridSection />
        <TransformSection />
        <GeometrySection />
        <MaterialSection />
        <LightSection />
        <VisibilitySection />
      </template>
      <div v-else class="empty-note">Select a node to edit its properties.</div>
    </div>
  </section>
</template>
