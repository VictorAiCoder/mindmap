import type { Ref } from 'vue'

export interface HistoryApi {
  save: () => void
  undo: () => void
  redo: () => void
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>
  clear: () => void
}
