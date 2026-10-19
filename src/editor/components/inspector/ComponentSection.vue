<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../../stores/editor'
import PropRow from './PropRow.vue'
import Section from './Section.vue'

const store = useEditorStore()
const component = computed(() => store.selectedComponent)
const query = computed(() => store.inspectorFilter.trim().toLowerCase())
const visible = computed(() => {
  if (!component.value) return false
  if (!query.value) return true
  return ['component', 'enabled', 'script', component.value.name.toLowerCase()].some((label) => label.includes(query.value))
})
</script>

<template>
  <Section v-if="component && visible" title="Component" section-key="component">
    <PropRow label="Script">
      <span class="label">{{ component.path }}</span>
    </PropRow>
    <PropRow label="Object">
      <span class="label">{{ component.nodeName }}</span>
    </PropRow>
    <PropRow label="Enabled">
      <label class="check">
        <input
          type="checkbox"
          :checked="component.enabled"
          @change="store.setComponentEnabled(component.id, ($event.target as HTMLInputElement).checked)"
        />
      </label>
    </PropRow>
    <div class="hint">Drag the component onto another object to move it.</div>
    <button type="button" class="btn" @click="store.removeComponent(component.id)">Remove</button>
  </Section>
</template>
