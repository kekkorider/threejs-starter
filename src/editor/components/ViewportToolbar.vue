<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useEditorStore, type ToolMode } from '../stores/editor'
import Icon from './Icon.vue'
import PreviewSunEnvMenu from './PreviewSunEnvMenu.vue'

const store = useEditorStore()

const tools: { id: ToolMode, icon: string, label: string, key: string }[] = [
  { id: 'select', icon: 'select', label: 'Select', key: 'Q' },
  { id: 'translate', icon: 'move', label: 'Move', key: 'W' },
  { id: 'rotate', icon: 'rotate', label: 'Rotate', key: 'E' },
  { id: 'scale', icon: 'scale', label: 'Scale', key: 'R' },
  { id: 'list', icon: 'list-select', label: 'List', key: '' },
]

function toolTitle(item: { id: ToolMode, label: string, key: string }): string {
  if (item.id === 'select') return 'Select (Q). Drag a rectangle to box-select. Shift adds, Ctrl toggles.'
  if (item.id === 'list') return 'Show list of selectable nodes at the clicked position. One node is selected. Several open a menu. Alt+right-click does this in any mode.'
  return `${item.label} (${item.key})`
}

function onView(event: Event): void {
  store.setView((event.target as HTMLSelectElement).value as 'persp' | 'top' | 'front' | 'right')
}

function onShading(event: Event): void {
  store.setShading((event.target as HTMLSelectElement).value as 'shaded' | 'debug')
}

function sunTitle(): string {
  if (!store.canTogglePreviewSun) {
    return 'Preview sun is off while the scene has a DirectionalLight.'
  }
  return store.previewSunEnabled
    ? 'Hide preview sunlight'
    : 'Show preview sunlight when the scene has no DirectionalLight'
}

function envTitle(): string {
  if (!store.canTogglePreviewEnv) {
    return 'Preview environment is off while the scene has a WorldEnvironment.'
  }
  return store.previewEnvEnabled
    ? 'Hide preview environment'
    : 'Show preview environment when the scene has no WorldEnvironment'
}

function onDocumentClick(event: MouseEvent): void {
  if (!store.previewMenuOpen) return
  const target = event.target instanceof Element
    ? event.target
    : (event.target as Node | null)?.parentElement ?? null
  if (target?.closest('.preview-menu, .preview-sun-env')) return
  store.closePreviewMenu()
}

function openPreviewMenu(event: MouseEvent): void {
  event.preventDefault()
  event.stopPropagation()
  store.togglePreviewMenu()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick, true)
})
</script>

<template>
  <div class="vp-toolbar">
    <div class="tool-group">
      <button
        v-for="item in tools"
        :key="item.id"
        type="button"
        class="tool-btn"
        :class="{ active: store.tool === item.id }"
        :title="toolTitle(item)"
        @click="store.setTool(item.id)"
      >
        <Icon :name="item.icon" />
      </button>
    </div>
    <div class="tool-group">
      <button type="button" class="tool-btn" title="Toggle local/world space" @click="store.toggleSpace()">
        <Icon :name="store.space === 'local' ? 'local' : 'world'" />
      </button>
      <button type="button" class="tool-btn" :class="{ active: store.snap }" title="Use snap — 0.5 m, 15°, 0.1" @click="store.toggleSnap()">
        <Icon name="snap" />
      </button>
    </div>
    <div class="tool-group">
      <select title="Viewport view" @change="onView">
        <option value="persp">Perspective</option>
        <option value="top">Top</option>
        <option value="front">Front</option>
        <option value="right">Right</option>
      </select>
      <select
        :title="store.shading === 'debug'
          ? 'Debug Split: top-left is the shaded color, top-right is distance from the camera (closer is darker), bottom-left is view normals, bottom-right is motion since the last frame (gray means still).'
          : 'Shaded is the scene. Debug Split shows color, depth, normals, and motion in four quadrants.'"
        :value="store.shading"
        @change="onShading"
      >
        <option value="shaded">Shaded</option>
        <option value="debug">Debug Split</option>
      </select>
    </div>
    <div class="tool-group preview-sun-env">
      <button
        type="button"
        class="tool-btn"
        :class="{ active: store.previewSunEnabled && store.canTogglePreviewSun }"
        :disabled="!store.canTogglePreviewSun"
        :title="sunTitle()"
        @click="store.setPreviewSunEnabled(!(store.previewSunEnabled && store.canTogglePreviewSun))"
      >
        <Icon name="preview-sun" />
      </button>
      <button
        type="button"
        class="tool-btn"
        :class="{ active: store.previewEnvEnabled && store.canTogglePreviewEnv }"
        :disabled="!store.canTogglePreviewEnv"
        :title="envTitle()"
        @click="store.setPreviewEnvEnabled(!(store.previewEnvEnabled && store.canTogglePreviewEnv))"
      >
        <Icon name="preview-env" />
      </button>
      <button
        type="button"
        class="tool-btn preview-menu-btn"
        :class="{ active: store.previewMenuOpen }"
        title="Edit preview sun and environment settings"
        @click="openPreviewMenu"
      >
        <Icon name="more" />
      </button>
      <PreviewSunEnvMenu v-if="store.previewMenuOpen" />
    </div>
  </div>
</template>
