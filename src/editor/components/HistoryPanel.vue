<script setup lang="ts">
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
</script>

<template>
  <div class="history">
    <div v-if="store.historyEntries.length === 0" class="empty-note">
      Inspector edits, transforms, and scene changes show up here.
    </div>
    <template v-else>
      <button
        type="button"
        class="history-row"
        :class="{ current: store.historyCursor === 0 }"
        :disabled="store.playing"
        @click="store.goToHistory(0)"
      >
        Scene
      </button>
      <button
        v-for="(entry, index) in store.historyEntries"
        :key="`${index}-${entry.label}`"
        type="button"
        class="history-row"
        :class="{ applied: entry.applied, future: !entry.applied, current: store.historyCursor === index + 1 }"
        :disabled="store.playing"
        @click="store.goToHistory(index + 1)"
      >
        {{ entry.label }}
      </button>
    </template>
  </div>
</template>
