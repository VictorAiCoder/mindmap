<!-- src/components/node/NodeImage.vue -->
<template>
  <div class="node-image-float">
    <img
      :src="src"
      class="node-image"
      alt=""
      draggable="false"
      referrerpolicy="no-referrer"
      @error="onError"
    />
    <button class="node-image-remove" @click.stop="$emit('remove')" @mousedown.stop>
      <v-icon icon="mdi-close" size="12" />
    </button>
  </div>
</template>

<script setup>
defineProps({
  src: { type: String, required: true },
  isRoot: { type: Boolean, default: false }
})

defineEmits(['remove'])

function onError(e) {
  e.target.style.display = 'none'
}
</script>

<style scoped>
.node-image-float {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 6px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  background: rgb(var(--v-theme-surface));
  z-index: 3;
  transition: transform 0.2s ease;
}

.node-image {
  display: block;
  max-width: 160px;
  max-height: 120px;
  width: auto;
  height: auto;
  object-fit: cover;
}

.node-image-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.node-image-float:hover .node-image-remove { opacity: 1; }
.node-image-remove:hover { background: rgba(244, 67, 54, 0.9); }
</style>