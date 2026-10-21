<script setup lang="ts">
import { computed } from 'vue'
import type { CameraFlagField, CameraInspector, CameraNumberField, CameraProjection } from '../../camera'
import { formatNumber } from '../../lib/format'
import { useEditorStore } from '../../stores/editor'
import PropRow from './PropRow.vue'
import Section from './Section.vue'

const store = useEditorStore()
const node = computed(() => store.selected)
const camera = computed(() => node.value?.camera ?? null)
const query = computed(() => store.inspectorFilter.trim().toLowerCase())

interface NumberRow {
  field: CameraNumberField
  label: string
  min?: number
  max?: number
  step: number
  scrub: number
  extra?: string
}

const sharedRows: NumberRow[] = [
  { field: 'near', label: 'Near', min: 0, step: 0.01, scrub: 0.02 },
  { field: 'far', label: 'Far', min: 0.01, step: 0.1, scrub: 0.1 },
  { field: 'zoom', label: 'Zoom', min: 0.001, step: 0.01, scrub: 0.005 },
  { field: 'layers', label: 'Layers', min: 0, step: 1, scrub: 0, extra: 'mask cull bitmask' },
]

const perspectiveRows: NumberRow[] = [
  { field: 'fov', label: 'FOV', min: 1, max: 179, step: 0.1, scrub: 0.15, extra: 'field of view' },
  { field: 'aspect', label: 'Aspect', min: 0.001, step: 0.01, scrub: 0.01 },
  { field: 'focus', label: 'Focus', min: 0, step: 0.1, scrub: 0.05, extra: 'depth of field stereoscopy' },
  { field: 'filmGauge', label: 'Film Gauge', min: 0.001, step: 0.1, scrub: 0.1, extra: 'millimeters' },
  { field: 'filmOffset', label: 'Film Offset', step: 0.1, scrub: 0.05 },
  { field: 'focalLength', label: 'Focal Length', min: 0.001, step: 0.1, scrub: 0.1, extra: 'millimeters lens' },
]

const orthoRows: NumberRow[] = [
  { field: 'left', label: 'Left', step: 0.1, scrub: 0.05, extra: 'frustum' },
  { field: 'right', label: 'Right', step: 0.1, scrub: 0.05, extra: 'frustum' },
  { field: 'top', label: 'Top', step: 0.1, scrub: 0.05, extra: 'frustum' },
  { field: 'bottom', label: 'Bottom', step: 0.1, scrub: 0.05, extra: 'frustum' },
]

const viewRows: NumberRow[] = [
  { field: 'fullWidth', label: 'Full Width', min: 1, step: 1, scrub: 1 },
  { field: 'fullHeight', label: 'Full Height', min: 1, step: 1, scrub: 1 },
  { field: 'offsetX', label: 'Offset X', step: 1, scrub: 1 },
  { field: 'offsetY', label: 'Offset Y', step: 1, scrub: 1 },
  { field: 'viewWidth', label: 'Width', min: 1, step: 1, scrub: 1 },
  { field: 'viewHeight', label: 'Height', min: 1, step: 1, scrub: 1 },
]

const cameraLabels = ['Projection', 'Current', 'Preview', 'Near', 'Far', 'Zoom', 'Sync Viewport', 'Layers', ...sharedRows.map((row) => row.label)]
const perspectiveLabels = [...perspectiveRows.map((row) => row.label), 'Effective FOV', 'Film Width', 'Film Height']
const orthoLabels = orthoRows.map((row) => row.label)
const viewLabels = ['Enabled', ...viewRows.map((row) => row.label)]

function sectionOn(title: string, labels: string[]): boolean {
  if (!camera.value) return false
  if (!query.value) return true
  if (title.toLowerCase().includes(query.value)) return true
  return labels.some((label) => label.toLowerCase().includes(query.value))
}

function rowOn(title: string, label: string, extra = ''): boolean {
  if (!query.value) return true
  if (title.toLowerCase().includes(query.value)) return true
  return `${label} ${extra}`.toLowerCase().includes(query.value)
}

