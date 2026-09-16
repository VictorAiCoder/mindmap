import { watch, triggerRef, type Ref } from 'vue'
import { STORAGE_KEY, EXPORT_FILENAME_PREFIX } from '../../../shared/config/constants'
import { exportToMarkdown } from '../lib/exportMarkdown'
import type { MindMapDocument } from '@entities/mindmap'
import type { ImageStorageApi } from '../../../../embed/types/image-storage'
import {
  normalizeDocument,
  buildTimestamp,
  downloadFile,
  cleanNodeForExport,
  cleanImageForExport,
  pruneUnusedImages,
  parseFileToDocument,
  getFileFormat,
  type SerializedDocument,
} from '@shared/lib/persistence-utils'

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
    // Частая причина — переполнение квоты из-за dataUrl картинок.
    console.warn('localStorage save failed:', e)
  }
}

// ════════════════════════════════════════════════════
// Composable — with auto-save to localStorage
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
          triggerRef(document)
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
