<script setup lang="ts">
import { computed } from 'vue'
import { icon } from '../icons'

const props = defineProps<{ name: string }>()
const markup = computed(() => icon(props.name))
</script>

<template>
  <span class="ico-wrap" v-html="markup" />
</template>

<style>
.ico-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}
.ico-wrap .ico {
  display: block;
}
</style>
