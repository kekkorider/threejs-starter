<script setup lang="ts">
import { computed } from 'vue'
import Section from './Section.vue'
import Vec3Field from './Vec3Field.vue'
import { useEditorStore } from '../../stores/editor'

const store = useEditorStore()
const query = computed(() => store.inspectorFilter.trim().toLowerCase())
const visible = computed(() => {
  if (!query.value) return true
  return ['position', 'rotation', 'scale', 'transform'].some((label) => label.includes(query.value))
})
</script>

<template>
  <Section v-if="visible && store.selected && !store.selected.isRoot" title="Transform" section-key="transform">
    <Vec3Field label="Position" axis="pos" :sensitivity="0.01" />
    <Vec3Field label="Rotation" axis="rot" :sensitivity="0.4" />
    <Vec3Field label="Scale" axis="scl" :sensitivity="0.005" />
  </Section>
</template>
