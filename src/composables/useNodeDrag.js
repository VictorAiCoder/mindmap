// src/composables/useNodeDrag.js
import { ref, computed } from 'vue'

/**
 * Управляет перетаскиванием узлов на канвасе:
 * - Перемещение узла (смена координат)
 * - Бросание на другой узел (смена иерархии)
 */
export function useNodeDrag(mindmap, zoom) {
  const draggingNodeId = ref(null)
  const dragOffsetX = ref(0)
  const dragOffsetY = ref(0)
  const dragStartX = ref(0)
  const dragStartY = ref(0)
  const dragCurrentX = ref(0)
  const dragCurrentY = ref(0)
  const dragStartNodeX = ref(0)
  const dragStartNodeY = ref(0)
  const hasMoved = ref(false)

  // ★ Узел, над которым сейчас находится перетаскиваемый
  const dropTargetId = ref(null)

  const isDraggingNode = computed(() => draggingNodeId.value !== null)

  const MOVE_THRESHOLD = 4

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

      if (hasMoved.value) {
        finishDrag()
      }

      draggingNodeId.value = null
      dropTargetId.value = null
      hasMoved.value = false
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function finishDrag() {
    if (!mindmap || !draggingNodeId.value) return

    const targetId = dropTargetId.value

    if (targetId && targetId !== draggingNodeId.value) {
      // ★ Бросаем на другой узел — меняем иерархию
      mindmap.reparentNode(draggingNodeId.value, targetId)
    } else {
      // Бросаем на пустое место — меняем координаты
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
    const dx = (dragCurrentX.value - dragStartX.value) / z
    const dy = (dragCurrentY.value - dragStartY.value) / z

    return {
      x: dragStartNodeX.value + dx,
      y: dragStartNodeY.value + dy
    }
  }

  // ★ Устанавливает целевой узел для drop
  function setDropTarget(nodeId) {
    if (nodeId === draggingNodeId.value) return
    dropTargetId.value = nodeId
  }

  function clearDropTarget() {
    dropTargetId.value = null
  }

  return {
    draggingNodeId,
    isDraggingNode,
    dropTargetId,
    startNodeDrag,
    getDraggedPosition,
    setDropTarget,
    clearDropTarget
  }
}