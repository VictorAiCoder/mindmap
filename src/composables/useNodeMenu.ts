// src/composables/useNodeMenu.ts
import { ref, reactive, nextTick } from 'vue'

// ═══════════════════════════════════════════════════════════════
// Public types
// ═══════════════════════════════════════════════════════════════

/**
 * Снимок состояния узла на момент открытия меню.
 * Содержит всё, что нужно меню для рендера UI и keepCenter-операций.
 *
 * Поля w/h нужны для вычисления центра узла (scale slider),
 * т.к. layoutData не доступен из глобального API composable'а.
 */
export interface NodeActionsContext {
  nodeId: string
  isRoot: boolean
  hasImage: boolean
  hasNotes: boolean
  pinned: boolean
  /** Ширина узла из LayoutPosition на момент открытия меню. */
  w: number
  /** Высота узла из LayoutPosition на момент открытия меню. */
  h: number
}

/**
 * Типизированные обработчики действий меню.
 * Инверсия управления: меню не знает, что делают эти действия —
 * только зовёт нужный callback. Родитель (MapNode) решает, что делать.
 */
export interface NodeMenuHandlers {
  onAddImage: () => void
  onOpenNotes: () => void
  onAddChild: () => void
  onEdit: () => void
  onResetPosition: () => void
  onDelete: () => void
  onEditSegments: () => void
}

/** Ключ действия — сужен до keyof NodeMenuHandlers (защита от опечаток). */
export type NodeMenuAction = keyof NodeMenuHandlers

// ═══════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════

const activeMenuId = ref<string | null>(null)
const isOpen = ref(false)
const importDialogOpen = ref(false)
const importDialogTargetId = ref<string | null>(null)

const menuPosition = reactive({
  position: 'fixed' as const,
  left: '0px',
  top: '0px',
  zIndex: 9999,
  visibility: 'hidden' as 'hidden' | 'visible'
})

/**
 * Реактивный снимок контекста узла для меню.
 * Меню читает поля из этого объекта (isRoot, hasImage и т.д.).
 */
const activeNodeProps = reactive<NodeActionsContext>({
  nodeId: '',
  isRoot: false,
  hasImage: false,
  hasNotes: false,
  pinned: false,
  w: 0,
  h: 0
})

let activeHandlers: NodeMenuHandlers | null = null
let cleanupFn: (() => void) | null = null

const menuElRef = ref<HTMLElement | null>(null)
let activeTriggerEl: HTMLElement | null = null

// ═══════════════════════════════════════════════════════════════
// Import dialog
// ═══════════════════════════════════════════════════════════════

function openImportDialog(nodeId: string): void {
  importDialogTargetId.value = nodeId
  importDialogOpen.value = true
}

function closeImportDialog(): void {
  importDialogOpen.value = false
  importDialogTargetId.value = null
}

// ═══════════════════════════════════════════════════════════════
// Open / close
// ═══════════════════════════════════════════════════════════════

function closeMenu(): void {
  isOpen.value = false
  activeMenuId.value = null
  activeHandlers = null
  activeTriggerEl = null
  menuPosition.visibility = 'hidden'

  if (cleanupFn) {
    cleanupFn()
    cleanupFn = null
  }
}

/**
 * Открывает меню узла. Если меню уже открыто для этого же узла — toggle (закрывает).
 *
 * @param triggerEl  DOM-элемент кнопки-триггера (для позиционирования и self-close)
 * @param ctx        Снимок состояния узла (nodeId + UI-флаги + геометрия)
 * @param handlers   Типизированные callback'и действий меню
 */
async function openMenu(
  triggerEl: HTMLElement,
  ctx: NodeActionsContext,
  handlers: NodeMenuHandlers
): Promise<void> {
  if (activeMenuId.value === ctx.nodeId && isOpen.value) {
    closeMenu()
    return
  }

  if (cleanupFn) {
    cleanupFn()
    cleanupFn = null
  }

  activeMenuId.value = ctx.nodeId
  activeHandlers = handlers
  activeTriggerEl = triggerEl
  Object.assign(activeNodeProps, ctx)
  isOpen.value = true

  await nextTick()

  positionMenu()
  menuPosition.visibility = 'visible'
  setupOutsideListeners()
}

// ═══════════════════════════════════════════════════════════════
// Positioning
// ═══════════════════════════════════════════════════════════════

function positionMenu(): void {
  if (!activeTriggerEl || !menuElRef.value) return

  const btn = activeTriggerEl.getBoundingClientRect()
  const menu = menuElRef.value.getBoundingClientRect()
  const pad = 8

  let left = btn.right + 6
  let top = btn.top - 4

  if (left + menu.width + pad > window.innerWidth) {
    left = btn.left - menu.width - 6
  }
  if (top + menu.height + pad > window.innerHeight) {
    top = window.innerHeight - menu.height - pad
  }
  if (top < pad) top = pad

  menuPosition.left = `${Math.round(left)}px`
  menuPosition.top = `${Math.round(top)}px`
}

// ═══════════════════════════════════════════════════════════════
// Outside listeners
// ═══════════════════════════════════════════════════════════════

function setupOutsideListeners(): void {
  const onMouseDown = (e: MouseEvent): void => {
    const target = e.target as Node

    // Клик по самой кнопке-триггеру → toggle (закрываем).
    // Сравнение по DOM вместо CSS-селектора — composable не зависит
    // от имён классов внутри NodeActions.vue.
    if (activeTriggerEl?.contains(target)) {
      closeMenu()
      return
    }

    // Клик внутри меню → ничего не делаем.
    if (menuElRef.value?.contains(target)) return

    // Клик вовне → закрываем.
    closeMenu()
  }

  const onEscape = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') closeMenu()
  }

  document.addEventListener('mousedown', onMouseDown, true)
  document.addEventListener('keydown', onEscape, true)

  cleanupFn = () => {
    document.removeEventListener('mousedown', onMouseDown, true)
    document.removeEventListener('keydown', onEscape, true)
  }
}

// ═══════════════════════════════════════════════════════════════
// Action dispatch
// ═══════════════════════════════════════════════════════════════

/**
 * Вызывает обработчик действия и закрывает меню.
 * Типизирован по keyof NodeMenuHandlers — опечатка = compile error.
 */
function runAction<K extends NodeMenuAction>(action: K): void {
  const handlers = activeHandlers
  closeMenu()
  handlers?.[action]()
}

function registerMenuEl(el: HTMLElement | null): void {
  menuElRef.value = el
}

// ═══════════════════════════════════════════════════════════════
// Segment editor
// ═══════════════════════════════════════════════════════════════

const segmentEditorOpen = ref(false)
const segmentEditorSourceId = ref<string | null>(null)
const segmentEditorNodeId = ref<string | null>(null)

function openSegmentEditor(nodeId: string, sourceImageId: string): void {
  closeMenu()
  segmentEditorNodeId.value = nodeId
  segmentEditorSourceId.value = sourceImageId
  segmentEditorOpen.value = true
}

function closeSegmentEditor(): void {
  segmentEditorOpen.value = false
  segmentEditorSourceId.value = null
  segmentEditorNodeId.value = null
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

export function useNodeMenu() {
  return {
    isOpen,
    activeMenuId,
    activeNodeProps,
    menuPosition,
    openMenu,
    closeMenu,
    runAction,
    registerMenuEl,
    importDialogOpen,
    importDialogTargetId,
    openImportDialog,
    closeImportDialog,
    segmentEditorOpen,
    segmentEditorSourceId,
    segmentEditorNodeId,
    openSegmentEditor,
    closeSegmentEditor
  }
}