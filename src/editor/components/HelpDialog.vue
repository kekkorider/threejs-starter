<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { useEditorStore } from '../stores/editor'
import { TSL_HELP } from '../tsl'

const store = useEditorStore()

const shortcuts = `Ctrl+Z        Undo
Ctrl+Shift+Z  Redo
Ctrl+Y        Redo
Ctrl+A   Create node
Ctrl+C   Create component
Ctrl+D   Duplicate
Ctrl+S        Apply TSL
Ctrl+Shift+S  Save scene
Ctrl+Alt+S    Save scene as
Ctrl+Shift+L  Load scene
Ctrl+Shift+A  Instance scene
F2       Rename
Del      Delete
F        Focus selection
Shift+click  Add to the selection
Ctrl+click   Toggle a node in the selection
Box drag     Select mode: drag a rectangle. Shift adds, Ctrl removes
Right-drag   Orbit while Select or List is active
Alt+right-click  List nodes under the cursor
Q W E R  Select, move, rotate, scale
Y        Toggle snap
F5       Play
F8       Stop
Esc      Stop play, or close a dialog

Drag a scene-tree row onto another node to reparent it.
Drag a saved scene from the File system onto a node to instance it.
Drag a component onto an object to add it. Double-click a component to edit it in the Script tab.
Drag the colored x / y / z labels to scrub a value.`

const title = computed(() => store.helpTopic === 'tsl' ? 'TSL Material Reference' : 'Editor Shortcuts')
const body = computed(() => store.helpTopic === 'tsl' ? TSL_HELP : shortcuts)

function onBackdrop(event: PointerEvent): void {
  if (event.target === event.currentTarget) store.closeHelp()
}
</script>

<template>
  <div class="modal-back" @pointerdown="onBackdrop">
    <div class="dialog help">
      <div class="dialog-title">
        <span>{{ title }}</span>
        <span class="spacer" />
        <button type="button" class="icon-btn" @click="store.closeHelp()">
          <Icon name="close" />
        </button>
      </div>
      <pre class="help-body">{{ body }}</pre>
    </div>
  </div>
</template>
