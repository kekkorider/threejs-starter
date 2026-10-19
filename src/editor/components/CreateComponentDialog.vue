<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { COMPONENT_DRAG_PREFIX, componentTemplate, identifierName } from '../behaviors'
import { useEditorStore } from '../stores/editor'
import CodeEditor from './CodeEditor.vue'
import Icon from './Icon.vue'

const store = useEditorStore()
const selectedId = ref(store.componentFocusId || 'new')
const sourceDirty = ref(false)
const error = ref('')
const dragging = ref(false)
const draft = reactive({
  query: '',
  name: 'Component',
  source: componentTemplate('Component'),
})

const files = computed(() => {
  const query = draft.query.trim().toLowerCase()
  return store.componentFiles.filter((file) => !query || file.name.toLowerCase().includes(query) || file.path.toLowerCase().includes(query))
})
const showNew = computed(() => {
  const query = draft.query.trim().toLowerCase()
  return !query || 'component'.includes(query) || 'new'.includes(query)
})
const current = computed(() => store.componentFiles.find((file) => file.id === selectedId.value) ?? null)
const isNew = computed(() => selectedId.value === 'new')

watch(() => draft.name, (name) => {
  if (!isNew.value || sourceDirty.value) return
  draft.source = componentTemplate(identifierName(name))
})

function choose(id: string): void {
  selectedId.value = id
  error.value = ''
  sourceDirty.value = false
  if (id === 'new') {
    draft.name = 'Component'
    draft.source = componentTemplate('Component')
    return
  }
  const file = store.componentFiles.find((item) => item.id === id)
  if (!file) return
  draft.name = file.name
  draft.source = file.source
}

function onSourceChange(): void {
  sourceDirty.value = true
}

function submit(): void {
  if (!isNew.value) return
  const result = store.createComponent(draft.name, draft.source)
  if ('error' in result) {
    error.value = result.error
    return
  }
  error.value = ''
  sourceDirty.value = false
  choose(result.id)
}

function save(): void {
  if (!current.value) return
  const message = store.updateComponent(current.value.id, draft.source)
  error.value = message ?? ''
  if (!message) sourceDirty.value = false
}

function addExisting(): void {
  if (!current.value) return
  if (sourceDirty.value) {
    const message = store.updateComponent(current.value.id, draft.source)
    if (message) {
      error.value = message
      return
    }
    sourceDirty.value = false
  }
  store.addComponentToSelection(current.value.id)
}

watch(current, (file) => {
  if (selectedId.value !== 'new' && !file) choose('new')
})

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    store.componentOpen = false
    return
  }
  if (event.key === 'Enter' && (event.target as HTMLElement).tagName !== 'TEXTAREA' && isNew.value) {
    event.preventDefault()
    submit()
  }
}

function onBackdrop(event: PointerEvent): void {
  if (event.target === event.currentTarget) store.componentOpen = false
}

function onDragStart(event: DragEvent, id: string): void {
  event.dataTransfer?.setData('text/plain', `${COMPONENT_DRAG_PREFIX}${id}`)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
  dragging.value = true
}

function onDragEnd(): void {
  dragging.value = false
}

if (store.componentFocusId) choose(store.componentFocusId)
</script>

<template>
  <div class="modal-back" :class="{ 'is-passthrough': dragging }" @pointerdown="onBackdrop">
    <div class="dialog" @keydown="onKey">
      <div class="dialog-title">
        <span>Create Component</span>
        <span class="spacer" />
        <button type="button" class="icon-btn" @click="store.componentOpen = false">
          <Icon name="close" />
        </button>
      </div>
      <div class="dialog-body">
        <div class="dialog-list">
          <input v-model="draft.query" class="filter dialog-filter" placeholder="Filter components" />
          <div class="tree dialog-nodes">
            <template v-if="showNew">
              <div class="group-label">New</div>
              <div
                class="tree-row"
                :class="{ selected: isNew }"
                style="padding-left: 12px"
                @click="choose('new')"
                @dblclick="submit"
              >
                <span class="kind-icon component"><Icon name="component" /></span>
                <span class="label">Component</span>
              </div>
            </template>
            <template v-if="files.length">
              <div class="group-label">Components</div>
              <div
                v-for="file in files"
                :key="file.id"
                class="tree-row"
                :class="{ selected: file.id === selectedId }"
                style="padding-left: 12px"
                draggable="true"
                @click="choose(file.id)"
                @dblclick="addExisting"
                @dragstart="onDragStart($event, file.id)"
                @dragend="onDragEnd"
              >
                <span class="kind-icon component"><Icon name="component" /></span>
                <span class="label">{{ file.name }}</span>
                <button type="button" class="icon-btn danger row-delete" title="Delete" @click.stop="store.requestDeleteComponent(file.id)">
                  <Icon name="delete" />
                </button>
              </div>
            </template>
          </div>
        </div>
        <div class="dialog-detail">
          <template v-if="isNew">
            <h2>Component</h2>
            <div class="inherits" style="padding: 0">Object3DBehaviour</div>
            <p class="desc">A three-start behavior. Creating it writes a TypeScript file with the lifecycle methods. Drag it onto an object to attach it.</p>
            <CodeEditor v-model="draft.source" class="component-source" @change="onSourceChange" />
          </template>
          <template v-else-if="current">
            <h2>{{ current.name }}</h2>
            <div class="inherits" style="padding: 0">{{ current.path }}</div>
            <p class="desc">Add it to the selected object, or drag it onto any object in the scene tree.</p>
            <CodeEditor v-model="draft.source" class="component-source" @change="onSourceChange" />
          </template>
          <div class="hint">{{ error }}</div>
        </div>
      </div>
      <div class="dialog-actions">
        <label class="name-label">Name</label>
        <input v-model="draft.name" type="text" placeholder="Component" :disabled="!isNew" />
        <span class="spacer" />
        <button type="button" class="btn" @click="store.componentOpen = false">Cancel</button>
        <button v-if="!isNew && current" type="button" class="btn" @click="store.requestDeleteComponent(current.id)">Delete</button>
        <button v-if="!isNew && current && sourceDirty" type="button" class="btn" @click="save">Save</button>
        <button v-if="isNew" type="button" class="btn primary" @click="submit">Create</button>
        <button v-else-if="current" type="button" class="btn primary" @click="addExisting">Add</button>
      </div>
    </div>
  </div>
</template>
