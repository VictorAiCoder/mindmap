// src/composables/useNodeMenu.ts
import { ref, reactive, nextTick, onBeforeUnmount } from 'vue'

// ★ Глобальное состояние — одно меню на всё приложение
const activeMenuId = ref<string | null>(null)
const isOpen = ref(false)
const importDialogOpen = ref(false)
const importDialogTargetId = ref<string | null>(null)

function openImportDialog(nodeId: string) {
  importDialogTargetId.value = nodeId
  importDialogOpen.value = true
}

function closeImportDialog() {
  importDialogOpen.value = false
  importDialogTargetId.value = null
}

const menuPosition = reactive({
  position: 'fixed' as const,
  left: '0px',
  top: '0px',
  zIndex: 9999,
  visibility: 'hidden' as 'hidden' | 'visible'  // ★ прячем до позиционирования
})

interface ActiveNodeProps {
  nodeId: string
  isRoot: boolean
  hasImage: boolean
  hasNotes: boolean
  pinned: boolean
}

const activeNodeProps = reactive<ActiveNodeProps>({
  nodeId: '',
  isRoot: false,
  hasImage: false,
  hasNotes: false,
  pinned: false
})

let activeEmit: ((action: string) => void) | null = null
let cleanupFn: (() => void) | null = null

// ★ Ссылка на DOM-элемент меню, устанавливается из NodeActionsMenu
const menuElRef = ref<HTMLElement | null>(null)

// ★ Ссылка на trigger, от которого позиционируем
let activeTriggerEl: HTMLElement | null = null

function closeMenu() {
  // console.log('[menu] closeMenu called', new Error().stack?.split('\n').slice(1, 4))
  isOpen.value = false
  activeMenuId.value = null
  activeEmit = null
  activeTriggerEl = null
  menuPosition.visibility = 'hidden'

  if (cleanupFn) {
    cleanupFn()
    cleanupFn = null
  }
}

async function openMenu(
  nodeId: string,
  triggerEl: HTMLElement,
  props: { isRoot: boolean; hasImage: boolean; hasNotes: boolean; pinned: boolean },
  emitAction: (action: string) => void
) {
  if (activeMenuId.value === nodeId && isOpen.value) {
    closeMenu()
    return
  }

  if (cleanupFn) {
    cleanupFn()
    cleanupFn = null
  }

  activeMenuId.value = nodeId
  activeEmit = emitAction
  activeTriggerEl = triggerEl
  Object.assign(activeNodeProps, { ...props, nodeId })  // ★ добавили nodeId
  isOpen.value = true

  await nextTick()
  // await nextTick()

  positionMenu()
  menuPosition.visibility = 'visible'
  setupOutsideListeners()

}

function positionMenu() {
  if (!activeTriggerEl || !menuElRef.value) return

  const btn = activeTriggerEl.getBoundingClientRect()
  const menu = menuElRef.value.getBoundingClientRect()
  const pad = 8

  let left = btn.right + 6
  let top = btn.top - 4

  // Если вылезает за правый край
  if (left + menu.width + pad > window.innerWidth) {
    left = btn.left - menu.width - 6
  }

  // Если вылезает снизу
  if (top + menu.height + pad > window.innerHeight) {
    top = window.innerHeight - menu.height - pad
  }

  // Если вылезает сверху
  if (top < pad) top = pad

  menuPosition.left = `${Math.round(left)}px`
  menuPosition.top = `${Math.round(top)}px`
}

function setupOutsideListeners() {
  const onMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement

    // Клик на любой trigger — пусть тот trigger обработает
    if (target.closest?.('.node-actions__trigger')) {
      closeMenu()
      return
    }

    // Клик внутри меню — игнор
    if (menuElRef.value?.contains(target)) return

    closeMenu()
  }

  const onEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeMenu()
  }

  document.addEventListener('mousedown', onMouseDown, true)
  document.addEventListener('keydown', onEscape, true)

  cleanupFn = () => {
    document.removeEventListener('mousedown', onMouseDown, true)
    document.removeEventListener('keydown', onEscape, true)
  }
}

function emitAction(action: string) {
  const fn = activeEmit
  closeMenu()
  fn?.(action)
}

// ★ Функция для регистрации menuElRef из компонента меню
function registerMenuEl(el: HTMLElement | null) {
  menuElRef.value = el
}

export function useNodeMenu() {
  return {
    isOpen,
    activeMenuId,
    activeNodeProps,
    menuPosition,
    openMenu,
    closeMenu,
    emitAction,
    registerMenuEl,
    importDialogOpen,
    importDialogTargetId,
    openImportDialog,
    closeImportDialog,
  }
}