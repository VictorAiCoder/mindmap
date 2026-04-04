// src/composables/useHistory.js
import { ref, shallowRef } from 'vue'

const MAX_HISTORY = 50

export function useHistory(rootNode) {
  const undoStack = ref([])
  const redoStack = ref([])

  const canUndo = ref(false)
  const canRedo = ref(false)

  function updateFlags() {
    canUndo.value = undoStack.value.length > 0
    canRedo.value = redoStack.value.length > 0
  }

  function save() {
    const snapshot = JSON.stringify(rootNode.value)
    undoStack.value.push(snapshot)

    if (undoStack.value.length > MAX_HISTORY) {
      undoStack.value.shift()
    }

    redoStack.value = []
    updateFlags()
  }

  function undo() {
    if (!undoStack.value.length) return

    const current = JSON.stringify(rootNode.value)
    redoStack.value.push(current)

    const prev = undoStack.value.pop()
    rootNode.value = JSON.parse(prev)
    updateFlags()
  }

  function redo() {
    if (!redoStack.value.length) return

    const current = JSON.stringify(rootNode.value)
    undoStack.value.push(current)

    const next = redoStack.value.pop()
    rootNode.value = JSON.parse(next)
    updateFlags()
  }

  return { save, undo, redo, canUndo, canRedo }
}