<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { useEditorStore, type MenuItem } from '../stores/editor'
import Icon from './Icon.vue'

const props = defineProps<{
  x: number
  y: number
  alignStart: boolean
  items: MenuItem[]
}>()

const store = useEditorStore()
const root = ref<HTMLDivElement | null>(null)
const left = ref(props.x)
const top = ref(props.y + 4)

onMounted(() => {
  void nextTick(() => {
    const menu = root.value
    if (!menu) return
    const width = menu.offsetWidth
    const height = menu.offsetHeight
    const margin = 8
    const maxLeft = window.innerWidth - width - margin
    const aligned = props.alignStart ? props.x : Math.min(props.x, maxLeft)
    left.value = Math.max(margin, aligned)
    const below = props.y + 4
    const above = props.y - height - 4
    if (below + height <= window.innerHeight - margin) top.value = below
    else if (above >= margin) top.value = above
    else top.value = Math.max(margin, window.innerHeight - height - margin)
  })
})

function choose(item: MenuItem, event: MouseEvent): void {
  event.stopPropagation()
  if (item.disabled || item.separator) return
  store.closePopups()
  item.action()
}
</script>

<template>
  <div ref="root" class="menu-pop" :style="{ left: `${left}px`, top: `${top}px` }">
    <template v-for="(item, index) in items" :key="index">
      <div v-if="item.separator" class="menu-sep" />
      <button
        v-else
        type="button"
        class="menu-item"
        :class="{ disabled: item.disabled }"
        :title="item.title"
        @click="choose(item, $event)"
      >
        <span class="menu-label">
          <span v-if="item.icon" class="kind-icon" :class="item.iconClass">
            <Icon :name="item.icon" />
          </span>
          <span>{{ item.label }}</span>
        </span>
        <span v-if="item.shortcut" class="shortcut">{{ item.shortcut }}</span>
      </button>
    </template>
  </div>
</template>