function readNumber(current: CameraInspector, field: CameraNumberField): number {
  switch (field) {
    case 'focalLength': return current.focalLength
    case 'fullWidth': return current.view.fullWidth
    case 'fullHeight': return current.view.fullHeight
    case 'offsetX': return current.view.offsetX
    case 'offsetY': return current.view.offsetY
    case 'viewWidth': return current.view.width
    case 'viewHeight': return current.view.height
    case 'aspect':
      return current.projection === 'perspective' && current.view.enabled
        ? current.view.fullWidth / Math.max(current.view.fullHeight, 0.001)
        : current.aspect
    default: return current[field]
  }
}

function writeNumber(field: CameraNumberField, value: number): void {
  const id = node.value?.id
  if (!id || !Number.isFinite(value)) return
  store.setCameraNumber(id, field, value)
}

function scrubNumber(row: NumberRow, delta: number): void {
  const current = camera.value
  if (!current) return
  const scale = row.scrub === 0 ? (Math.trunc(delta / 8) || Math.sign(delta)) : delta * row.scrub
  writeNumber(row.field, readNumber(current, row.field) + scale)
}

function writeFlag(field: CameraFlagField, value: boolean): void {
  const id = node.value?.id
  if (id) store.setCameraFlag(id, field, value)
}

function onProjection(event: Event): void {
  const id = node.value?.id
  if (!id) return
  store.setCameraProjection(id, (event.target as HTMLSelectElement).value as CameraProjection)
}

const aspectLocked = computed(() => camera.value?.projection === 'perspective' && camera.value.view.enabled)
</script>

