// src/composables/drag/useNodeDrag.js
import { ref, computed } from 'vue'
import { findNodeById, collectVisibleDescendantIds } from '../tree/useTreeTraversal'

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
  const dragGroupIds = ref(new Set())

  const isDraggingNode = computed(() => draggingNodeId.value !== null)

  const dragDeltaX = computed(() => {
    if (!draggingNodeId.value) return 0
    return (dragCurrentX.value - dragStartX.value) / zoom.value
  })

  const dragDeltaY = computed(() => {
    if (!draggingNodeId.value) return 0
    return (dragCurrentY.value - dragStartY.value) / zoom.value
  })

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

    const root = mindmap?.rootNode?.value
    if (root) {
      const node = findNodeById(root, nodeId)
      dragGroupIds.value = node
        ? collectVisibleDescendantIds(node)
        : new Set([nodeId])
    }

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
      dragGroupIds.value = new Set()
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
      // ★ moveNodeGroup вызывается через mindmap —
      //   обёртка в MindMapCanvas подставит layoutPositions
      const dx = dragDeltaX.value
      const dy = dragDeltaY.value
      mindmap.moveNodeGroup(draggingNodeId.value, dx, dy)
    }
  }

  function isInDragGroup(nodeId) {
    return dragGroupIds.value.has(nodeId)
  }

  function getLivePosition(nodeId, originalX, originalY) {
    if (!isInDragGroup(nodeId)) return null

    return {
      x: originalX + dragDeltaX.value,
      y: originalY + dragDeltaY.value
    }
  }

  function setDropTarget(nodeId) {
    if (dragGroupIds.value.has(nodeId)) return
    dropTargetId.value = nodeId
  }

  function clearDropTarget() {
    dropTargetId.value = null
  }

  return {
    draggingNodeId,
    isDraggingNode,
    dropTargetId,
    dragGroupIds,
    dragDeltaX,
    dragDeltaY,
    startNodeDrag,
    getLivePosition,
    isInDragGroup,
    setDropTarget,
    clearDropTarget
  }
}