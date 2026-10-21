<script setup lang="ts">
import { ref } from 'vue'
import { starter } from '../../webgl'
import { useMountedScene } from '../scene/useMountedScene'
import { useEditorStore } from '../stores/editor'
import ViewportToolbar from './ViewportToolbar.vue'

const store = useEditorStore()
const host = ref<HTMLDivElement | null>(null)

useMountedScene(
  host,
  () => store.attach(starter),
  (error) => store.failBoot(error),
  () => store.hideChrome(),
)
</script>

<template>
  <div class="viewport-wrap">
    <div ref="host" class="viewport" />
    <ViewportToolbar />
    <div
      v-if="store.marquee"
      class="selection-marquee"
      :style="{
        left: `${store.marquee.x}px`,
        top: `${store.marquee.y}px`,
        width: `${store.marquee.width}px`,
        height: `${store.marquee.height}px`,
      }"
    />
    <div v-if="store.shading === 'debug'" class="debug-legend">
      <span>Color</span>
      <span>Depth</span>
      <span>Normals</span>
      <span>Velocity</span>
    </div>
    <div class="vp-meta">
      <template v-if="store.metaName">
        <strong>{{ store.metaName }}</strong><span v-if="store.selectedIds.length > 1"> · {{ store.selectedIds.length }} selected</span><span v-else-if="store.metaTris"> · {{ store.metaTris }} tris</span>
      </template>
    </div>
    <div v-if="store.bootError" class="boot-error">The 3D viewport failed to start. {{ store.bootError }}</div>
  </div>
</template>
