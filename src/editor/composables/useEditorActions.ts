// src/editor/composables/useEditorActions.ts
import { computed } from 'vue'
import type { MindMapApi, NotifyFn, ExportFormat } from '../../embed/types/mindmap-api'
import { LAYOUT_TYPES } from '@features/layout'
import type { LayoutType } from '@features/layout/lib/types'

/**
 * Editor actions composable — mediator between UI and MindMapApi.
 * Handles undo/redo, export/import, layout with notification.
 */
export function useEditorActions(api: MindMapApi, notify: NotifyFn) {
  const nodeCount = computed(() => api.nodeCount.value)
  const treeDepth = computed(() => api.treeDepth.value)
  const canUndo = computed(() => api.canUndo.value)
  const canRedo = computed(() => api.canRedo.value)

  function undo(): void { api.undo() }
  function redo(): void { api.redo() }
  function resetToDefault(): void { api.resetToDefault() }

  const EXPORT_LABELS: Record<ExportFormat, { text: string; icon: string }> = {
    json: { text: 'Экспорт в JSON', icon: 'mdi-code-json' },
    md: { text: 'Экспорт в Markdown', icon: 'mdi-language-markdown' },
    markdown: { text: 'Экспорт в Markdown', icon: 'mdi-language-markdown' },
  }

  function handleExport(format: ExportFormat = 'json'): void {
    api.exportTree(format)
    const label = EXPORT_LABELS[format]
    notify(label.text, 'success', label.icon)
  }

  async function handleImport(file: File): Promise<void> {
    try {
      await api.importTree(file)
      const isMd = /\.(md|markdown)$/i.test(file.name)
      notify(`Импорт из ${isMd ? 'Markdown' : 'JSON'}`, 'success', 'mdi-upload')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка импорта'
      notify(message, 'error', 'mdi-alert')
    }
  }

  function handleAutoLayout(type: LayoutType): void {
    api.autoLayout(type)
    const layout = LAYOUT_TYPES[type]
    notify(`Раскладка: ${layout.label}`, 'success', layout.icon)
  }

  function handleResetLayout(): void {
    api.resetAllPositions()
    notify('Позиции сброшены', 'info', 'mdi-pin-off-outline')
  }

  return {
    nodeCount,
    treeDepth,
    canUndo,
    canRedo,
    undo,
    redo,
    resetToDefault,
    handleExport,
    handleImport,
    handleAutoLayout,
    handleResetLayout,
  }
}
