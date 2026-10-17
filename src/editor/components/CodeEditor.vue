<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { highlightTSL } from '../tsl'

const model = defineModel<string>({ required: true })
defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ change: [value: string] }>()

const textarea = ref<HTMLTextAreaElement | null>(null)
const highlight = ref<HTMLElement | null>(null)
const gutter = ref<HTMLElement | null>(null)

const html = computed(() => {
  const value = model.value
  return highlightTSL(value.endsWith('\n') || value.length === 0 ? `${value} ` : value)
})

const lineNumbers = computed(() => {
  const count = Math.max(model.value.split('\n').length, 1)
  return Array.from({ length: count }, (_, index) => String(index + 1)).join('\n')
})

function onInput(event: Event): void {
  const value = (event.target as HTMLTextAreaElement).value
  model.value = value
  emit('change', value)
}

function onScroll(): void {
  const area = textarea.value
  if (!area || !highlight.value || !gutter.value) return
  highlight.value.scrollTop = area.scrollTop
  highlight.value.scrollLeft = area.scrollLeft
  gutter.value.scrollTop = area.scrollTop
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Tab' || !textarea.value) return
  event.preventDefault()
  const area = textarea.value
  const start = area.selectionStart
  const end = area.selectionEnd
  const next = `${area.value.slice(0, start)}  ${area.value.slice(end)}`
  model.value = next
  emit('change', next)
  void nextTick(() => {
    area.selectionStart = area.selectionEnd = start + 2
  })
}
</script>

<template>
  <div class="code-editor" :class="{ 'is-disabled': disabled }">
    <div ref="gutter" class="code-gutter" aria-hidden="true">{{ lineNumbers }}</div>
    <div class="code-stage">
      <pre ref="highlight" class="code-highlight" v-html="html" />
      <textarea
        ref="textarea"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        wrap="off"
        aria-label="TSL material source"
        :value="model"
        :disabled="disabled"
        @input="onInput"
        @scroll="onScroll"
        @keydown="onKeydown"
      />
    </div>
  </div>
</template>
