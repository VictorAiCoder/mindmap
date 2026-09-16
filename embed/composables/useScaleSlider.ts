import { ref, computed, type Ref } from 'vue'
import { NODE_SCALE } from '@entities/node'
import type { Center2D, MindMapNode } from '@entities/node'

interface DragSession {
  nodeId: string
  sessionId: string
  liveValue: number
  savedCenter: Center2D | null
}

/**
 * Encapsulates scale slider logic for NodeActionsMenu.
 *
 * Fixes:
 * - Race condition: uses `menuInstanceId` to guard against node switching during drag
 * - Node deletion safety: `withActiveNode` guard checks node existence before operations
 * - Cleanup: single `cleanup()` function resets drag state
 *
 * @example
 * const { liveScale, scalePercent, isDefaultScale, onSliderStart, onSliderInput, onSliderCommit, resetScale } = useScaleSlider({
 *   activeMenuId,
 *   isOpen,
 *   findNode: mindmap.findNode,
 *   activeNodeProps: p,
 *   updateScale: mindmap.updateScale,
 *   commitScale: mindmap.commitScale,
 * })
 */
export function useScaleSlider(options: {
  activeMenuId: Ref<string | null>
  isOpen: Ref<boolean>
  findNode: (id: string) => MindMapNode | null
  activeNodeProps: { w: number; h: number }
  updateScale: (id: string, scale: number, center?: Center2D) => void
  commitScale: (id: string, scale: number, center?: Center2D) => void
}) {
  const menuInstanceId = crypto.randomUUID()

  const dragSession = ref<DragSession | null>(null)

  // ─── Guard ──────────────────────────────────

  function withActiveNode(
    f: (nodeId: string, node: MindMapNode) => void
  ): boolean {
    const nodeId = options.activeMenuId.value
    if (!nodeId || !options.isOpen.value) return false

    const node = options.findNode(nodeId)
    if (!node) return false

    f(nodeId, node)
    return true
  }

  // ─── Center computation ─────────────────────

  function computeCenterForActiveNode(): Center2D | null {
    const nodeId = options.activeMenuId.value
    if (!nodeId) return null

    const node = options.findNode(nodeId)
    if (!node) return null

    if (node.customX == null || node.customY == null) return null

    const { w, h } = options.activeNodeProps
    if (w <= 0 || h <= 0) return null

    return {
      cx: node.customX + w / 2,
      cy: node.customY + h / 2,
    }
  }

  // ─── Computed ───────────────────────────────

  const liveScale = computed<number>(() => {
    if (dragSession.value) return dragSession.value.liveValue

    const nodeId = options.activeMenuId.value
    if (!nodeId) return NODE_SCALE.DEFAULT

    const node = options.findNode(nodeId)
    return node?.scale ?? NODE_SCALE.DEFAULT
  })

  const scalePercent = computed<number>(() => Math.round(liveScale.value * 100))

  const isDefaultScale = computed<boolean>(
    () => Math.abs(liveScale.value - NODE_SCALE.DEFAULT) < 0.001
  )

  // ─── Slider handlers ────────────────────────

  function onSliderStart(_e: PointerEvent): void {
    withActiveNode((nodeId, node) => {
      dragSession.value = {
        nodeId,
        sessionId: menuInstanceId,
        liveValue: node.scale ?? NODE_SCALE.DEFAULT,
        savedCenter: computeCenterForActiveNode(),
      }
    })
  }

  function onSliderInput(e: Event): void {
    const session = dragSession.value
    if (!session) return

    const target = e.target as HTMLInputElement
    const value = parseFloat(target.value)
    if (!Number.isFinite(value)) return

    session.liveValue = value
    options.updateScale(session.nodeId, value, session.savedCenter ?? undefined)
  }

  function onSliderCommit(): void {
    const session = dragSession.value
    if (!session) return

    // Guard: only commit if this is still the same menu instance
    if (session.sessionId !== menuInstanceId) {
      dragSession.value = null
      return
    }

    // Guard: node might have been deleted
    const node = options.findNode(session.nodeId)
    if (!node) {
      dragSession.value = null
      return
    }

    options.commitScale(
      session.nodeId,
      session.liveValue,
      session.savedCenter ?? undefined
    )

    dragSession.value = null
  }

  function resetScale(): void {
    withActiveNode((nodeId) => {
      options.commitScale(
        nodeId,
        NODE_SCALE.DEFAULT,
        computeCenterForActiveNode() ?? undefined
      )
    })
  }

  // ─── Cleanup ────────────────────────────────

  function cleanup(): void {
    dragSession.value = null
  }

  return {
    liveScale,
    scalePercent,
    isDefaultScale,
    onSliderStart,
    onSliderInput,
    onSliderCommit,
    resetScale,
    cleanup,
  }
}
