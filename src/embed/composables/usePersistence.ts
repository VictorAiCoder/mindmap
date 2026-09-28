import { watch, triggerRef, type Ref } from 'vue'
import { exportToMarkdown } from '@features/persistence/lib/exportMarkdown'
import type { MindMapDocument } from '@entities/mindmap'
import type { ImageStorageApi } from '../types/image-storage'
import { EXPORT_FILENAME_PREFIX, STORAGE_KEY } from '@shared/config/constants'
import type { PersistenceApi, ExportFormat } from '../types/persistence'
import {
  normalizeDocument,
  buildTimestamp,
  downloadFile,
  cleanNodeForExport,
  cleanImageForExport,
  pruneUnusedImages,
  parseFileToDocument,
  getFileFormat,
} from '@shared/lib/persistence-utils'

function hasStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

export function loadFromStorage(): MindMapDocument | null {
  if (!hasStorage()) return null
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
  if (!hasStorage()) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
  } catch (e) {
    // Частая причина — переполнение квоты из-за dataUrl картинок.
    console.warn('localStorage save failed:', e)
  }
}

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

    const serialized = {
      version: 2 as const,
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

  function getMarkdown(hiddenSections?: string[]): string {
    return exportToMarkdown(document.value.root, imageStorage, hiddenSections)
  }

  return { exportTree, importTree, getMarkdown }
}
