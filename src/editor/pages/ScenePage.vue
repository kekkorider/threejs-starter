<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useMountedScene } from '../scene/useMountedScene'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
const host = ref<HTMLDivElement | null>(null)
const error = ref('')

useMountedScene(
  host,
  () => {},
  (failure) => {
    const message = failure instanceof Error ? failure.message : String(failure)
    error.value = message
    store.failBoot(failure)
  },
)
</script>

<template>
  <div class="scene-page">
    <div ref="host" class="scene-host" />
    <RouterLink class="scene-editor-link" to="/editor">Editor</RouterLink>
    <p v-if="error" class="scene-boot-error">The 3D viewport failed to start. {{ error }}</p>
  </div>
</template>

<style>
.scene-page {
  position: relative;
  height: 100%;
  background: #3a3a3a;
}

.scene-host {
  position: absolute;
  inset: 0;
}

.scene-host canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.scene-editor-link {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  color: #f4f8ff;
  background: rgba(28, 28, 28, 0.92);
  border: 1px solid #151515;
  border-radius: 5px;
  padding: 6px 10px;
  font: 13px/1 "Segoe UI", "Noto Sans", Ubuntu, sans-serif;
  text-decoration: none;
}

.scene-editor-link:hover {
  background: #484848;
}

.scene-boot-error {
  position: absolute;
  top: 48px;
  left: 24px;
  right: 24px;
  z-index: 2;
  margin: 0;
  background: #3a2424;
  border: 1px solid #7a3a3a;
  color: #ffd7d7;
  padding: 12px 14px;
  border-radius: 6px;
}
</style>