<template>
  <Section
    v-if="node && camera && sectionOn('Camera', cameraLabels)"
    title="Camera"
    section-key="camera"
    tone="sub camera"
  >
    <PropRow v-if="rowOn('Camera', 'Projection', 'perspective orthographic')" label="Projection" :reset="() => store.resetCamera(node.id, 'projection')">
      <select :value="camera.projection" @change="onProjection">
        <option value="perspective">Perspective</option>
        <option value="orthographic">Orthographic</option>
      </select>
    </PropRow>
    <PropRow v-if="rowOn('Camera', 'Current', 'play')" label="Current" :reset="() => store.resetCamera(node.id, 'current')">
      <label class="check">
        <input type="checkbox" :checked="camera.current" @change="writeFlag('current', ($event.target as HTMLInputElement).checked)" />
      </label>
    </PropRow>
    <PropRow v-if="rowOn('Camera', 'Preview', 'look through')" label="Preview">
      <label class="check">
        <input type="checkbox" :checked="camera.preview" @change="store.setCameraPreview(node.id, ($event.target as HTMLInputElement).checked)" />
      </label>
    </PropRow>
    <PropRow
      v-for="row in sharedRows.filter((item) => item.field !== 'layers' && rowOn('Camera', item.label, item.extra))"
      :key="row.field"
      :label="row.label"
      scrub
      :reset="() => node && store.resetCamera(node.id, row.field)"
      @scrub="scrubNumber(row, $event)"
    >
      <input
        type="number"
        :min="row.min"
        :max="row.max"
        :step="row.step"
        :value="formatNumber(readNumber(camera, row.field))"
        @change="writeNumber(row.field, Number(($event.target as HTMLInputElement).value))"
      />
    </PropRow>
    <PropRow v-if="rowOn('Camera', 'Sync Viewport', 'aspect fit width')" label="Sync Viewport" :reset="() => store.resetCamera(node.id, 'syncAspect')">
      <label class="check">
        <input type="checkbox" :checked="camera.syncAspect" @change="writeFlag('syncAspect', ($event.target as HTMLInputElement).checked)" />
      </label>
    </PropRow>
    <PropRow
      v-if="rowOn('Camera', 'Layers', 'mask cull bitmask')"
      label="Layers"
      scrub
      :reset="() => node && store.resetCamera(node.id, 'layers')"
      @scrub="scrubNumber(sharedRows[3]!, $event)"
    >
      <input
        type="number"
        min="0"
        step="1"
        :value="formatNumber(camera.layers)"
        @change="writeNumber('layers', Number(($event.target as HTMLInputElement).value))"
      />
    </PropRow>
    <div v-if="!query" class="hint">Current is the camera Play uses. Preview looks through this camera in the editor. Sync Viewport fits the picture to the window while it is the view. Layers is the camera mask; bit 1 is layer 0.</div>
  </Section>

  <Section
    v-if="node && camera?.projection === 'perspective' && sectionOn('Perspective', perspectiveLabels)"
    title="Perspective"
    section-key="camera-perspective"
    tone="sub camera"
  >
    <template v-for="row in perspectiveRows" :key="row.field">
      <PropRow
        v-if="rowOn('Perspective', row.label, row.extra)"
        :label="row.label"
        scrub
        :reset="() => node && store.resetCamera(node.id, row.field)"
        @scrub="scrubNumber(row, $event)"
      >
        <input
          type="number"
          :min="row.min"
          :max="row.max"
          :step="row.step"
          :disabled="row.field === 'aspect' && aspectLocked"
          :value="formatNumber(readNumber(camera, row.field))"
          @change="writeNumber(row.field, Number(($event.target as HTMLInputElement).value))"
        />
      </PropRow>
    </template>
    <PropRow v-if="rowOn('Perspective', 'Effective FOV', 'zoom')" label="Effective FOV">
      <input type="number" disabled :value="formatNumber(camera.effectiveFov)" />
    </PropRow>
    <PropRow v-if="rowOn('Perspective', 'Film Width')" label="Film Width">
      <input type="number" disabled :value="formatNumber(camera.filmWidth)" />
    </PropRow>
    <PropRow v-if="rowOn('Perspective', 'Film Height')" label="Film Height">
      <input type="number" disabled :value="formatNumber(camera.filmHeight)" />
    </PropRow>
    <div v-if="!query && aspectLocked" class="hint">View offset is on, so aspect follows Full Width / Full Height.</div>
    <div v-else-if="!query" class="hint">FOV is the vertical field of view in degrees. Focal length uses the film gauge, in the same unit. Effective FOV includes zoom.</div>
  </Section>

  <Section
    v-if="node && camera?.projection === 'orthographic' && sectionOn('Orthographic', orthoLabels)"
    title="Orthographic"
    section-key="camera-ortho"
    tone="sub camera"
  >
    <PropRow
      v-for="row in orthoRows.filter((item) => rowOn('Orthographic', item.label, item.extra))"
      :key="row.field"
      :label="row.label"
      scrub
      :reset="() => node && store.resetCamera(node.id, row.field)"
      @scrub="scrubNumber(row, $event)"
    >
      <input
        type="number"
        :step="row.step"
        :value="formatNumber(readNumber(camera, row.field))"
        @change="writeNumber(row.field, Number(($event.target as HTMLInputElement).value))"
      />
    </PropRow>
    <div v-if="!query" class="hint">Left, right, top, and bottom are the frustum planes in camera space. Sync Viewport keeps this height and fits the width while the camera is the view.</div>
  </Section>

  <Section
    v-if="node && camera && sectionOn('View Offset', viewLabels)"
    title="View Offset"
    section-key="camera-view"
    tone="sub camera"
  >
    <PropRow v-if="rowOn('View Offset', 'Enabled')" label="Enabled" :reset="() => store.resetCamera(node.id, 'viewEnabled')">
      <label class="check">
        <input type="checkbox" :checked="camera.view.enabled" @change="writeFlag('viewEnabled', ($event.target as HTMLInputElement).checked)" />
      </label>
    </PropRow>
    <PropRow
      v-for="row in viewRows.filter((item) => rowOn('View Offset', item.label))"
      :key="row.field"
      :label="row.label"
      scrub
      :reset="() => node && store.resetCamera(node.id, row.field)"
      @scrub="scrubNumber(row, $event)"
    >
      <input
        type="number"
        :min="row.min"
        :step="row.step"
        :value="formatNumber(readNumber(camera, row.field))"
        @change="writeNumber(row.field, Number(($event.target as HTMLInputElement).value))"
      />
    </PropRow>
    <div v-if="!query" class="hint">A sub-rectangle of a larger frustum, for a multi-monitor view. Full size is the whole view; offset and width pick this camera's piece.</div>
  </Section>
</template>
