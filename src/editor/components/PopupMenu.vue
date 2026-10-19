<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useEditorStore, type MenuItem } from '../stores/editor'

const props = defineProps<{
  x: number
  y: number
  alignStart: boolean
  items: MenuItem[]
}>()

const store = useEditorStore()
const root = ref<HTMLDivElement | null>(null)

onMounted(() => {
  const menu = root.value
  if (!menu) return
  const width = menu.offsetWidth
  const left = props.alignStart ? props.x : Math.min(props.x, window.innerWidth - width - 8)
  menu.style.left = `${Math.max(8, left)}px`
  menu.style.top = `${props.y + 4}px`
})

function choose(item: MenuItem, event: MouseEvent): void {
  event.stopPropagation()
  if (item.disabled || item.separator) return
  store.closePopups()
  item.action()
}
</script>

<template>
  <div ref="root" class="menu-pop" :style="{ left: `${x}px`, top: `${y + 4}px` }">
    <template v-for="(item, index) in items" :key="index">
      <div v-if="item.separator" class="menu-sep" />
      <button
        v-else
        type="button"
        class="menu-item"
        :class="{ disabled: item.disabled }"
        @click="choose(item, $event)"
      >
        <span>{{ item.label }}</span>
        <span v-if="item.shortcut" class="shortcut">{{ item.shortcut }}</span>
      </button>
    </template>
  </div>
</template>
