// src/composables/useHistory.ts
import { ref, type Ref } from 'vue'
import { MAX_HISTORY } from '../../shared/config/constants'

export interface HistoryApi {
  save: () => void
  undo: () => void
  redo: () => void
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>
  clear: () => void
}
/**
 * Generic composable для undo/redo любого состояния.
 *
 * Использует JSON-сериализацию — подходит для простых объектов
 * без циклических ссылок, функций, Map/Set.
 */
export function useHistory<T>(state: Ref<T>): HistoryApi {
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])

  const canUndo = ref(false)
  const canRedo = ref(false)

  function updateFlags(): void {
    canUndo.value = undoStack.value.length > 0
    canRedo.value = redoStack.value.length > 0
  }

  function snapshot(): string {
    return JSON.stringify(state.value)
  }

  /**
   * Восстанавливает состояние из снапшота.
   * Возвращает false, если парсинг не удался (битый JSON).
   */
  function restore(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as T
      state.value = parsed
      return true
    } catch (e) {
      console.error('[useHistory] Failed to restore state:', e)
      return false
    }
  }

  function save(): void {
    undoStack.value.push(snapshot())

    if (undoStack.value.length > MAX_HISTORY) {
      undoStack.value.shift()
    }

    // При новом действии redo-стек обнуляется
    redoStack.value = []
    updateFlags()
  }

  function undo(): void {
    const prev = undoStack.value.pop()
    if (prev === undefined) return // ★ TS narrowing: после проверки prev — string

    redoStack.value.push(snapshot())

    if (!restore(prev)) {
      // При фейле восстановления — откатываем изменения стека
      redoStack.value.pop()
    }
    updateFlags()
  }

  function redo(): void {
    const next = redoStack.value.pop()
    if (next === undefined) return

    undoStack.value.push(snapshot())

    if (!restore(next)) {
      undoStack.value.pop()
    }
    updateFlags()
  }

  function clear(): void {
    undoStack.value = []
    redoStack.value = []
    updateFlags()
  }

  return {
    save,
    undo,
    redo,
    canUndo,
    canRedo,
    clear
  }
}