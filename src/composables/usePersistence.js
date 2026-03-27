// src/composables/usePersistence.js
import { watch } from 'vue'
import { STORAGE_KEY, EXPORT_FILENAME_PREFIX } from './constants'
import { parseMarkdownToTree } from './useMarkdownParser'

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
function downloadFile(content, filename, mime = 'application/json') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// --- JSON экспорт ---

/**
 * ★ Исправлено: сохраняем ВСЕ данные узла включая координаты
 */
function cleanTreeForExport(node) {
  const clean = {
    id: node.id,
    text: node.text,
    color: node.color || undefined,
    collapsed: node.collapsed || undefined,
    customX: node.customX ?? undefined,    // ★ координаты
    customY: node.customY ?? undefined,    // ★ координаты
    notes: node.notes || undefined,
    image: node.image || undefined,
    children: node.children?.length
      ? node.children.map(cleanTreeForExport)
      : undefined
  }

  // Удаляем undefined поля для чистоты JSON
  Object.keys(clean).forEach(key => {
    if (clean[key] === undefined) delete clean[key]
  })

  return clean
}

// --- Markdown экспорт ---

function nodeToMarkdown(node, depth = 0) {
  const lines = []
  const maxHeadingLevel = 6

  if (depth < maxHeadingLevel) {
    const hashes = '#'.repeat(depth + 1)
    lines.push(`${hashes} ${node.text}`)
  } else {
    const indent = '> '.repeat(depth - maxHeadingLevel + 1)
    lines.push(`${indent}**${node.text}**`)
  }

  lines.push('')

  // ★ Картинка СРАЗУ после заголовка (до заметок)
  if (node.image) {
    lines.push(`![${node.text}](${node.image})`)
    lines.push('')
  }

  // Заметки после картинки
  if (node.notes?.trim()) {
    lines.push(node.notes.trim())
    lines.push('')
  }

  if (node.children?.length) {
    for (const child of node.children) {
      lines.push(...nodeToMarkdown(child, depth + 1))
    }
  }

  return lines
}

function treeToMarkdown(root) {
  const lines = nodeToMarkdown(root, 0)
  const cleaned = []
  let emptyCount = 0

  for (const line of lines) {
    if (line.trim() === '') {
      emptyCount++
      if (emptyCount <= 2) cleaned.push(line)
    } else {
      emptyCount = 0
      cleaned.push(line)
    }
  }

  while (cleaned.length && cleaned[cleaned.length - 1].trim() === '') {
    cleaned.pop()
  }

  return cleaned.join('\n') + '\n'
}

// --- Определение формата ---

function getFileFormat(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'md'
  if (name.endsWith('.json')) return 'json'
  if (file.type === 'text/markdown' || file.type === 'text/x-markdown') return 'md'
  if (file.type === 'application/json') return 'json'
  return 'auto'
}

// --- Основной composable ---

export function usePersistence(rootNode) {
  watch(rootNode, (val) => {
    if (val) saveToStorage(val)
  }, { deep: true })

  function exportTree(format = 'json') {
    const timestamp = new Date().toISOString().slice(0, 10)
    const root = rootNode.value

    if (format === 'markdown' || format === 'md') {
      const md = treeToMarkdown(root)
      downloadFile(md, `${EXPORT_FILENAME_PREFIX}_${timestamp}.md`, 'text/markdown')
      return md
    }

    const clean = cleanTreeForExport(root)
    const json = JSON.stringify(clean, null, 2)
    downloadFile(json, `${EXPORT_FILENAME_PREFIX}_${timestamp}.json`, 'application/json')
    return json
  }

  function importTree(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Ошибка чтения файла'))

      reader.onload = (e) => {
        try {
          const content = e.target.result
          const format = getFileFormat(file)

          let data

          if (format === 'md') {
            data = parseMarkdownToTree(content)
          } else if (format === 'json') {
            data = JSON.parse(content)
            if (!data.text) throw new Error('Неверный формат JSON')
          } else {
            try {
              data = JSON.parse(content)
              if (!data.text) throw new Error()
            } catch {
              data = parseMarkdownToTree(content)
            }
          }

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