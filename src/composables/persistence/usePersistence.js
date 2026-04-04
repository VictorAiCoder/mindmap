// src/composables/persistence/usePersistence.js
import { watch } from 'vue'
import { STORAGE_KEY, EXPORT_FILENAME_PREFIX } from '../../constants'
import { treeToMarkdown } from './exportMarkdown'
import { parseMarkdownToTree } from './importMarkdown'

// --- LocalStorage ---

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('localStorage save failed:', e)
  }
}

// --- Скачивание файла ---

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// --- JSON ---

function cleanTreeForExport(node) {
  const clean = {
    id: node.id,
    text: node.text,
    color: node.color || undefined,
    collapsed: node.collapsed || undefined,
    customX: node.customX ?? undefined,
    customY: node.customY ?? undefined,
    notes: node.notes || undefined,
    image: node.image || undefined,
    children: node.children?.length
      ? node.children.map(cleanTreeForExport)
      : undefined
  }

  Object.keys(clean).forEach(key => {
    if (clean[key] === undefined) delete clean[key]
  })

  return clean
}

function getFileFormat(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'md'
  if (name.endsWith('.json')) return 'json'
  if (file.type === 'text/markdown' || file.type === 'text/x-markdown') return 'md'
  if (file.type === 'application/json') return 'json'
  return 'auto'
}

function buildTimestamp() {
  return new Date().toISOString().slice(0, 10)
}

// --- Composable ---

export function usePersistence(rootNode) {
  watch(rootNode, (val) => {
    if (val) saveToStorage(val)
  }, { deep: true })

  function exportTree(format = 'json') {
    const ts = buildTimestamp()
    const root = rootNode.value

    if (format === 'markdown' || format === 'md') {
      const md = treeToMarkdown(root)
      downloadFile(md, `${EXPORT_FILENAME_PREFIX}_${ts}.md`, 'text/markdown')
      return md
    }

    const json = JSON.stringify(cleanTreeForExport(root), null, 2)
    downloadFile(json, `${EXPORT_FILENAME_PREFIX}_${ts}.json`, 'application/json')
    return json
  }

  function importTree(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Ошибка чтения файла'))

      reader.onload = (e) => {
        try {
          const content = e.target.result
          const data = parseFile(content, getFileFormat(file))
          rootNode.value = data
          resolve(data)
        } catch (err) {
          reject(new Error(err.message || 'Неверный формат файла'))
        }
      }

      reader.readAsText(file)
    })
  }

  return { exportTree, importTree }
}

function parseFile(content, format) {
  if (format === 'md') return parseMarkdownToTree(content)

  if (format === 'json') {
    const data = JSON.parse(content)
    if (!data.text) throw new Error('Неверный формат JSON')
    return data
  }

  // auto — пробуем JSON, fallback на MD
  try {
    const data = JSON.parse(content)
    if (data.text) return data
    throw new Error()
  } catch {
    return parseMarkdownToTree(content)
  }
}