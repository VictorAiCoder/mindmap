// src/composables/persistence/usePersistence.ts
import { watch, type Ref } from 'vue'
import { STORAGE_KEY, EXPORT_FILENAME_PREFIX } from '../../../shared/config/constants'
import { exportToMarkdown } from '../lib/exportMarkdown'
import { parseMarkdownToTree } from '../lib/importMarkdown'
import { createDefaultDocument } from '@entities/mindmap'

import type { MindMapNode } from '@entities/node'
import type { StoredImage, RawImage, ImageSegment } from '@entities/image'
import type { MindMapDocument } from '@entities/mindmap'
import type { ImageStorageApi } from '@app/store/useImageStorage'

import { normalizeScale } from '@/entities/node/model/useNodeScale'
import { NODE_SCALE } from '@/entities/node'

export type ExportFormat = 'json' | 'md' | 'markdown'

export interface PersistenceApi {
  exportTree: (format?: ExportFormat) => string
  importTree(file: File): Promise<MindMapDocument>
}

// ════════════════════════════════════════════════════
// LocalStorage
// ════════════════════════════════════════════════════

export function loadFromStorage(): MindMapDocument | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    return normalizeDocument(data)
  } catch {
    return null
  }
}

function saveToStorage(doc: MindMapDocument): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
  } catch (e) {
    // ⚠️ Частая причина — переполнение квоты из-за dataUrl картинок.
    //    В Коммите 3 (галерея) добавим UI для очистки неиспользуемых.
    console.warn('localStorage save failed:', e)
  }
}

// ════════════════════════════════════════════════════
// Type guards
// ════════════════════════════════════════════════════

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key]
  return typeof v === 'string' ? v : undefined
}

