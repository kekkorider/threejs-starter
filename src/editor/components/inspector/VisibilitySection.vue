<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../../stores/editor'
import PropRow from './PropRow.vue'
import Section from './Section.vue'

const store = useEditorStore()
const node = computed(() => store.selected)
const query = computed(() => store.inspectorFilter.trim().toLowerCase())
const visible = computed(() => {
  if (!query.value) return true
  return ['visible', 'shadow', 'visibility'].some((label) => label.includes(query.value))
})
</script>

<template>
  <Section v-if="node && visible && node.kind !== 'WorldEnvironment'" title="Visibility" section-key="visibility">
    <PropRow label="Visible" :reset="() => store.resetVisible(node.id)">
      <label class="check">
        <input type="checkbox" :checked="node.visible" @change="store.setVisible(node.id, ($event.target as HTMLInputElement).checked)" />
      </label>
    </PropRow>
    <PropRow v-if="node.castShadow !== null" label="Cast Shadow" :reset="() => store.resetCastShadow(node.id)">
      <label class="check">
        <input type="checkbox" :checked="node.castShadow" @change="store.setCastShadow(node.id, ($event.target as HTMLInputElement).checked)" />
      </label>
    </PropRow>
    <PropRow v-if="node.receiveShadow !== null" label="Receive Shadow" :reset="() => store.resetReceiveShadow(node.id)">
      <label class="check">
        <input type="checkbox" :checked="node.receiveShadow" @change="store.setReceiveShadow(node.id, ($event.target as HTMLInputElement).checked)" />
      </label>
    </PropRow>
  </Section>
</template>
