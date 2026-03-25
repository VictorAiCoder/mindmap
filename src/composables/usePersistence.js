// src/composables/usePersistence.js
// Паттерн: Strategy (для будущих форматов) + сохранение

import { watch } from 'vue'
import { STORAGE_KEY, EXPORT_FILENAME_PREFIX } from './constants'

// --- Strategy: форматы экспорта ---
const exportStrategies = {
  json: (tree) => JSON.stringify(tree, null, 2),

  markdown: (tree, depth = 0) => {
    const indent = '  '.repeat(depth)
    const prefix = depth === 0 ? '# ' : '- '
    let result = `${indent}${prefix}${tree.text}\n`
    for (const child of tree.children ?? []) {
      result += exportStrategies.markdown(child, depth + 1)
    }
    return result
  }
}

// --- localStorage ---
export function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Ошибка сохранения:', e)
  }
}

// --- Persistence composable ---
export function usePersistence(rootNode) {
  // Автосохранение
  watch(rootNode, (val) => saveToStorage(val), { deep: true })

  function exportTree(format = 'json') {
    const content = exportStrategies[format]?.(rootNode.value)
    if (!content) return

    const ext = format === 'markdown' ? 'md' : 'json'
    const mime = format === 'markdown' ? 'text/markdown' : 'application/json'
    const date = new Date().toISOString().slice(0, 10)

    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)

    Object.assign(document.createElement('a'), {
      href: url,
      download: `${EXPORT_FILENAME_PREFIX}_${date}.${ext}`
    }).click()

    URL.revokeObjectURL(url)
  }

  function importTree(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          if (!data?.id || !data?.text) throw new Error('Неверный формат')
          rootNode.value = data
          resolve(true)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(new Error('Ошибка чтения файла'))
      reader.readAsText(file)
    })
  }

  return { exportTree, importTree }
}