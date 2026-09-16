<template>
  <svg
    class="icon-focus"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="11" cy="11" r="7" />
    <g v-if="!focused">
      <line x1="8" y1="11" x2="14" y2="11" />
      <line x1="11" y1="8" x2="11" y2="14" />
    </g>
    <g v-else>
      <line x1="8" y1="11" x2="14" y2="11" />
    </g>
    <line x1="16.5" y1="16.5" x2="21" y2="21" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{ focused: boolean }>()
</script>

<style scoped>
.icon-focus {
  width: 1.714em;
  height: 1.714em;
}
</style>
