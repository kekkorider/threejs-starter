<script setup lang="ts">
import { onMounted, ref } from 'vue'
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

onMounted(() => {
  const menu = root.value
  if (!menu) return
  const width = menu.offsetWidth
  const height = menu.offsetHeight
  const left = props.alignStart ? props.x : Math.min(props.x, window.innerWidth - width - 8)
  const top = Math.min(props.y + 4, window.innerHeight - height - 8)
  menu.style.left = `${Math.max(8, left)}px`
  menu.style.top = `${Math.max(8, top)}px`
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
