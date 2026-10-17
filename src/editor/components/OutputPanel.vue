<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useEditorStore } from '../stores/editor'

const store = useEditorStore()
const output = ref<HTMLDivElement | null>(null)

watch(() => store.logs.length, async () => {
  await nextTick()
  const el = output.value
  if (el) el.scrollTop = el.scrollHeight
})
</script>

<template>
  <div ref="output" class="output">
    <div v-if="store.logs.length === 0" class="log-line">
      <span class="time" />
      <span>Output will list created nodes and shader errors.</span>
    </div>
    <div v-for="(line, index) in store.logs" :key="index" class="log-line" :class="line.level">
      <span class="time">{{ line.time }}</span>
      <span>{{ line.message }}</span>
    </div>
  </div>
</template>
