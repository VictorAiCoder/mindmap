/**
 * Состояние drag для конкретного узла на карте.
 * Все поля — производные от глобального drag-состояния (useNodeDrag)
 * относительно одного узла. Группируются вместе, потому что всегда
 * вычисляются и потребляются как единое целое.
 */
export interface NodeDragState {
  isDraggedOver: boolean
  isBeingDragged: boolean
  isInDragGroup: boolean
  liveX: number | null
  liveY: number | null
}

export const DEFAULT_NODE_DRAG_STATE: NodeDragState = {
  isDraggedOver: false,
  isBeingDragged: false,
  isInDragGroup: false,
  liveX: null,
  liveY: null,
}