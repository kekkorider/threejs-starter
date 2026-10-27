<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '../../lib/format'
import type { BodyDof, BodyMotion, BodySettings, BodyShapeKind, CombineModeName, MotionQualityName } from '../../physicsBody'
import { useEditorStore } from '../../stores/editor'
import PropRow from './PropRow.vue'
import Section from './Section.vue'

const store = useEditorStore()
const node = computed(() => store.selected)
const body = computed(() => node.value?.body ?? null)
const query = computed(() => store.inspectorFilter.trim().toLowerCase())

const labels = [
  'Motion Type', 'Object Layer', 'Shape', 'Mesh', 'Width', 'Height', 'Depth', 'Radius',
  'Mass', 'Friction', 'Restitution', 'Friction Combine', 'Restitution Combine',
  'Linear Damping', 'Angular Damping', 'Gravity Factor', 'Sensor', 'Allow Sleeping',
  'Max Linear Velocity', 'Max Angular Velocity', 'Motion Quality',
  'Translate X', 'Translate Y', 'Translate Z', 'Rotate X', 'Rotate Y', 'Rotate Z',
  'Kinematic vs Non Dynamic', 'Internal Edge Removal', 'Manifold Reduction',
]

const visible = computed(() => {
  if (!body.value) return false
  if (!query.value) return true
  if ('body'.includes(query.value) || 'shape'.includes(query.value) || 'physics'.includes(query.value)) return true
  return labels.some((label) => label.toLowerCase().includes(query.value))
})

function rowOn(label: string): boolean {
  if (!query.value) return true
  if ('body'.includes(query.value) || 'physics'.includes(query.value)) return true
  return label.toLowerCase().includes(query.value)
}

function id(): string | null {
  return node.value?.id ?? null
}

function edit(label: string, mutate: (settings: BodySettings) => void): void {
  const current = id()
  if (!current) return
  store.editBody(current, label, mutate)
}

function onNumber(label: string, key: 'width' | 'height' | 'depth' | 'radius' | 'mass' | 'friction' | 'restitution' | 'linearDamping' | 'angularDamping' | 'gravityFactor' | 'maxLinearVelocity' | 'maxAngularVelocity', event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  edit(label, (settings) => {
    settings[key] = value
  })
}

function onDof(axis: keyof BodyDof, event: Event): void {
  const value = (event.target as HTMLInputElement).checked
  edit(axis, (settings) => {
    settings.dof[axis] = value
  })
}
</script>

