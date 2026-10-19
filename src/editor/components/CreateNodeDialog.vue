<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import CodeEditor from './CodeEditor.vue'
import Icon from './Icon.vue'
import { GEOMETRY_CATALOG, defaultParams, geometryEntry, type GeometryType, type ParamSpec } from '../geometry'
import { kindClass, kindIcon } from '../lib/format'
import { NODE_TYPES, type NodeKind } from '../state'
import { useEditorStore } from '../stores/editor'
import { TSL_PRESETS, presetById } from '../tsl'

const store = useEditorStore()
const initial = presetById(store.createPreset || 'lit')
const draft = reactive({
  kind: store.createKind,
  query: '',
  name: '',
  geometryType: 'box' as GeometryType,
  params: defaultParams('box'),
  presetId: initial.id,
  source: initial.source,
  color: '#fff4e4',
  ground: '#3c342c',
  intensity: 2.4,
  range: 12,
  angle: 35,
  penumbra: 0.4,
})
const error = ref('')
const groups = ['Node', 'Mesh', 'Light']

const entry = computed(() => NODE_TYPES.find((item) => item.kind === draft.kind) ?? NODE_TYPES[0]!)
const specs = computed(() => geometryEntry(draft.geometryType).params)

function entriesFor(group: string): typeof NODE_TYPES {
  const query = draft.query.trim().toLowerCase()
  return NODE_TYPES.filter((item) => {
    if (item.group !== group) return false
    return !query || item.label.toLowerCase().includes(query)
  })
}

function choose(kind: NodeKind): void {
  draft.kind = kind
}

function onGeometry(event: Event): void {
  draft.geometryType = (event.target as HTMLSelectElement).value as GeometryType
  draft.params = defaultParams(draft.geometryType)
}

function onPreset(event: Event): void {
  const next = presetById((event.target as HTMLSelectElement).value)
  draft.presetId = next.id
  draft.source = next.source
}

function setParam(spec: ParamSpec, event: Event): void {
  draft.params[spec.key] = Number((event.target as HTMLInputElement).value)
}

function submit(): void {
  const message = store.createFromDraft({
    kind: draft.kind,
    name: draft.name,
    geometryType: draft.geometryType,
    params: { ...draft.params },
    source: draft.source,
    color: draft.color,
    ground: draft.ground,
    intensity: draft.intensity,
    range: draft.range,
    angle: draft.angle,
    penumbra: draft.penumbra,
  })
  error.value = message ?? ''
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    store.createOpen = false
    return
  }
  if (event.key === 'Enter' && (event.target as HTMLElement).tagName !== 'TEXTAREA') {
    event.preventDefault()
    submit()
  }
}

function onBackdrop(event: PointerEvent): void {
  if (event.target === event.currentTarget) store.createOpen = false
}
</script>

<template>
  <div class="modal-back" @pointerdown="onBackdrop">
    <div class="dialog" @keydown="onKey">
      <div class="dialog-title">
        <span>Create New Node</span>
        <span class="spacer" />
        <button type="button" class="icon-btn" @click="store.createOpen = false">
          <Icon name="close" />
        </button>
      </div>
      <div class="dialog-body">
        <div class="dialog-list">
          <input v-model="draft.query" class="filter dialog-filter" placeholder="Filter nodes" />
          <div class="tree dialog-nodes">
            <template v-for="group in groups" :key="group">
              <template v-if="entriesFor(group).length">
                <div class="group-label">{{ group }}</div>
                <div
                  v-for="item in entriesFor(group)"
                  :key="item.kind"
                  class="tree-row"
                  :class="{ selected: item.kind === draft.kind }"
                  style="padding-left: 12px"
                  @click="choose(item.kind)"
                  @dblclick="submit"
                >
                  <span class="kind-icon" :class="kindClass(item.kind)">
                    <Icon :name="kindIcon(item.kind)" />
                  </span>
                  <span class="label">{{ item.label }}</span>
                </div>
              </template>
            </template>
          </div>
        </div>
        <div class="dialog-detail">
          <h2>{{ entry.label }}</h2>
          <div class="inherits" style="padding: 0">{{ entry.inherits }}</div>
          <p class="desc">{{ entry.description }}</p>
          <template v-if="draft.kind === 'MeshInstance3D'">
            <div class="prop">
              <div class="prop-label">Geometry</div>
              <select :value="draft.geometryType" @change="onGeometry">
                <option v-for="item in GEOMETRY_CATALOG" :key="item.type" :value="item.type">{{ item.label }}</option>
              </select>
            </div>
            <div v-for="spec in specs" :key="spec.key" class="prop">
              <div class="prop-label">{{ spec.label }}</div>
              <input
                type="number"
                :min="spec.min"
                :max="spec.max"
                :step="spec.step"
                :value="draft.params[spec.key]"
                @change="setParam(spec, $event)"
              />
            </div>
            <div class="prop">
              <div class="prop-label">TSL Preset</div>
              <select :value="draft.presetId" @change="onPreset">
                <option v-for="item in TSL_PRESETS" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </div>
            <CodeEditor v-model="draft.source" />
            <div class="hint">{{ error }}</div>
          </template>
          <template v-else-if="draft.kind !== 'Node3D'">
            <div class="prop">
              <div class="prop-label">Color</div>
              <input v-model="draft.color" type="color" />
            </div>
            <div class="prop">
              <div class="prop-label">Energy</div>
              <input v-model.number="draft.intensity" type="number" min="0" max="50" step="0.1" />
            </div>
            <div v-if="draft.kind === 'HemisphereLight3D'" class="prop">
              <div class="prop-label">Ground</div>
              <input v-model="draft.ground" type="color" />
            </div>
            <div v-if="draft.kind === 'OmniLight3D' || draft.kind === 'SpotLight3D'" class="prop">
              <div class="prop-label">Range</div>
              <input v-model.number="draft.range" type="number" min="0" max="200" step="0.1" />
            </div>
            <template v-if="draft.kind === 'SpotLight3D'">
              <div class="prop">
                <div class="prop-label">Angle</div>
                <input v-model.number="draft.angle" type="number" min="1" max="90" step="1" />
              </div>
              <div class="prop">
                <div class="prop-label">Penumbra</div>
                <input v-model.number="draft.penumbra" type="number" min="0" max="1" step="0.01" />
              </div>
            </template>
          </template>
        </div>
      </div>
      <div class="dialog-actions">
        <label class="name-label">Name</label>
        <input v-model="draft.name" type="text" placeholder="MeshInstance" />
        <span class="spacer" />
        <button type="button" class="btn" @click="store.createOpen = false">Cancel</button>
        <button type="button" class="btn primary" @click="submit">Create</button>
      </div>
    </div>
  </div>
</template>

<style>
.dialog-actions .name-label {
  flex: none;
  color: var(--font-dim);
}

.dialog-actions input[type="text"] {
  width: 220px;
  height: 28px;
  background: #1e1e1e;
  border: 1px solid #121212;
  border-radius: 3px;
  padding: 0 8px;
}
</style>
