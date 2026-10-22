<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
const targetId = ref('')
const componentId = ref('')
const method = ref('')

const draft = computed(() => store.signalConnect)

const targets = computed(() => {
  const rows: { id: string, label: string }[] = []
  const walk = (id: string, depth: number): void => {
    const node = store.nodeById.get(id)
    if (!node || node.instanceOwned) return
    rows.push({ id, label: `${'. '.repeat(depth)}${node.name}` })
    if (node.instancePath) return
    for (const childId of node.childIds) walk(childId, depth + 1)
  }
  if (store.rootId) walk(store.rootId, 0)
  return rows
})

const components = computed(() => (targetId.value ? store.componentsOn(targetId.value) : []))
const methods = computed(() => (componentId.value ? store.componentMethodNames(componentId.value) : []))
const componentName = computed(() => components.value.find((item) => item.id === componentId.value)?.name ?? '')

watch(draft, (next) => {
  if (!next) return
  targetId.value = targets.value.find((item) => item.id === next.fromId)?.id ?? targets.value[0]?.id ?? ''
  componentId.value = ''
  method.value = ''
}, { immediate: true })

watch(targetId, () => {
  componentId.value = components.value[0]?.id ?? ''
  method.value = ''
})

watch(componentId, () => {
  method.value = methods.value[0] ?? ''
})

function close(): void {
  store.closeSignalConnect()
}

function onBackdrop(event: PointerEvent): void {
  if (event.target === event.currentTarget) close()
}

function connect(): void {
  const current = draft.value
  if (!current || !targetId.value || !componentName.value || !method.value) return
  store.connectSignalTo(current.fromId, current.signal, targetId.value, componentName.value, method.value)
}
</script>

<template>
  <div v-if="draft" class="modal-back" @pointerdown="onBackdrop">
    <div class="dialog connect-signal" role="dialog" aria-label="Connect signal">
      <div class="dialog-title">
        <span>Connect {{ draft.signal }}</span>
        <span class="spacer" />
        <button type="button" class="icon-btn" @click="close">
          <Icon name="close" />
        </button>
      </div>
      <div class="connect-body">
        <label>
          <span>Target node</span>
          <select v-model="targetId">
            <option v-for="target in targets" :key="target.id" :value="target.id">{{ target.label }}</option>
          </select>
        </label>
        <label>
          <span>Component</span>
          <select v-model="componentId">
            <option v-if="components.length === 0" value="">No component</option>
            <option v-for="component in components" :key="component.id" :value="component.id">{{ component.name }}</option>
          </select>
        </label>
        <label>
          <span>Method</span>
          <select v-model="method">
            <option v-if="methods.length === 0" value="">No method</option>
            <option v-for="name in methods" :key="name" :value="name">{{ name }}</option>
          </select>
        </label>
        <p v-if="store.signalError" class="node-error">{{ store.signalError }}</p>
      </div>
      <div class="dialog-actions">
        <span class="spacer" />
        <button type="button" class="btn" @click="close">Cancel</button>
        <button type="button" class="btn primary" :disabled="!method || !componentName" @click="connect">Connect</button>
      </div>
    </div>
  </div>
</template>

<style>
.dialog.connect-signal {
  width: min(440px, calc(100vw - 48px));
  height: auto;
}
.connect-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}
.connect-body label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--font-dim);
}
.connect-body select {
  height: 28px;
  background: var(--inset);
  border: 1px solid #141414;
  border-radius: 3px;
  padding: 0 6px;
  color: var(--font);
}
</style>
