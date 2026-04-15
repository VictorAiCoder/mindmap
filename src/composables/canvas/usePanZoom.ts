// src/composables/canvas/usePanZoom.js
import { ref, computed } from 'vue'

export function usePanZoom() {
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)
  const isPanning = ref(false)
  const isAnimating = ref(false) // ★ для CSS transition

  const lastMouse = { x: 0, y: 0 }
  const lastPan = { x: 0, y: 0 }

  // ★ Трекинг фокуса
  const focusedNodeId = ref(null)
  const FOCUS_ZOOM = 1.25
  const DEFAULT_ZOOM = 0.8

  const zoomPercent = computed(() => Math.round(zoom.value * 100))

  function onWheel(e) {
    // Сброс фокуса при ручном зуме
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
    // Сброс фокуса при ручном пане
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

  // ── ★ Плавная анимация к целевым значениям ──
  function animateTo(targetPanX, targetPanY, targetZoom) {
    isAnimating.value = true
    // Устанавливаем значения — CSS transition сделает плавность
    panX.value = targetPanX
    panY.value = targetPanY
    zoom.value = clamp(targetZoom, 0.2, 3)

    // Снимаем флаг анимации после завершения transition
    setTimeout(() => {
      isAnimating.value = false
    }, 500)
  }

  // ── ★ Вычисление pan для центрирования ноды ──
  function calcCenterPan(pos, bounds, wrapperEl, targetZoom) {
    const rect = wrapperEl.getBoundingClientRect()
    const viewW = rect.width
    const viewH = rect.height

    const nodeCenterSceneX = pos.x - bounds.minX + pos.w / 2
    const nodeCenterSceneY = pos.y - bounds.minY + pos.h / 2

    const z = clamp(targetZoom, 0.2, 3)

    return {
      panX: viewW / 2 - nodeCenterSceneX * z,
      panY: viewH / 2 - nodeCenterSceneY * z
    }
  }

  // ── ★ Toggle focus: 125% ↔ 100%, всегда центрирует ──
  function focusOnNode(pos, bounds, wrapperEl) {
    if (!wrapperEl) return

    const isSameNode = focusedNodeId.value === pos.id
    const isZoomedIn = isSameNode && Math.abs(zoom.value - FOCUS_ZOOM) < 0.01

    let targetZoom

    if (isZoomedIn) {
      // Повторный клик — возвращаем 100%, но всё ещё центрируем
      targetZoom = DEFAULT_ZOOM
      focusedNodeId.value = null
    } else {
      // Первый клик или другая нода — зум 125% и центрируем
      targetZoom = FOCUS_ZOOM
      focusedNodeId.value = pos.id
    }

    const target = calcCenterPan(pos, bounds, wrapperEl, targetZoom)
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