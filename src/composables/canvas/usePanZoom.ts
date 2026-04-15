// src/composables/canvas/usePanZoom.js
import { ref, computed } from 'vue'

export function usePanZoom() {
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)
  const isPanning = ref(false)
  const isAnimating = ref(false)

  const lastMouse = { x: 0, y: 0 }
  const lastPan = { x: 0, y: 0 }

  // ★ Трекинг фокуса
  const focusedNodeId = ref(null)
  const FOCUS_ZOOM = 1.25
  const DEFAULT_ZOOM = 1

  const zoomPercent = computed(() => Math.round(zoom.value * 100))

  function onWheel(e) {
    focusedNodeId.value = null
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    zoom.value = clamp(zoom.value + delta, 0.2, 3)
  }

  function zoomIn() {
    focusedNodeId.value = null
    zoom.value = clamp(zoom.value + 0.15, 0.2, 3)
  }

  function zoomOut() {
    focusedNodeId.value = null
    zoom.value = clamp(zoom.value - 0.15, 0.2, 3)
  }

  function resetView() {
    focusedNodeId.value = null
    animateTo(0, 0, 1)
  }

  function startPan(e) {
    focusedNodeId.value = null
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

  function screenToScene(clientX, clientY, wrapperRect, bounds) {
    const z = zoom.value
    return {
      x: (clientX - wrapperRect.left - panX.value) / z + bounds.minX,
      y: (clientY - wrapperRect.top - panY.value) / z + bounds.minY
    }
  }

  // ── Плавная анимация ──
  function animateTo(targetPanX, targetPanY, targetZoom) {
    isAnimating.value = true
    panX.value = targetPanX
    panY.value = targetPanY
    zoom.value = clamp(targetZoom, 0.2, 3)

    setTimeout(() => {
      isAnimating.value = false
    }, 500)
  }

  // ── Вычисление pan для центрирования точки ──
  function calcCenterPan(sceneX, sceneY, wrapperEl, targetZoom) {
    const rect = wrapperEl.getBoundingClientRect()
    const z = clamp(targetZoom, 0.2, 3)

    return {
      panX: rect.width / 2 - sceneX * z,
      panY: rect.height / 2 - sceneY * z
    }
  }

  // ── ★ Центр ноды в scene-координатах ──
  function nodeCenterScene(pos, bounds) {
    return {
      x: pos.x - bounds.minX + pos.w / 2,
      y: pos.y - bounds.minY + pos.h / 2
    }
  }

  /**
   * ★ Toggle focus с "умным" zoom out:
   *   - Zoom in (125%):  центрируем на ноде
   *   - Zoom out (100%): центрируем на середине между root и нодой
   *
   * @param {Object} pos        — позиция целевой ноды
   * @param {Object} rootPos    — позиция корневой ноды
   * @param {Object} bounds     — bounds из layout
   * @param {HTMLElement} wrapperEl
   */
  function focusOnNode(pos, rootPos, bounds, wrapperEl) {
    if (!wrapperEl || !rootPos) return

    const isSameNode = focusedNodeId.value === pos.id
    const isZoomedIn = isSameNode && Math.abs(zoom.value - FOCUS_ZOOM) < 0.01

    const nodeCenter = nodeCenterScene(pos, bounds)
    const rootCenter = nodeCenterScene(rootPos, bounds)

    let targetZoom
    let targetSceneX
    let targetSceneY

    if (isZoomedIn) {
      // ★ Zoom out → центр между root и нодой
      targetZoom = DEFAULT_ZOOM
      targetSceneX = (rootCenter.x + nodeCenter.x) / 2
      targetSceneY = (rootCenter.y + nodeCenter.y) / 2
      focusedNodeId.value = null
    } else {
      // ★ Zoom in → точно на ноду
      targetZoom = FOCUS_ZOOM
      targetSceneX = nodeCenter.x
      targetSceneY = nodeCenter.y
      focusedNodeId.value = pos.id
    }

    const target = calcCenterPan(targetSceneX, targetSceneY, wrapperEl, targetZoom)
    animateTo(target.panX, target.panY, targetZoom)
  }

  return {
    zoom, panX, panY, isPanning, isAnimating, zoomPercent,
    focusedNodeId,
    onWheel, zoomIn, zoomOut, resetView,
    startPan, movePan, endPan,
    screenToScene,
    focusOnNode
  }
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}