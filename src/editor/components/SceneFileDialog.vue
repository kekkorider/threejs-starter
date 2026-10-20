<script setup lang="ts">
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()

function onBackdrop(event: PointerEvent): void {
  if (event.target === event.currentTarget) store.cancelSceneDialog()
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    store.cancelSceneDialog()
    return
  }
  if (event.key === 'Enter' && store.sceneDialog === 'save-as') {
    event.preventDefault()
    store.confirmSaveAs()
  }
}
</script>

<template>
  <div v-if="store.sceneDialog" class="modal-back" @pointerdown="onBackdrop">
    <div v-if="store.sceneDialog === 'save-as'" class="dialog warning" role="dialog" aria-labelledby="save-as-title" @keydown="onKey">
      <div class="dialog-title">
        <span id="save-as-title">Save Scene As</span>
      </div>
      <div class="warning-body">
        <p>The path is the File system entry for this scene. Folders are part of the path, as in <span class="path">res://props/Crate.tscn</span>.</p>
        <input v-model="store.sceneDialogPath" class="path-input" type="text" spellcheck="false" autofocus />
        <p v-if="store.sceneSaveAsReplaces" class="hint">A scene at that path will be replaced.</p>
        <p v-if="store.sceneDialogError" class="hint error">{{ store.sceneDialogError }}</p>
      </div>
      <div class="dialog-actions">
        <span class="spacer" />
        <button type="button" class="btn" @click="store.cancelSceneDialog()">Cancel</button>
        <button type="button" class="btn primary" @click="store.confirmSaveAs()">Save</button>
      </div>
    </div>
    <div v-else class="dialog warning" role="dialog" aria-labelledby="unsaved-title">
      <div class="dialog-title">
        <span id="unsaved-title">Save changes?</span>
      </div>
      <div class="warning-body">
        <p>{{ store.scenePath }} has unsaved changes. Save them before opening the other scene?</p>
      </div>
      <div class="dialog-actions">
        <span class="spacer" />
        <button type="button" class="btn" @click="store.cancelSceneDialog()">Cancel</button>
        <button type="button" class="btn" @click="store.discardAndOpen()">Discard</button>
        <button type="button" class="btn primary" @click="store.confirmSaveAndOpen()">Save</button>
      </div>
    </div>
  </div>
</template>
