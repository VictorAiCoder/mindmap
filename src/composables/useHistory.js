// src/composables/useHistory.js
// Паттерн: Memento — снимки состояния для undo/redo

import { ref, computed } from 'vue'
import { MAX_HISTORY } from './constants'

export function useHistory(stateRef, { maxSize = MAX_HISTORY } = {}) {
  const snapshots = ref([])
  const index = ref(-1)

  const canUndo = computed(() => index.value > 0)
  const canRedo = computed(() => index.value < snapshots.value.length - 1)

  function clone(data) {
    return JSON.parse(JSON.stringify(data))
  }

  function save() {
    snapshots.value = snapshots.value.slice(0, index.value + 1)
    snapshots.value.push(clone(stateRef.value))

    if (snapshots.value.length > maxSize) {
      snapshots.value.shift()
    }
    index.value = snapshots.value.length - 1
  }

  function undo() {
    if (!canUndo.value) return
    index.value--
    stateRef.value = clone(snapshots.value[index.value])
  }

  function redo() {
    if (!canRedo.value) return
    index.value++
    stateRef.value = clone(snapshots.value[index.value])
  }

  // Первый снимок
  save()

  return { save, undo, redo, canUndo, canRedo }
}