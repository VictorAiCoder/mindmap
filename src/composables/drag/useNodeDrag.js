// src/composables/drag/useNodeDrag.js
import { ref, computed } from 'vue'

const MOVE_THRESHOLD = 4

export function useNodeDrag(mindmap, zoom) {
  const draggingNodeId = ref(null)
  const dragStartX = ref(0)
  const dragStartY = ref(0)
  const dragCurrentX = ref(0)
  const dragCurrentY = ref(0)
  const dragStartNodeX = ref(0)
  const dragStartNodeY = ref(0)
  const hasMoved = ref(false)
  const dropTargetId = ref(null)

  const isDraggingNode = computed(() => draggingNodeId.value !== null)

  function startNodeDrag(e, nodeId, nodeX, nodeY) {
    draggingNodeId.value = nodeId
    dragStartX.value = e.clientX
    dragStartY.value = e.clientY
    dragCurrentX.value = e.clientX
    dragCurrentY.value = e.clientY
    dragStartNodeX.value = nodeX
    dragStartNodeY.value = nodeY
    hasMoved.value = false
    dropTargetId.value = null

    const onMove = (me) => {
      dragCurrentX.value = me.clientX
      dragCurrentY.value = me.clientY

      const dx = Math.abs(me.clientX - dragStartX.value)
      const dy = Math.abs(me.clientY - dragStartY.value)
      if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
        hasMoved.value = true
      }
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)

      if (hasMoved.value) finishDrag()

      draggingNodeId.value = null
      dropTargetId.value = null
      hasMoved.value = false
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function finishDrag() {
    if (!mindmap || !draggingNodeId.value) return

    const target = dropTargetId.value

    if (target && target !== draggingNodeId.value) {
      mindmap.reparentNode(draggingNodeId.value, target)
    } else {
      const pos = getDraggedPosition(
        draggingNodeId.value,
        dragStartNodeX.value,
        dragStartNodeY.value
      )
      mindmap.updateNodePosition(draggingNodeId.value, pos.x, pos.y)
    }
  }

  function getDraggedPosition(nodeId, originalX, originalY) {
    if (nodeId !== draggingNodeId.value) {
      return { x: originalX, y: originalY }
    }

    const z = zoom.value
    return {
      x: dragStartNodeX.value + (dragCurrentX.value - dragStartX.value) / z,
      y: dragStartNodeY.value + (dragCurrentY.value - dragStartY.value) / z
    }
  }

  function setDropTarget(nodeId) {
    if (nodeId !== draggingNodeId.value) {
      dropTargetId.value = nodeId
    }
  }

  function clearDropTarget() {
    dropTargetId.value = null
  }

  return {
    draggingNodeId, isDraggingNode, dropTargetId,
    startNodeDrag, getDraggedPosition,
    setDropTarget, clearDropTarget
  }
}