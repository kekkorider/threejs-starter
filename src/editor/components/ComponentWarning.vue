<script setup lang="ts">
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()

function onBackdrop(event: PointerEvent): void {
  if (event.target === event.currentTarget) store.cancelDeleteComponent()
}
</script>

<template>
  <div v-if="store.componentWarning" class="modal-back warning-back" @pointerdown="onBackdrop">
    <div class="dialog warning" role="alertdialog" aria-labelledby="component-warning-title">
      <div class="dialog-title">
        <span id="component-warning-title">Delete {{ store.componentWarning.name }}?</span>
      </div>
      <div class="warning-body">
        <p>{{ store.componentWarning.name }} is used by these components. Deleting it removes them from their objects.</p>
        <ul>
          <li v-for="use in store.componentWarning.uses" :key="use.id">{{ use.objectName }} · {{ use.componentName }}</li>
        </ul>
      </div>
      <div class="dialog-actions">
        <span class="spacer" />
        <button type="button" class="btn" @click="store.cancelDeleteComponent">Cancel</button>
        <button type="button" class="btn primary" @click="store.confirmDeleteComponent">Delete</button>
      </div>
    </div>
  </div>
</template>
