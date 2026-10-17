<script setup lang="ts">
import Icon from './Icon.vue'
import { useEditorStore, type ScreenName } from '../stores/editor'

const store = useEditorStore()

const screens: { id: ScreenName, icon: string, label: string }[] = [
  { id: '2d', icon: 'screen-2d', label: '2D' },
  { id: '3d', icon: 'screen-3d', label: '3D' },
  { id: 'script', icon: 'script', label: 'Script' },
  { id: 'game', icon: 'game', label: 'Game' },
  { id: 'asset', icon: 'asset', label: 'AssetLib' },
]

function openMenu(name: string, event: MouseEvent): void {
  store.openMenu(name, event.currentTarget as HTMLElement)
}
</script>

<template>
  <header class="topbar">
    <nav class="menus">
      <button
        v-for="name in store.menus"
        :key="name"
        type="button"
        class="menu-btn"
        :class="{ open: store.openMenuName === name }"
        @click="openMenu(name, $event)"
      >
        {{ name }}
      </button>
    </nav>
    <div class="screens">
      <button
        v-for="item in screens"
        :key="item.id"
        type="button"
        class="screen-btn"
        :class="{ active: store.screen === item.id }"
        @click="store.setScreen(item.id)"
      >
        <Icon :name="item.icon" />
        <span>{{ item.label }}</span>
      </button>
    </div>
    <div class="playback">
      <button type="button" class="icon-btn play" :class="{ active: store.playing }" title="Play (F5)" @click="store.setPlaying(true)">
        <Icon name="play" />
      </button>
      <button type="button" class="icon-btn pause" :class="{ active: store.paused }" title="Pause" @click="store.togglePause()">
        <Icon name="pause" />
      </button>
      <button type="button" class="icon-btn stop" title="Stop (F8)" @click="store.setPlaying(false)">
        <Icon name="stop" />
      </button>
    </div>
  </header>
</template>
