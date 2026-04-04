// src/composables/canvas/usePanZoom.js
import { ref, computed } from 'vue'

export function usePanZoom() {
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)
  const isPanning = ref(false)

  const lastMouse = { x: 0, y: 0 }
  const lastPan = { x: 0, y: 0 }

  const zoomPercent = computed(() => Math.round(zoom.value * 100))

  function onWheel(e) {
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    zoom.value = clamp(zoom.value + delta, 0.2, 3)
  }

  function zoomIn() { zoom.value = clamp(zoom.value + 0.15, 0.2, 3) }
  function zoomOut() { zoom.value = clamp(zoom.value - 0.15, 0.2, 3) }

  function resetView() {
    zoom.value = 1
    panX.value = 0
    panY.value = 0
  }

  function startPan(e) {
    isPanning.value = true
    lastMouse.x = e.clientX
    lastMouse.y = e.clientY
    lastPan.x = panX.value
    lastPan.y = panY.value
  }

  function movePan(e) {
    if (!isPanning.value) return
    panX.value = lastPan.x + (e.clientX - lastMouse.x)
    panY.value = lastPan.y + (e.clientY - lastMouse.y)
  }

  function endPan() {
    isPanning.value = false
  }

  /**
   * Преобразует координаты экрана в координаты сцены
   */
  function screenToScene(clientX, clientY, wrapperRect, bounds) {
    const z = zoom.value
    return {
      x: (clientX - wrapperRect.left - panX.value) / z + bounds.minX,
      y: (clientY - wrapperRect.top - panY.value) / z + bounds.minY
    }
  }

  return {
    zoom, panX, panY, isPanning, zoomPercent,
    onWheel, zoomIn, zoomOut, resetView,
    startPan, movePan, endPan,
    screenToScene
  }
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}