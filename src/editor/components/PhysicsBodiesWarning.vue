<script setup lang="ts">
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()

function onBackdrop(event: PointerEvent): void {
  if (event.target !== event.currentTarget) return
  if (store.physicsWarning?.mode === 'info') store.dismissPhysicsWarning()
}
</script>

<template>
  <div v-if="store.physicsWarning" class="modal-back warning-back" @pointerdown="onBackdrop">
    <div class="dialog warning" role="alertdialog" aria-labelledby="physics-warning-title">
      <div class="dialog-title">
        <span id="physics-warning-title">
          {{ store.physicsWarning.mode === 'disable' ? 'Disable physics?' : 'Physics is off' }}
        </span>
      </div>
      <div class="warning-body">
        <p v-if="store.physicsWarning.mode === 'disable'">
          These objects have a physics body. Disabling physics reloads the page and does not import the physics module. They stay in the scene and do not simulate.
        </p>
        <p v-else>
          Physics is off, so these objects do not simulate. The physics module was not imported.
        </p>
        <ul>
          <li v-for="use in store.physicsWarning.uses" :key="use.id">{{ use.name }} · {{ use.path }}</li>
        </ul>
      </div>
      <div class="dialog-actions">
        <span class="spacer" />
        <template v-if="store.physicsWarning.mode === 'disable'">
          <button type="button" class="btn" @click="store.dismissPhysicsWarning">Cancel</button>
          <button type="button" class="btn primary" @click="store.confirmPhysicsWarning">Disable</button>
        </template>
        <button v-else type="button" class="btn primary" @click="store.dismissPhysicsWarning">OK</button>
      </div>
    </div>
  </div>
</template>
