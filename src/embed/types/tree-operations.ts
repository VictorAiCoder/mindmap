import type { MindMapNode, ScenePosition, Center2D } from '@entities/node'
import type { LayoutType } from '@features/layout/lib/types'
import type { PositionMap } from '@features/layout/model/types'

export interface TreeOperationsApi {
  addChild: (parentId: string, text?: string) => string | null
  deleteNode: (nodeId: string) => void

  updateText: (nodeId: string, text: string) => void
  updateColor: (nodeId: string, color: string) => void
  updateNotes: (nodeId: string, notes: string) => void
  updateNodePosition: (
    nodeId: string,
    x: number | null,
    y: number | null
  ) => void

  toggleCollapse: (nodeId: string) => void
  toggleNotePin: (nodeId: string) => void
  toggleNotesVisible: (nodeId: string) => void

  setNodeImage: (nodeId: string, dataUrl: string) => void
  setNodeImageById: (nodeId: string, imageId: string) => void
  removeNodeImage: (nodeId: string) => void
  setImageWidth: (nodeId: string, width: number) => void
  commitImageResize: (nodeId: string, width: number) => void

  resetAllPositions: () => void
  autoLayout: (type?: LayoutType) => void

  reparentNode: (nodeId: string, newParentId: string) => boolean
  moveNodeGroup: (
    nodeId: string,
    dx: number,
    dy: number,
    layoutPositions?: PositionMap
  ) => void

  updateScale: (nodeId: string, scale: number, savedCenter?: Center2D) => void
  commitScale: (nodeId: string, scale: number, savedCenter?: Center2D) => void
  findNode: (id: string) => MindMapNode | null
  importMarkdownIntoNode: (nodeId: string, markdown: string) => number
  findImageUsages: (imageId: string) => string[]
  renameImage: (imageId: string, name: string) => void
  deleteImageWithDetach: (imageId: string) => number
  purgeUnusedImages: () => number
}
