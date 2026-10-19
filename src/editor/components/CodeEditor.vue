<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { highlightTypeScript } from '../highlight'
import { highlightTSL } from '../tsl'

const model = defineModel<string>({ required: true })
const props = defineProps<{ disabled?: boolean, language?: 'tsl' | 'typescript' }>()
const emit = defineEmits<{ change: [value: string] }>()

const textarea = ref<HTMLTextAreaElement | null>(null)
const highlight = ref<HTMLElement | null>(null)
const gutter = ref<HTMLElement | null>(null)

const html = computed(() => {
  const value = model.value
  const source = value.endsWith('\n') || value.length === 0 ? `${value} ` : value
  return props.language === 'typescript' ? highlightTypeScript(source) : highlightTSL(source)
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

function replaceSelection(insert: string, cursor: number): void {
  const area = textarea.value
  if (!area) return
  const start = area.selectionStart
  const end = area.selectionEnd
  const next = `${area.value.slice(0, start)}${insert}${area.value.slice(end)}`
  model.value = next
  emit('change', next)
  void nextTick(() => {
    area.selectionStart = area.selectionEnd = cursor
  })
}

function onKeydown(event: KeyboardEvent): void {
  const area = textarea.value
  if (!area || props.disabled) return
  if (event.key === 'Tab') {
    event.preventDefault()
    replaceSelection('  ', area.selectionStart + 2)
    return
  }
  if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.altKey) return
  event.preventDefault()
  const start = area.selectionStart
  const lineStart = area.value.lastIndexOf('\n', start - 1) + 1
  const indent = /^[ \t]*/.exec(area.value.slice(lineStart, start))?.[0] ?? ''
  const insert = `\n${indent}`
  replaceSelection(insert, start + insert.length)
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
        :aria-label="language === 'typescript' ? 'TypeScript source' : 'TSL material source'"
        :value="model"
        :disabled="disabled"
        @input="onInput"
        @scroll="onScroll"
        @keydown="onKeydown"
      />
    </div>
  </div>
</template>
