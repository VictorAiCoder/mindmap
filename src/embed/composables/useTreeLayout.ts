import type { MindMapNode, Center2D } from '@entities/node'
import { applyAutoLayout, resetLayout } from '@features/layout'
import { NODE_SCALE } from '@entities/node'
import { clampScale, normalizeScale } from '@entities/node/model/useNodeScale'
import { NODE_CORE } from '@shared/config/node-dimensions'
import type { TreeCore } from './useTreeCore'
import type { HistoryApi } from '../types/history'
import type { LayoutType } from '@features/layout/lib/types'

export interface TreeLayoutApi {
  resetAllPositions: () => void
  autoLayout: (type?: LayoutType) => void
  updateScale: (nodeId: string, scale: number, savedCenter?: Center2D) => void
  commitScale: (nodeId: string, scale: number, savedCenter?: Center2D) => void
}

export function useTreeLayout(core: TreeCore, history: HistoryApi): TreeLayoutApi {
  const { rootRef, findNode, touch } = core

  function baseSize(isRoot: boolean): { w: number; h: number } {
    return isRoot
      ? { w: NODE_CORE.ROOT_WIDTH, h: NODE_CORE.ROOT_HEIGHT }
      : { w: NODE_CORE.WIDTH, h: NODE_CORE.HEIGHT }
  }

  function resetAllPositions(): void {
    history.save()
    resetLayout(rootRef())
    touch()
  }

  function autoLayout(type: LayoutType = 'mindmap'): void {
    history.save()
    applyAutoLayout(rootRef(), type)
    touch()
  }

  function updateScale(
    nodeId: string,
    scale: number,
    savedCenter?: Center2D
  ): void {
    const node = findNode(nodeId)
    if (!node) return

    const clamped = clampScale(scale)
    node.scale = clamped

    if (node.customX != null && node.customY != null && savedCenter) {
      const isRoot = nodeId === rootRef().id
      const { w: baseW, h: baseH } = baseSize(isRoot)
      const newW = baseW * clamped
      const newH = baseH * clamped
      node.customX = savedCenter.cx - newW / 2
      node.customY = savedCenter.cy - newH / 2
    }

    touch()
  }

  function commitScale(
    nodeId: string,
    scale: number,
    savedCenter?: Center2D
  ): void {
    const node = findNode(nodeId)
    if (!node) return

    history.save()

    const final = normalizeScale(scale)
    node.scale = final === NODE_SCALE.DEFAULT ? undefined : final

    if (node.customX != null && node.customY != null && savedCenter) {
      const isRoot = nodeId === rootRef().id
      const { w: baseW, h: baseH } = baseSize(isRoot)
      const newW = baseW * final
      const newH = baseH * final
      node.customX = savedCenter.cx - newW / 2
      node.customY = savedCenter.cy - newH / 2
    }

    touch()
  }

  return { resetAllPositions, autoLayout, updateScale, commitScale }
}
