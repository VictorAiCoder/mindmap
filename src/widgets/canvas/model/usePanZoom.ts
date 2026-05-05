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

  const focusedNodeId = ref<string | null>(null)
  const FOCUS_ZOOM = 1.25
  const DEFAULT_ZOOM = 1

  const rootSceneCenter = ref<{ x: number; y: number } | null>(null)
  const wrapperElRef = ref<HTMLElement | null>(null)

  const sceneBounds = ref<{ minX: number; minY: number }>({ minX: 0, minY: 0 })

  const zoomPercent = computed(() => Math.round(zoom.value * 100))

  function setWrapper(el: HTMLElement | null) {
    wrapperElRef.value = el
  }

  function setRootSceneCenter(x: number, y: number) {
    rootSceneCenter.value = { x, y }
  }

  function setBounds(minX: number, minY: number) {
    sceneBounds.value = { minX, minY }
  }

  function getViewportCenter(): { x: number; y: number } {
    if (wrapperElRef.value) {
      const rect = wrapperElRef.value.getBoundingClientRect()
      return { x: rect.width / 2, y: rect.height / 2 }
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  }

  function screenToSceneLocal(screenX: number, screenY: number) {
    const z = zoom.value
    const b = sceneBounds.value
    return {
      x: (screenX - panX.value + b.minX) / z,
      y: (screenY - panY.value + b.minY) / z
    }
  }

  function calcPanForScenePoint(
    sceneX: number, 
    sceneY: number, 
    screenX: number, 
    screenY: number, 
    targetZoom: number
  ) {
    const z = clamp(targetZoom, 0.2, 3)
    const b = sceneBounds.value
    return {
      panX: screenX + b.minX - sceneX * z,
      panY: screenY + b.minY - sceneY * z
    }
  }

  function zoomToPivot(
    pivotSceneX: number, 
    pivotSceneY: number, 
    oldZoom: number, 
    newZoom: number
  ) {
    const b = sceneBounds.value
    const pivotScreenX = panX.value - b.minX + pivotSceneX * oldZoom
    const pivotScreenY = panY.value - b.minY + pivotSceneY * oldZoom

    zoom.value = newZoom
    const newPan = calcPanForScenePoint(
      pivotSceneX, pivotSceneY, pivotScreenX, pivotScreenY, newZoom
    )
    panX.value = newPan.panX
    panY.value = newPan.panY
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

  function onWheel(e: WheelEvent, wrapperEl?: HTMLElement | null) {
    focusedNodeId.value = null
    if (wrapperEl) wrapperElRef.value = wrapperEl

    const delta = e.deltaY > 0 ? -0.08 : 0.08
    const oldZoom = zoom.value
    const newZoom = clamp(oldZoom + delta, 0.2, 3)
    if (newZoom === oldZoom) return

    let cursorScreenX: number, cursorScreenY: number

    if (wrapperElRef.value) {
      const rect = wrapperElRef.value.getBoundingClientRect()
      cursorScreenX = e.clientX - rect.left
      cursorScreenY = e.clientY - rect.top
    } else {
      cursorScreenX = e.clientX
      cursorScreenY = e.clientY
    }

    const cursorScene = screenToSceneLocal(cursorScreenX, cursorScreenY)

    let pivot: { x: number; y: number }
    if (rootSceneCenter.value) {
      pivot = calcPivotBetween(cursorScene, rootSceneCenter.value)
    } else {
      pivot = cursorScene
    }

    zoomToPivot(pivot.x, pivot.y, oldZoom, newZoom)
  }

  function zoomIn() { focusedNodeId.value = null; zoomByDelta(0.15) }
  function zoomOut() { focusedNodeId.value = null; zoomByDelta(-0.15) }

  function zoomByDelta(delta: number) {
    const oldZoom = zoom.value
    const newZoom = clamp(oldZoom + delta, 0.2, 3)
    if (newZoom === oldZoom) return

    const center = getViewportCenter()
    const centerScene = screenToSceneLocal(center.x, center.y)

    let pivot: { x: number; y: number }
    if (rootSceneCenter.value) {
      pivot = calcPivotBetween(centerScene, rootSceneCenter.value)
    } else {
      pivot = centerScene
    }

    zoomToPivot(pivot.x, pivot.y, oldZoom, newZoom)
  }

  function resetView() {
    focusedNodeId.value = null
    const targetZoom = DEFAULT_ZOOM

    if (rootSceneCenter.value) {
      const center = getViewportCenter()
      const target = calcPanForScenePoint(
        rootSceneCenter.value.x, rootSceneCenter.value.y,
        center.x, center.y,
        targetZoom
      )
      animateTo(target.panX, target.panY, targetZoom)
    } else {
      animateTo(0, 0, targetZoom)
    }
  }

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

  function endPan() { isPanning.value = false }

  /**
   * Публичная функция для drag-and-drop hit-test'а.
   * Возвращает МИРОВЫЕ координаты (как pos.x в layout).
   */
  function screenToScene(
    clientX: number, clientY: number,
    wrapperRect: DOMRect,
    bounds: { minX: number; minY: number }
  ) {
    return screenToSceneLocal(
      clientX - wrapperRect.left,
      clientY - wrapperRect.top
    )
    
  }

  function animateTo(targetPanX: number, targetPanY: number, targetZoom: number) {
    isAnimating.value = true
    panX.value = targetPanX
    panY.value = targetPanY
    zoom.value = clamp(targetZoom, 0.2, 3)
    setTimeout(() => { isAnimating.value = false }, 500)
  }

  function nodeCenterScene(
    pos: { x: number; y: number; w: number; h: number }
  ) {
    return {
      x: pos.x + pos.w / 2,
      y: pos.y + pos.h / 2
    }
  }

  function focusOnNode(
    pos: { id: string; x: number; y: number; w: number; h: number },
    rootPos: { x: number; y: number; w: number; h: number } | null,
    bounds: { minX: number; minY: number },
    wrapperEl: HTMLElement | null
  ) {
    if (!wrapperEl || !rootPos) return
    wrapperElRef.value = wrapperEl

    const isSameNode = focusedNodeId.value === pos.id
    const isZoomedIn = isSameNode && Math.abs(zoom.value - FOCUS_ZOOM) < 0.01

    const nodeCenter = nodeCenterScene(pos)
    const rootCenter = nodeCenterScene(rootPos)

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

    const center = getViewportCenter()
    const target = calcPanForScenePoint(
      targetSceneX, targetSceneY,
      center.x, center.y,
      targetZoom
    )
    animateTo(target.panX, target.panY, targetZoom)
  }

  return {
    zoom, panX, panY, isPanning, isAnimating, zoomPercent,
    focusedNodeId,
    setWrapper,
    setRootSceneCenter,
    setBounds,           // ★ НОВОЕ
    onWheel, zoomIn, zoomOut, resetView,
    startPan, movePan, endPan,
    screenToScene,
    focusOnNode
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}