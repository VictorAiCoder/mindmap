// src/composables/persistence/usePersistence.ts
import { watch, type Ref } from 'vue'
import { STORAGE_KEY, EXPORT_FILENAME_PREFIX } from '../constants'
import { exportToMarkdown } from './exportMarkdown'
import { parseMarkdownToTree } from './importMarkdown'

import type { MindMapNode } from '@/types/mindmap'
import type { PersistenceApi, ExportFormat } from '@/types/mindmap-api'

// ─── LocalStorage ────────────────────────────────────

export function loadFromStorage(): MindMapNode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    return normalizeNode(data)
  } catch {
    return null
  }
}

function saveToStorage(data: MindMapNode): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('localStorage save failed:', e)
  }
}

// ─── Type guards ─────────────────────────────────────

/**
 * Проверяет, что значение — непустой объект (не массив, не null).
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Безопасно достаёт строку из unknown-объекта.
 */
function readString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key]
  return typeof v === 'string' ? v : undefined
}

function readNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const v = obj[key]
  return typeof v === 'number' ? v : undefined
}

function readBoolean(obj: Record<string, unknown>, key: string): boolean | undefined {
  const v = obj[key]
  return typeof v === 'boolean' ? v : undefined
}

// ─── Нормализация ────────────────────────────────────

/**
 * Принимает любые данные и приводит их к форме MindMapNode.
 * Если данные невалидны — возвращает null.
 */
function normalizeNode(raw: unknown): MindMapNode | null {
  if (!isObject(raw)) return null

  const rawChildren = raw.children
  const children: MindMapNode[] = Array.isArray(rawChildren)
    ? rawChildren
        .map(normalizeNode)
        .filter((n): n is MindMapNode => n !== null)
    : []

  return {
    id:           readString(raw, 'id')    ?? generateFallbackId(),
    text:         readString(raw, 'text')  ?? '',
    color:        readString(raw, 'color') ?? '#5C6BC0',
    collapsed:    readBoolean(raw, 'collapsed') ?? false,
    notes:        readString(raw, 'notes') ?? '',
    notesPinned:  readBoolean(raw, 'notesPinned') ?? false,
    notesVisible: readBoolean(raw, 'notesVisible') ?? true,
    image:        readString(raw, 'image') ?? null,
    imageWidth:   readNumber(raw, 'imageWidth') ?? null,
    customX:      readNumber(raw, 'customX') ?? null,
    customY:      readNumber(raw, 'customY') ?? null,
    children
  }
}

function generateFallbackId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ─── Download helpers ────────────────────────────────

function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── JSON Export (очистка от дефолтов) ──────────────

/**
 * Тип сериализованного узла — все поля опциональны,
 * дефолты опущены для компактности файла.
 */
interface SerializedNode {
  id: string
  text: string
  color?: string
  collapsed?: boolean
  customX?: number
  customY?: number
  notes?: string
  notesPinned?: boolean
  notesVisible?: false  // ★ true — дефолт, не сохраняем
  image?: string
  imageWidth?: number
  children?: SerializedNode[]
}

function cleanTreeForExport(node: MindMapNode): SerializedNode {
  const clean: SerializedNode = {
    id: node.id,
    text: node.text
  }

  if (node.color)                  clean.color = node.color
  if (node.collapsed)              clean.collapsed = true
  if (node.customX !== null)       clean.customX = node.customX
  if (node.customY !== null)       clean.customY = node.customY
  if (node.notes)                  clean.notes = node.notes
  if (node.notesPinned)            clean.notesPinned = true
  if (node.notesVisible === false) clean.notesVisible = false
  if (node.image)                  clean.image = node.image
  if (node.imageWidth !== null)    clean.imageWidth = node.imageWidth
  if (node.children.length) {
    clean.children = node.children.map(cleanTreeForExport)
  }

  return clean
}

// ─── File format detection ───────────────────────────

type FileFormat = 'md' | 'json' | 'auto'

function getFileFormat(file: File): FileFormat {
  const name = file.name.toLowerCase()
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'md'
  if (name.endsWith('.json')) return 'json'
  if (file.type === 'text/markdown' || file.type === 'text/x-markdown') return 'md'
  if (file.type === 'application/json') return 'json'
  return 'auto'
}

function buildTimestamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseFile(content: string, format: FileFormat): unknown {
  if (format === 'md') return parseMarkdownToTree(content)

  if (format === 'json') {
    const data: unknown = JSON.parse(content)
    if (!isObject(data) || !readString(data, 'text')) {
      throw new Error('Неверный формат JSON')
    }
    return data
  }

  // auto
  try {
    const data: unknown = JSON.parse(content)
    if (isObject(data) && readString(data, 'text')) return data
    throw new Error('not-json')
  } catch {
    return parseMarkdownToTree(content)
  }
}

// ─── Composable ──────────────────────────────────────

export function usePersistence(rootNode: Ref<MindMapNode>): PersistenceApi {
  watch(
    rootNode,
    (val) => {
      if (val) saveToStorage(val)
    },
    { deep: true }
  )

  function exportTree(format: ExportFormat = 'json'): string {
    const ts = buildTimestamp()
    const root = rootNode.value

    if (format === 'markdown' || format === 'md') {
      const md = exportToMarkdown(root)
      downloadFile(md, `${EXPORT_FILENAME_PREFIX}_${ts}.md`, 'text/markdown')
      return md
    }

    const json = JSON.stringify(cleanTreeForExport(root), null, 2)
    downloadFile(json, `${EXPORT_FILENAME_PREFIX}_${ts}.json`, 'application/json')
    return json
  }

  function importTree(file: File): Promise<MindMapNode> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onerror = () => reject(new Error('Ошибка чтения файла'))

      reader.onload = (e) => {
        try {
          const content = e.target?.result
          if (typeof content !== 'string') {
            throw new Error('Не удалось прочитать содержимое файла')
          }

          const raw = parseFile(content, getFileFormat(file))
          const data = normalizeNode(raw)

          if (!data) throw new Error('Пустые или невалидные данные')

          rootNode.value = data
          resolve(data)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Неверный формат файла'
          reject(new Error(message))
        }
      }

      reader.readAsText(file)
    })
  }

  return { exportTree, importTree }
}