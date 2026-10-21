<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive } from 'vue'
import AssetLibrary from '../components/AssetLibrary.vue'
import BottomPanel from '../components/BottomPanel.vue'
import ComponentWarning from '../components/ComponentWarning.vue'
import CreateComponentDialog from '../components/CreateComponentDialog.vue'
import CreateNodeDialog from '../components/CreateNodeDialog.vue'
import FileDock from '../components/FileDock.vue'
import HelpDialog from '../components/HelpDialog.vue'
import Icon from '../components/Icon.vue'
import InspectorDock from '../components/InspectorDock.vue'
import PopupMenu from '../components/PopupMenu.vue'
import SceneDock from '../components/SceneDock.vue'
import SceneFileDialog from '../components/SceneFileDialog.vue'
import ScriptDock from '../components/ScriptDock.vue'
import ScriptScreen from '../components/ScriptScreen.vue'
import TopBar from '../components/TopBar.vue'
import Viewport from '../components/Viewport.vue'
import { useEditorStore } from '../stores/editor'
import '../editor.css'

const store = useEditorStore()
const metrics = reactive({ left: 272, right: 318, bottom: 236, files: 200, script: 280 })

function styleVars(): Record<string, string> {
  return {
    '--left': `${metrics.left}px`,
    '--right': `${metrics.right}px`,
    '--bottom': `${metrics.bottom}px`,
    '--files': `${metrics.files}px`,
    '--script': `${metrics.script}px`,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function onSplit(event: PointerEvent, axis: 'x' | 'y', apply: (delta: number) => void): void {
  if (event.button !== 0) return
  event.preventDefault()
  let last = axis === 'x' ? event.clientX : event.clientY
  const move = (ev: PointerEvent) => {
    const now = axis === 'x' ? ev.clientX : ev.clientY
    apply(now - last)
    last = now
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    document.body.style.cursor = ''
  }
  document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

function onKey(event: KeyboardEvent): void {
  store.onKeyDown(event)
}

function onPointer(event: PointerEvent): void {
  store.onPointerDown(event)
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', onPointer)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('pointerdown', onPointer)
})
</script>

<template>
  <div
    class="editor"
    :class="{ distraction: store.distraction, 'bottom-collapsed': store.bottomCollapsed }"
    :data-screen="store.screen"
    :style="styleVars()"
  >
    <TopBar />
    <div class="workspace">
      <aside class="docks left">
        <SceneDock />
        <div
          class="splitter h"
          @pointerdown="onSplit($event, 'y', (delta) => { metrics.files = clamp(metrics.files - delta, 90, 420) })"
        />
        <FileDock />
      </aside>
      <div
        class="splitter x"
        @pointerdown="onSplit($event, 'x', (delta) => { metrics.left = clamp(metrics.left + delta, 180, 520) })"
      />
      <div class="center">
        <div class="scene-tabs">
          <button type="button" class="scene-tab active" :title="store.scenePath">
            <Icon name="scene" /> {{ store.sceneLabel }}
          </button>
          <span class="spacer" />
          <button type="button" class="icon-btn distraction" title="Distraction Free Mode" @click="store.distraction = !store.distraction">
            <Icon name="expand" />
          </button>
        </div>
        <div class="center-body">
          <div class="stage">
            <Viewport />
            <div class="placeholder script-stage screen-script">
              <ScriptScreen />
            </div>
            <AssetLibrary />
          </div>
          <div
            class="splitter y"
            @pointerdown="onSplit($event, 'y', (delta) => { store.bottomCollapsed = false; metrics.bottom = clamp(metrics.bottom - delta, 120, 520) })"
          />
          <BottomPanel />
        </div>
      </div>
      <div
        class="splitter x"
        @pointerdown="onSplit($event, 'x', (delta) => { metrics.right = clamp(metrics.right - delta, 220, 560) })"
      />
      <aside class="docks right">
        <InspectorDock />
        <div
          class="splitter h"
          @pointerdown="onSplit($event, 'y', (delta) => { metrics.script = clamp(metrics.script - delta, 140, 560) })"
        />
        <ScriptDock />
      </aside>
    </div>
    <PopupMenu
      v-if="store.popup"
      :x="store.popup.x"
      :y="store.popup.y"
      :align-start="store.popup.alignStart"
      :items="store.popup.items"
    />
    <SceneFileDialog />
    <CreateNodeDialog v-if="store.createOpen" :key="store.createNonce" />
    <CreateComponentDialog v-if="store.componentOpen" :key="store.componentNonce" />
    <ComponentWarning />
    <HelpDialog v-if="store.helpTopic" />
  </div>
</template>