<template>
  <Section v-if="node && body && visible" title="Body" section-key="body" tone="sub body">
    <PropRow v-if="rowOn('Motion Type')" label="Motion Type" :reset="() => store.resetBody(node.id, 'motion')">
      <select :value="body.settings.motion" @change="edit('Motion', (settings) => { settings.motion = ($event.target as HTMLSelectElement).value as BodyMotion })">
        <option value="static">Static</option>
        <option value="kinematic">Kinematic</option>
        <option value="dynamic">Dynamic</option>
      </select>
    </PropRow>
    <PropRow v-if="rowOn('Object Layer')" label="Object Layer">
      <input :value="body.layer" disabled />
    </PropRow>
    <PropRow v-if="rowOn('Shape')" label="Shape" :reset="() => store.resetBody(node.id, 'shape')">
      <select :value="body.settings.shape" @change="edit('Shape', (settings) => { settings.shape = ($event.target as HTMLSelectElement).value as BodyShapeKind })">
        <option value="box">Box</option>
        <option value="sphere">Sphere</option>
        <option value="triangle">Triangle Mesh</option>
        <option value="convexHull">Convex Hull</option>
      </select>
    </PropRow>
    <PropRow v-if="rowOn('Width') && body.settings.shape === 'box'" label="Width" :reset="() => store.resetBody(node.id, 'width')">
      <input type="number" min="0.001" step="0.1" :value="formatNumber(body.settings.width)" @change="onNumber('Width', 'width', $event)" />
    </PropRow>
    <PropRow v-if="rowOn('Height') && body.settings.shape === 'box'" label="Height" :reset="() => store.resetBody(node.id, 'height')">
      <input type="number" min="0.001" step="0.1" :value="formatNumber(body.settings.height)" @change="onNumber('Height', 'height', $event)" />
    </PropRow>
    <PropRow v-if="rowOn('Depth') && body.settings.shape === 'box'" label="Depth" :reset="() => store.resetBody(node.id, 'depth')">
      <input type="number" min="0.001" step="0.1" :value="formatNumber(body.settings.depth)" @change="onNumber('Depth', 'depth', $event)" />
    </PropRow>
    <PropRow v-if="rowOn('Radius') && body.settings.shape === 'sphere'" label="Radius" :reset="() => store.resetBody(node.id, 'radius')">
      <input type="number" min="0.001" step="0.1" :value="formatNumber(body.settings.radius)" @change="onNumber('Radius', 'radius', $event)" />
    </PropRow>
    <PropRow v-if="rowOn('Mesh') && (body.settings.shape === 'triangle' || body.settings.shape === 'convexHull')" label="Mesh" :reset="() => store.resetBody(node.id, 'meshId')">
      <select :value="body.settings.meshId" @change="edit('Mesh', (settings) => { settings.meshId = ($event.target as HTMLSelectElement).value })">
        <option value="">First mesh child</option>
        <option v-for="mesh in body.meshes" :key="mesh.id" :value="mesh.id">{{ mesh.name }}</option>
      </select>
    </PropRow>
    <PropRow v-if="rowOn('Mass')" label="Mass" :reset="() => store.resetBody(node.id, 'mass')">
      <input type="number" min="0.001" step="0.1" :value="formatNumber(body.settings.mass)" @change="onNumber('Mass', 'mass', $event)" />
    </PropRow>
    <PropRow v-if="rowOn('Friction')" label="Friction" :reset="() => store.resetBody(node.id, 'friction')">
      <input type="number" min="0" step="0.01" :value="formatNumber(body.settings.friction)" @change="onNumber('Friction', 'friction', $event)" />
    </PropRow>
    <PropRow v-if="rowOn('Restitution')" label="Restitution" :reset="() => store.resetBody(node.id, 'restitution')">
      <input type="number" min="0" step="0.01" :value="formatNumber(body.settings.restitution)" @change="onNumber('Restitution', 'restitution', $event)" />
    </PropRow>
    <PropRow v-if="rowOn('Friction Combine')" label="Friction Combine" :reset="() => store.resetBody(node.id, 'frictionCombine')">
      <select :value="body.settings.frictionCombine" @change="edit('Friction Combine', (settings) => { settings.frictionCombine = ($event.target as HTMLSelectElement).value as CombineModeName })">
        <option value="average">Average</option>
        <option value="multiply">Multiply</option>
        <option value="min">Min</option>
        <option value="max">Max</option>
        <option value="geometricMean">Geometric Mean</option>
      </select>
    </PropRow>
    <PropRow v-if="rowOn('Restitution Combine')" label="Restitution Combine" :reset="() => store.resetBody(node.id, 'restitutionCombine')">
      <select :value="body.settings.restitutionCombine" @change="edit('Restitution Combine', (settings) => { settings.restitutionCombine = ($event.target as HTMLSelectElement).value as CombineModeName })">
        <option value="average">Average</option>
        <option value="multiply">Multiply</option>
        <option value="min">Min</option>
        <option value="max">Max</option>
        <option value="geometricMean">Geometric Mean</option>
      </select>
    </PropRow>
    <PropRow v-if="rowOn('Linear Damping')" label="Linear Damping" :reset="() => store.resetBody(node.id, 'linearDamping')">
      <input type="number" min="0" step="0.01" :value="formatNumber(body.settings.linearDamping)" @change="onNumber('Linear Damping', 'linearDamping', $event)" />
    </PropRow>
    <PropRow v-if="rowOn('Angular Damping')" label="Angular Damping" :reset="() => store.resetBody(node.id, 'angularDamping')">
      <input type="number" min="0" step="0.01" :value="formatNumber(body.settings.angularDamping)" @change="onNumber('Angular Damping', 'angularDamping', $event)" />
    </PropRow>
    <PropRow v-if="rowOn('Gravity Factor')" label="Gravity Factor" :reset="() => store.resetBody(node.id, 'gravityFactor')">
      <input type="number" step="0.1" :value="formatNumber(body.settings.gravityFactor)" @change="onNumber('Gravity Factor', 'gravityFactor', $event)" />
    </PropRow>
    <PropRow v-if="rowOn('Sensor')" label="Sensor" :reset="() => store.resetBody(node.id, 'sensor')">
      <label class="check">
        <input type="checkbox" :checked="body.settings.sensor" @change="edit('Sensor', (settings) => { settings.sensor = ($event.target as HTMLInputElement).checked })" />
      </label>
    </PropRow>
    <PropRow v-if="rowOn('Allow Sleeping')" label="Allow Sleeping" :reset="() => store.resetBody(node.id, 'allowSleeping')">
      <label class="check">
        <input type="checkbox" :checked="body.settings.allowSleeping" @change="edit('Allow Sleeping', (settings) => { settings.allowSleeping = ($event.target as HTMLInputElement).checked })" />
      </label>
    </PropRow>
    <PropRow v-if="rowOn('Max Linear Velocity')" label="Max Linear Velocity" :reset="() => store.resetBody(node.id, 'maxLinearVelocity')">
      <input type="number" min="0.001" step="1" :value="formatNumber(body.settings.maxLinearVelocity)" @change="onNumber('Max Linear Velocity', 'maxLinearVelocity', $event)" />
    </PropRow>
    <PropRow v-if="rowOn('Max Angular Velocity')" label="Max Angular Velocity" :reset="() => store.resetBody(node.id, 'maxAngularVelocity')">
      <input type="number" min="0.001" step="0.1" :value="formatNumber(body.settings.maxAngularVelocity)" @change="onNumber('Max Angular Velocity', 'maxAngularVelocity', $event)" />
    </PropRow>
    <PropRow v-if="rowOn('Motion Quality')" label="Motion Quality" :reset="() => store.resetBody(node.id, 'motionQuality')">
      <select :value="body.settings.motionQuality" @change="edit('Motion Quality', (settings) => { settings.motionQuality = ($event.target as HTMLSelectElement).value as MotionQualityName })">
        <option value="discrete">Discrete</option>
        <option value="linearCast">Linear Cast</option>
      </select>
    </PropRow>
    <PropRow v-if="rowOn('Translate X')" label="Translate X" :reset="() => store.resetBody(node.id, 'dof')">
      <label class="check">
        <input type="checkbox" :checked="body.settings.dof.translateX" @change="onDof('translateX', $event)" />
      </label>
    </PropRow>
    <PropRow v-if="rowOn('Translate Y')" label="Translate Y" :reset="() => store.resetBody(node.id, 'dof')">
      <label class="check">
        <input type="checkbox" :checked="body.settings.dof.translateY" @change="onDof('translateY', $event)" />
      </label>
    </PropRow>
    <PropRow v-if="rowOn('Translate Z')" label="Translate Z" :reset="() => store.resetBody(node.id, 'dof')">
      <label class="check">
        <input type="checkbox" :checked="body.settings.dof.translateZ" @change="onDof('translateZ', $event)" />
      </label>
    </PropRow>
    <PropRow v-if="rowOn('Rotate X')" label="Rotate X" :reset="() => store.resetBody(node.id, 'dof')">
      <label class="check">
        <input type="checkbox" :checked="body.settings.dof.rotateX" @change="onDof('rotateX', $event)" />
      </label>
    </PropRow>
    <PropRow v-if="rowOn('Rotate Y')" label="Rotate Y" :reset="() => store.resetBody(node.id, 'dof')">
      <label class="check">
        <input type="checkbox" :checked="body.settings.dof.rotateY" @change="onDof('rotateY', $event)" />
      </label>
    </PropRow>
    <PropRow v-if="rowOn('Rotate Z')" label="Rotate Z" :reset="() => store.resetBody(node.id, 'dof')">
      <label class="check">
        <input type="checkbox" :checked="body.settings.dof.rotateZ" @change="onDof('rotateZ', $event)" />
      </label>
    </PropRow>
    <PropRow v-if="rowOn('Kinematic vs Non Dynamic')" label="Kinematic vs Non Dynamic" :reset="() => store.resetBody(node.id, 'collideKinematicVsNonDynamic')">
      <label class="check">
        <input type="checkbox" :checked="body.settings.collideKinematicVsNonDynamic" @change="edit('Kinematic vs Non Dynamic', (settings) => { settings.collideKinematicVsNonDynamic = ($event.target as HTMLInputElement).checked })" />
      </label>
    </PropRow>
    <PropRow v-if="rowOn('Internal Edge Removal')" label="Internal Edge Removal" :reset="() => store.resetBody(node.id, 'enhancedInternalEdgeRemoval')">
      <label class="check">
        <input type="checkbox" :checked="body.settings.enhancedInternalEdgeRemoval" @change="edit('Internal Edge Removal', (settings) => { settings.enhancedInternalEdgeRemoval = ($event.target as HTMLInputElement).checked })" />
      </label>
    </PropRow>
    <PropRow v-if="rowOn('Manifold Reduction')" label="Manifold Reduction" :reset="() => store.resetBody(node.id, 'useManifoldReduction')">
      <label class="check">
        <input type="checkbox" :checked="body.settings.useManifoldReduction" @change="edit('Manifold Reduction', (settings) => { settings.useManifoldReduction = ($event.target as HTMLInputElement).checked })" />
      </label>
    </PropRow>
  </Section>
</template>
