// src/composables/canvas/usePanZoom.ts
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
  const focusedNodeId = ref<string | null>(null)
  const FOCUS_ZOOM = 1.25
  const DEFAULT_ZOOM = 1

  // ★ Сохранённые ссылки — позволяют resetView/zoomIn/zoomOut работать без аргументов
  const rootSceneCenter = ref<{ x: number; y: number } | null>(null)
  const wrapperElRef = ref<HTMLElement | null>(null)

  const zoomPercent = computed(() => Math.round(zoom.value * 100))

  /**
   * ★ Регистрируем wrapper-элемент. Вызвать один раз из canvas.
   */
  function setWrapper(el: HTMLElement | null) {
    wrapperElRef.value = el
  }

  /**
   * Регистрируем центр root-ноды в scene-координатах.
   */
  function setRootSceneCenter(x: number, y: number) {
    rootSceneCenter.value = { x, y }
  }

  // ── Helpers ──

  function getViewportCenter(): { x: number; y: number } {
    if (wrapperElRef.value) {
      const rect = wrapperElRef.value.getBoundingClientRect()
      return { x: rect.width / 2, y: rect.height / 2 }
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  }

  function zoomToPivot(
    pivotSceneX: number,
    pivotSceneY: number,
    oldZoom: number,
    newZoom: number
  ) {
    const pivotScreenX = pivotSceneX * oldZoom + panX.value
    const pivotScreenY = pivotSceneY * oldZoom + panY.value

    zoom.value = newZoom
    panX.value = pivotScreenX - pivotSceneX * newZoom
    panY.value = pivotScreenY - pivotSceneY * newZoom
  }

  function calcPivotBetween(
    sceneA: { x: number; y: number },
    sceneB: { x: number; y: number }
  ) {
    return {
      x: (sceneA.x + sceneB.x) / 2,
      y: (sceneA.y + sceneB.y) / 2
    }
  }

  // ── Wheel zoom ──

  function onWheel(e: WheelEvent, wrapperEl?: HTMLElement | null) {  // ← добавили | null
    focusedNodeId.value = null

    if (wrapperEl) wrapperElRef.value = wrapperEl

    const delta = e.deltaY > 0 ? -0.08 : 0.08
    const oldZoom = zoom.value
    const newZoom = clamp(oldZoom + delta, 0.2, 3)
    if (newZoom === oldZoom) return

    let cursorX: number
    let cursorY: number

    if (wrapperElRef.value) {
      const rect = wrapperElRef.value.getBoundingClientRect()
      cursorX = e.clientX - rect.left
      cursorY = e.clientY - rect.top
    } else {
      cursorX = e.clientX
      cursorY = e.clientY
    }

    const cursorSceneX = (cursorX - panX.value) / oldZoom
    const cursorSceneY = (cursorY - panY.value) / oldZoom

    let pivot: { x: number; y: number }

    if (rootSceneCenter.value) {
      pivot = calcPivotBetween(
        { x: cursorSceneX, y: cursorSceneY },
        rootSceneCenter.value
      )
    } else {
      pivot = { x: cursorSceneX, y: cursorSceneY }
    }

    zoomToPivot(pivot.x, pivot.y, oldZoom, newZoom)
  }

  // ── Button zoom ──

  function zoomIn() {
    focusedNodeId.value = null
    zoomByDelta(0.15)
  }

  function zoomOut() {
    focusedNodeId.value = null
    zoomByDelta(-0.15)
  }

  function zoomByDelta(delta: number) {
    const oldZoom = zoom.value
    const newZoom = clamp(oldZoom + delta, 0.2, 3)
    if (newZoom === oldZoom) return

    const center = getViewportCenter()
    const centerSceneX = (center.x - panX.value) / oldZoom
    const centerSceneY = (center.y - panY.value) / oldZoom

    let pivot: { x: number; y: number }

    if (rootSceneCenter.value) {
      pivot = calcPivotBetween(
        { x: centerSceneX, y: centerSceneY },
        rootSceneCenter.value
      )
    } else {
      pivot = { x: centerSceneX, y: centerSceneY }
    }

    zoomToPivot(pivot.x, pivot.y, oldZoom, newZoom)
  }

  // ── Reset view — корневая нода в центр ──

  function resetView() {
    focusedNodeId.value = null

    const targetZoom = DEFAULT_ZOOM

    if (rootSceneCenter.value) {
      const center = getViewportCenter()
      const targetPanX = center.x - rootSceneCenter.value.x * targetZoom
      const targetPanY = center.y - rootSceneCenter.value.y * targetZoom

      animateTo(targetPanX, targetPanY, targetZoom)
    } else {
      animateTo(0, 0, targetZoom)
    }
  }

  // ── Pan ──

  function startPan(e: MouseEvent) {
    focusedNodeId.value = null
    isPanning.value = true
    lastMouse.x = e.clientX
    lastMouse.y = e.clientY
    lastPan.x = panX.value
    lastPan.y = panY.value
  }

  function movePan(e: MouseEvent) {
    if (!isPanning.value) return
    panX.value = lastPan.x + (e.clientX - lastMouse.x)
    panY.value = lastPan.y + (e.clientY - lastMouse.y)
  }

  function endPan() {
    isPanning.value = false
  }

  function screenToScene(
    clientX: number,
    clientY: number,
    wrapperRect: DOMRect,
    bounds: { minX: number; minY: number }
  ) {
    const z = zoom.value
    return {
      x: (clientX - wrapperRect.left - panX.value) / z + bounds.minX,
      y: (clientY - wrapperRect.top - panY.value) / z + bounds.minY
    }
  }

  // ── Анимация ──

  function animateTo(targetPanX: number, targetPanY: number, targetZoom: number) {
    isAnimating.value = true
    panX.value = targetPanX
    panY.value = targetPanY
    zoom.value = clamp(targetZoom, 0.2, 3)

    setTimeout(() => {
      isAnimating.value = false
    }, 500)
  }

  // ── Focus on node ──

  function calcCenterPan(sceneX: number, sceneY: number, targetZoom: number) {
    const center = getViewportCenter()
    const z = clamp(targetZoom, 0.2, 3)
    return {
      panX: center.x - sceneX * z,
      panY: center.y - sceneY * z
    }
  }

  function nodeCenterScene(
    pos: { x: number; y: number; w: number; h: number },
    bounds: { minX: number; minY: number }
  ) {
    return {
      x: pos.x - bounds.minX + pos.w / 2,
      y: pos.y - bounds.minY + pos.h / 2
    }
  }

  function focusOnNode(
  pos: { id: string; x: number; y: number; w: number; h: number },
  rootPos: { x: number; y: number; w: number; h: number } | null,  // ← было без | null
  bounds: { minX: number; minY: number },
  wrapperEl: HTMLElement | null                                    // ← было без | null
) {
  if (!wrapperEl || !rootPos) return

    wrapperElRef.value = wrapperEl

    const isSameNode = focusedNodeId.value === pos.id
    const isZoomedIn = isSameNode && Math.abs(zoom.value - FOCUS_ZOOM) < 0.01

    const nodeCenter = nodeCenterScene(pos, bounds)
    const rootCenter = nodeCenterScene(rootPos, bounds)

    let targetZoom: number
    let targetSceneX: number
    let targetSceneY: number

    if (isZoomedIn) {
      targetZoom = DEFAULT_ZOOM
      targetSceneX = (rootCenter.x + nodeCenter.x) / 2
      targetSceneY = (rootCenter.y + nodeCenter.y) / 2
      focusedNodeId.value = null
    } else {
      targetZoom = FOCUS_ZOOM
      targetSceneX = nodeCenter.x
      targetSceneY = nodeCenter.y
      focusedNodeId.value = pos.id
    }

    const target = calcCenterPan(targetSceneX, targetSceneY, targetZoom)
    animateTo(target.panX, target.panY, targetZoom)
  }

  return {
    zoom, panX, panY, isPanning, isAnimating, zoomPercent,
    focusedNodeId,
    setWrapper,
    setRootSceneCenter,
    onWheel, zoomIn, zoomOut, resetView,
    startPan, movePan, endPan,
    screenToScene,
    focusOnNode
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}