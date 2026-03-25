// src/composables/useNodeDrag.js
// ★ Новый composable — перемещение узлов по канвасу
import { ref, computed } from 'vue'

export function useNodeDrag(mindmap, zoom) {
  const draggingNodeId = ref(null)
  const dragStartMouse = ref({ x: 0, y: 0 })
  const dragStartPos = ref({ x: 0, y: 0 })
  const currentOffset = ref({ x: 0, y: 0 })

  const isDraggingNode = computed(() => draggingNodeId.value !== null)

  function startNodeDrag(e, nodeId, nodeX, nodeY) {
    // Только левая кнопка мыши
    if (e.button !== 0) return

    e.stopPropagation()
    e.preventDefault()

    draggingNodeId.value = nodeId
    dragStartMouse.value = { x: e.clientX, y: e.clientY }
    dragStartPos.value = { x: nodeX, y: nodeY }
    currentOffset.value = { x: 0, y: 0 }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function onMouseMove(e) {
    if (!draggingNodeId.value) return

    // Делим на zoom чтобы движение было 1:1 с курсором
    const dx = (e.clientX - dragStartMouse.value.x) / zoom.value
    const dy = (e.clientY - dragStartMouse.value.y) / zoom.value

    currentOffset.value = { x: dx, y: dy }
  }

  function onMouseUp() {
    if (!draggingNodeId.value) return

    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)

    const finalX = dragStartPos.value.x + currentOffset.value.x
    const finalY = dragStartPos.value.y + currentOffset.value.y

    // Применяем только если было реальное перемещение (>5px)
    const moved = Math.abs(currentOffset.value.x) > 5
      || Math.abs(currentOffset.value.y) > 5

    if (moved) {
      mindmap.updateNodePosition(draggingNodeId.value, finalX, finalY)
    }

    draggingNodeId.value = null
    currentOffset.value = { x: 0, y: 0 }
  }

  // Позиция узла во время drag (для preview)
  function getDraggedPosition(nodeId, baseX, baseY) {
    if (draggingNodeId.value === nodeId) {
      return {
        x: dragStartPos.value.x + currentOffset.value.x,
        y: dragStartPos.value.y + currentOffset.value.y
      }
    }
    return { x: baseX, y: baseY }
  }

  function cancelDrag() {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    draggingNodeId.value = null
    currentOffset.value = { x: 0, y: 0 }
  }

  return {
    draggingNodeId,
    isDraggingNode,
    currentOffset,
    startNodeDrag,
    getDraggedPosition,
    cancelDrag
  }
}