function readNumber(obj: Record<string, unknown>, key: string): number | undefined {
  const v = obj[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function readBoolean(obj: Record<string, unknown>, key: string): boolean | undefined {
  const v = obj[key]
  return typeof v === 'boolean' ? v : undefined
}

function generateFallbackId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ════════════════════════════════════════════════════
// Нормализация документа
// ════════════════════════════════════════════════════

/**
 * Принимает любые данные и приводит к форме MindMapDocument.
 * Ожидает формат v2: { version: 2, root, images }.
 * Для невалидных данных возвращает null.
 */
function normalizeDocument(raw: unknown): MindMapDocument | null {
  if (!isObject(raw)) return null
  if (raw.version !== 2) return null
  if (!isObject(raw.root)) return null

  const root = normalizeNode(raw.root)
  if (!root) return null

  const images = normalizeImages(raw.images)

  return { version: 2, root, images }
}

function normalizeImages(raw: unknown): StoredImage[] {
  if (!Array.isArray(raw)) return []

  const result: StoredImage[] = []
  for (const item of raw) {
    if (!isObject(item)) continue
    const kind = readString(item, 'kind')
    const id = readString(item, 'id')
    if (!id) continue

    if (kind === 'raw') {
      const dataUrl = readString(item, 'dataUrl')
      if (!dataUrl) continue
      const img: RawImage = { kind: 'raw', id, dataUrl }
      const name = readString(item, 'name')
      const createdAt = readNumber(item, 'createdAt')
      if (name) img.name = name
      if (createdAt !== undefined) img.createdAt = createdAt
      result.push(img)
    } else if (kind === 'segment') {
      const sourceId = readString(item, 'sourceId')
      const clipRaw = item.clip
      if (!sourceId || !isObject(clipRaw)) continue
      const x = readNumber(clipRaw, 'x')
      const y = readNumber(clipRaw, 'y')
      const w = readNumber(clipRaw, 'w')
      const h = readNumber(clipRaw, 'h')
      if (x === undefined || y === undefined || w === undefined || h === undefined) continue
      const seg: ImageSegment = {
        kind: 'segment',
        id,
        sourceId,
        clip: { x, y, w, h },
      }
      const name = readString(item, 'name')
      const createdAt = readNumber(item, 'createdAt')
      if (name) seg.name = name
      if (createdAt !== undefined) seg.createdAt = createdAt
      result.push(seg)
    }
  }
  return result
}

/**
 * Нормализует узел v2-формата.
 * 
 * Принцип: необязательные поля (notesPinned, notesVisible, scale)
 * НЕ записываем, если их нет в JSON — оставляем undefined.
 * Это совпадает с поведением createNode и даёт компактный JSON.
 */
function normalizeNode(raw: unknown): MindMapNode | null {
  if (!isObject(raw)) return null

  const rawChildren = raw.children
  const children: MindMapNode[] = Array.isArray(rawChildren)
    ? rawChildren
        .map(normalizeNode)
        .filter((n): n is MindMapNode => n !== null)
    : []

  const node: MindMapNode = {
    id:         readString(raw, 'id')    ?? generateFallbackId(),
    text:       readString(raw, 'text')  ?? '',
    color:      readString(raw, 'color') ?? '#5C6BC0',
    collapsed:  readBoolean(raw, 'collapsed') ?? false,
    notes:      readString(raw, 'notes') ?? '',
    imageId:    readString(raw, 'imageId') ?? null,
    imageWidth: readNumber(raw, 'imageWidth') ?? null,
    customX:    readNumber(raw, 'customX') ?? null,
    customY:    readNumber(raw, 'customY') ?? null,
    children,
  }

  // Опциональные поля — только если есть в JSON
  const notesPinned = readBoolean(raw, 'notesPinned')
  if (notesPinned !== undefined) node.notesPinned = notesPinned

  const notesVisible = readBoolean(raw, 'notesVisible')
  if (notesVisible !== undefined) node.notesVisible = notesVisible

  const rawScale = raw.scale
  if (typeof rawScale === 'number' && Number.isFinite(rawScale)) {
    const normalized = normalizeScale(rawScale)
    // Не сохраняем дефолтный scale — он и так применится
    if (normalized !== NODE_SCALE.DEFAULT) {
      node.scale = normalized
    }
  }

  return node
}

// ════════════════════════════════════════════════════
// Download helpers
// ════════════════════════════════════════════════════

function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function buildTimestamp(): string {
  return new Date().toISOString().slice(0, 10)
}

// ════════════════════════════════════════════════════
// Сериализация для экспорта (очистка от дефолтов)
// ════════════════════════════════════════════════════

/**
 * Компактное представление узла — только непустые поля.
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
  notesVisible?: false
  imageId?: string
  imageWidth?: number
  children?: SerializedNode[]
  scale?: number
}

interface SerializedImage {
  kind: 'raw' | 'segment'
  id: string
  dataUrl?: string
  sourceId?: string
  clip?: { x: number; y: number; w: number; h: number }
  name?: string
  createdAt?: number
}

interface SerializedDocument {
  version: 2
  root: SerializedNode
  images: SerializedImage[]
}

function cleanNodeForExport(node: MindMapNode): SerializedNode {
  const clean: SerializedNode = {
    id: node.id,
    text: node.text
  }

  if (node.color)                   clean.color = node.color
  if (node.collapsed)               clean.collapsed = true
  if (node.customX !== null)        clean.customX = node.customX
  if (node.customY !== null)        clean.customY = node.customY
  if (node.notes)                   clean.notes = node.notes
  if (node.notesPinned)             clean.notesPinned = true
  if (node.notesVisible === false)  clean.notesVisible = false
  if (node.imageId)                 clean.imageId = node.imageId
  if (node.imageWidth !== null)     clean.imageWidth = node.imageWidth
  if (node.children.length) {
    clean.children = node.children.map(cleanNodeForExport)
  }
  if (node.scale !== undefined && node.scale !== NODE_SCALE.DEFAULT) {
    clean.scale = node.scale
  }

  return clean
}

function cleanImageForExport(img: StoredImage): SerializedImage {
  if (img.kind === 'raw') {
    const out: SerializedImage = {
      kind: 'raw',
      id: img.id,
      dataUrl: img.dataUrl,
    }
    if (img.name)       out.name = img.name
    if (img.createdAt)  out.createdAt = img.createdAt
    return out
  }

  const out: SerializedImage = {
    kind: 'segment',
    id: img.id,
    sourceId: img.sourceId,
    clip: img.clip,
  }
  if (img.name)       out.name = img.name
  if (img.createdAt)  out.createdAt = img.createdAt
  return out
}

/**
 * Перед экспортом чистим пул картинок от "осиротевших":
 * тех, что не используются ни одним узлом и не являются источником
 * для используемых сегментов.
 *
 * 💡 Причина: в текущей политике старые картинки накапливаются в пуле
 *    при замене (setNodeImage). Экспорт — хорошая точка для чистки.
 */
function pruneUnusedImages(doc: MindMapDocument): StoredImage[] {
  const usedIds = new Set<string>()

  function walk(node: MindMapNode): void {
    if (node.imageId) usedIds.add(node.imageId)
    for (const c of node.children) walk(c)
  }
  walk(doc.root)

  // Добавляем источники используемых сегментов
  for (const img of doc.images) {
    if (img.kind === 'segment' && usedIds.has(img.id)) {
      usedIds.add(img.sourceId)
    }
  }

  return doc.images.filter((img) => usedIds.has(img.id))
}

// ════════════════════════════════════════════════════
// Распознавание формата импортируемого файла
// ════════════════════════════════════════════════════

type FileFormat = 'md' | 'json' | 'auto'

function getFileFormat(file: File): FileFormat {
  const name = file.name.toLowerCase()
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'md'
  if (name.endsWith('.json')) return 'json'
  if (file.type === 'text/markdown' || file.type === 'text/x-markdown') return 'md'
  if (file.type === 'application/json') return 'json'
  return 'auto'
}

/**
 * Разбирает файл в MindMapDocument.
 * Бросает исключение, если формат не распознан или данные битые.
 */
function parseFileToDocument(content: string, format: FileFormat): MindMapDocument {
  if (format === 'md') {
    return parseMarkdownFileToDocument(content)
  }

  if (format === 'json') {
    return parseJsonToDocument(content)
  }

  // auto: сначала пробуем JSON, при неудаче — markdown
  try {
    const data: unknown = JSON.parse(content)
    if (isObject(data)) {
      const doc = normalizeDocument(data)
      if (doc) return doc
      throw new Error('json-not-document')
    }
    throw new Error('not-json')
  } catch {
    return parseMarkdownFileToDocument(content)
  }
}

function parseJsonToDocument(content: string): MindMapDocument {
  const data: unknown = JSON.parse(content)
  const doc = normalizeDocument(data)
  if (!doc) throw new Error('Неверный формат JSON-документа')
  return doc
}

function parseMarkdownFileToDocument(content: string): MindMapDocument {
  // Парсер сам создаст RawImage в images при встрече image-lines.
  //   Собираем их в свежем документе.
  const fresh = createDefaultDocument()
  const imagesRef = { value: fresh.images } as Ref<StoredImage[]>

  const root = parseMarkdownToTree(content, imagesRef)
  if (!root) {
    throw new Error('Markdown не содержит заголовков')
  }

  return {
    version: 2,
    root,
    images: imagesRef.value,
  }
}

// ════════════════════════════════════════════════════
// Composable
// ════════════════════════════════════════════════════

export function usePersistence(
  document: Ref<MindMapDocument>,
  imageStorage: ImageStorageApi
): PersistenceApi {
  // Автосохранение при любых изменениях документа
  watch(
    document,
    (doc) => {
      if (doc) saveToStorage(doc)
    },
    { deep: true }
  )

  function exportTree(format: ExportFormat = 'json'): string {
    const ts = buildTimestamp()
    const doc = document.value

    if (format === 'markdown' || format === 'md') {
      const md = exportToMarkdown(doc.root, imageStorage)
      downloadFile(md, `${EXPORT_FILENAME_PREFIX}_${ts}.md`, 'text/markdown')
      return md
    }

    // JSON: документ целиком с чисткой неиспользуемых картинок
    const serialized: SerializedDocument = {
      version: 2,
      root: cleanNodeForExport(doc.root),
      images: pruneUnusedImages(doc).map(cleanImageForExport),
    }
    const json = JSON.stringify(serialized, null, 2)
    downloadFile(json, `${EXPORT_FILENAME_PREFIX}_${ts}.json`, 'application/json')
    return json
  }

  function importTree(file: File): Promise<MindMapDocument> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onerror = () => reject(new Error('Ошибка чтения файла'))

      reader.onload = (e) => {
        try {
          const content = e.target?.result
          if (typeof content !== 'string') {
            throw new Error('Не удалось прочитать содержимое файла')
          }

          const doc = parseFileToDocument(content, getFileFormat(file))
          document.value = doc
          resolve(doc)
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