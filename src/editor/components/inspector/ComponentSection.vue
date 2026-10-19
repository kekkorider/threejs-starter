<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentParameter } from '../../behaviors'
import { useEditorStore } from '../../stores/editor'
import PropRow from './PropRow.vue'
import Section from './Section.vue'

const store = useEditorStore()
const component = computed(() => store.selectedComponent)
const query = computed(() => store.inspectorFilter.trim().toLowerCase())
const parameters = computed(() => {
  const current = component.value
  if (!current) return []
  if (!query.value) return current.parameters
  return current.parameters.filter((param) => param.key.toLowerCase().includes(query.value))
})
const visible = computed(() => {
  if (!component.value) return false
  if (!query.value) return true
  return parameters.value.length > 0 || ['component', 'enabled', 'script', 'parameter', component.value.name.toLowerCase()].some((label) => label.includes(query.value))
})

function axisChoices(param: ComponentParameter): string[] | null {
  if (param.kind !== 'string') return null
  if (param.value === 'x' || param.value === 'y' || param.value === 'z') return ['x', 'y', 'z']
  return null
}

function onNumber(param: ComponentParameter, event: Event): void {
  const current = component.value
  if (!current) return
  store.setComponentParameter(current.id, param.key, Number((event.target as HTMLInputElement).value))
}

function onString(param: ComponentParameter, event: Event): void {
  const current = component.value
  if (!current) return
  store.setComponentParameter(current.id, param.key, (event.target as HTMLInputElement | HTMLSelectElement).value)
}

function onBoolean(param: ComponentParameter, event: Event): void {
  const current = component.value
  if (!current) return
  store.setComponentParameter(current.id, param.key, (event.target as HTMLInputElement).checked)
}
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
    <PropRow v-for="param in parameters" :key="param.key" :label="param.key">
      <label v-if="param.kind === 'boolean'" class="check">
        <input type="checkbox" :checked="param.value === true" @change="onBoolean(param, $event)" />
      </label>
      <select v-else-if="axisChoices(param)" :value="param.value" @change="onString(param, $event)">
        <option v-for="option in axisChoices(param)" :key="option" :value="option">{{ option }}</option>
      </select>
      <input
        v-else-if="param.kind === 'number'"
        type="number"
        :step="Number.isInteger(param.value) ? 1 : 0.01"
        :value="param.value"
        @change="onNumber(param, $event)"
      />
      <input v-else type="text" :value="param.value" @change="onString(param, $event)" />
    </PropRow>
    <div v-if="parameters.length === 0" class="hint">This component has no parameters.</div>
    <button type="button" class="btn" @click="store.removeComponent(component.id)">Delete</button>
  </Section>
</template>
