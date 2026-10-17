<script setup lang="ts">
import Icon from '../Icon.vue'
import { useEditorStore } from '../../stores/editor'

defineProps<{ title: string, sectionKey: string, tone?: string }>()
const store = useEditorStore()
</script>

<template>
  <div class="section" :class="[{ collapsed: store.collapsed.has(sectionKey) }, tone]">
    <button type="button" class="section-h" @click="store.toggleSection(sectionKey)">
      <Icon name="chevron-down" />
      <span>{{ title }}</span>
    </button>
    <div class="section-b">
      <slot />
    </div>
  </div>
</template>
