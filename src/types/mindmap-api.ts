// src/types/mindmap-api.ts
import type { Ref, ComputedRef } from 'vue'
import type {
  MindMapNode,
  MindMapDocument,
  StoredImage,
  ImageSegment,
  Clip,        
  ScenePosition,
  Center2D 
} from './mindmap'
import type { PositionMap } from './layout'
import type { SegmentOperationsApi } from '@/composables/image/useSegmentOperations'

// ════════════════════════════════════════════
// ★ ImageStorageApi — "тупой" CRUD пула картинок
// ════════════════════════════════════════════

export interface ResolvedImage {
  id: string
  dataUrl: string
  /**
   * Нормализованный прямоугольник обрезки для сегментов.
   * Для RawImage — undefined (показывать целиком).
   */
  clip?: Clip                                             // ★ Clip
}

export interface ImageStorageApi {
  /** Read-only представление пула для компонентов */
  images: Readonly<Ref<readonly StoredImage[]>>

  /**
   * Находит картинку по id и резолвит её в готовые для рендера данные.
   * Для сегмента — возвращает dataUrl исходника + clip.
   */
  resolve(id: string | null | undefined): ResolvedImage | null

  /**
   * Добавляет новую сырую картинку в пул.
   * Возвращает сгенерированный id.
   *
   * 💡 Не пишет в историю — вызывающий код должен делать history.save()
   * до мутации, если хочет undo.
   */
  addRaw(dataUrl: string, name?: string): string

  /**
   * Удаляет картинку из пула безусловно.
   * ⚠️ Не проверяет использование — узлы с этим imageId потеряют картинку.
   * ⚠️ Не пишет в историю.
   */
  remove(id: string): void

  /**
   * Переименовывает картинку. Пустое/whitespace имя игнорируется.
   * ⚠️ Не пишет в историю.
   */
  rename(id: string, name: string): void

  /** Количество картинок в пуле (реактивное) */
  totalCount: ComputedRef<number>

  /**
   * Создаёт сегмент из существующей RawImage.
   * ⚠️ sourceId должен указывать на картинку kind === 'raw'.
   * Сегменты из сегментов не поддерживаются.
   * ⚠️ Не пишет в историю.
   * @returns id созданного сегмента или null если sourceId невалидный
   */
  addSegment(
    sourceId: string,
    clip: Clip,                                           // ★ Clip
    name?: string
  ): string | null

  /**
   * Обновляет прямоугольник и/или имя сегмента.
   * ⚠️ Не пишет в историю.
   */
  updateSegment(
    id: string,
    patch: Partial<{
      clip: Clip                                          // ★ Clip
      name: string
    }>
  ): void

  /**
   * Возвращает все сегменты, построенные от указанного источника.
   * (Реактивно через computed в вызывающем коде, если нужно.)
   */
  listSegmentsOf(sourceId: string): readonly ImageSegment[]   // ★ убран inline import()
}

// ─── Layout ────────────────────────────────────────

export type LayoutType =
  | 'mindmap'
  | 'spacious'
  | 'treeDown'
  | 'treeRight'
  | 'radial'
  | 'compact'

/** Карта "id узла → позиция", результат работы layout-функции */
export type LayoutPositions = Map<string, ScenePosition>

/** Функция, рассчитывающая раскладку */
export type LayoutFn = (root: MindMapNode) => LayoutPositions

/** Метаданные для UI (иконка, название, функция) */
export interface LayoutDescriptor {
  label: string
  icon: string
  fn: LayoutFn
}

// ─── Tree Operations ───────────────────────────────

export interface TreeOperationsApi {
  addChild: (parentId: string, text?: string) => string | null
  deleteNode: (nodeId: string) => void

  updateText: (nodeId: string, text: string) => void
  updateColor: (nodeId: string, color: string) => void
  updateNotes: (nodeId: string, notes: string) => void
  updateNodePosition: (
    nodeId: string,
    x: number | null,
    y: number | null
  ) => void

  toggleCollapse: (nodeId: string) => void
  toggleNotePin: (nodeId: string) => void
  toggleNotesVisible: (nodeId: string) => void

  setNodeImage: (nodeId: string, dataUrl: string) => void
  removeNodeImage: (nodeId: string) => void
  setImageWidth: (nodeId: string, width: number) => void
  commitImageResize: (nodeId: string, width: number) => void

  resetAllPositions: () => void
  autoLayout: (type?: LayoutType) => void

  reparentNode: (nodeId: string, newParentId: string) => boolean
  moveNodeGroup: (
    nodeId: string,
    dx: number,
    dy: number,
    layoutPositions?: PositionMap
  ) => void

  updateScale(
    nodeId: string,
    scale: number,
    savedCenter?: Center2D
  ): void
  commitScale(
    nodeId: string,
    scale: number,
    savedCenter?: Center2D
  ): void
  findNode(id: string): MindMapNode | null
  importMarkdownIntoNode: (nodeId: string, markdown: string) => number

  // ── ★ Image-aware tree operations (history-aware) ──

  /**
   * Привязывает к узлу существующую картинку из пула.
   * Снимает прежнюю привязку (если была) и пишет историю.
   */
  setNodeImageById: (nodeId: string, imageId: string) => void

  /**
   * Переименовывает картинку с записью в историю.
   */
  renameImage: (imageId: string, name: string) => void

  /**
   * Удаляет картинку из пула и снимает её со всех узлов.
   * Пишет историю.
   * @returns количество узлов, у которых снята привязка
   */
  deleteImageWithDetach: (imageId: string) => void

  /**
   * Удаляет из пула все картинки, на которые нет ссылок.
   * Пишет историю только если что-то удалено.
   * @returns число удалённых картинок
   */
  purgeUnusedImages: () => number

  /**
   * Возвращает id узлов, использующих данную картинку.
   * (Не мутирует, не пишет историю.)
   */
  findImageUsages: (imageId: string) => string[]
}

// ─── History ───────────────────────────────────────

export interface HistoryApi {
  save: () => void
  undo: () => void
  redo: () => void
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>
  clear: () => void
}

// ─── Persistence ───────────────────────────────────

export type ExportFormat = 'json' | 'md' | 'markdown'

export interface PersistenceApi {
  exportTree: (format?: ExportFormat) => string,
  importTree(file: File): Promise<MindMapDocument>
}

// ─── Фасад ─────────────────────────────────────────

export interface MindMapApi extends TreeOperationsApi, PersistenceApi, SegmentOperationsApi {
  rootNode: Ref<MindMapNode>

  // History
  undo: () => void
  redo: () => void
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>

  resetToDefault: () => void

  /** Количество узлов в дереве (реактивное) */
  nodeCount: ComputedRef<number>
  /** Глубина дерева (реактивное) */
  treeDepth: ComputedRef<number>

  /** Реактивное количество неиспользуемых картинок (требует обхода дерева) */
  unusedImageCount: ComputedRef<number>

  imageStorage: ImageStorageApi
}