// src/editor/composables/useNotification.ts
import { ref, provide } from 'vue'
import { notifyKey, type NotifyFn, type NotifyColor } from '../../../embed/injection-keys'

export interface SnackbarState {
  show: boolean
  text: string
  color: NotifyColor
  icon: string
}

/**
 * Unified notification composable.
 * Provides notify function to all descendants via injection.
 *
 * @example
 * ```ts
 * const { notify, snackbar } = useNotification()
 * notify('Saved', 'success', 'mdi-check')
 * ```
 */
export function useNotification() {
  const snackbar = ref<SnackbarState>({
    show: false,
    text: '',
    color: 'success',
    icon: 'mdi-check',
  })

  const notify: NotifyFn = (text, color = 'success', icon = 'mdi-check') => {
    snackbar.value = { show: true, text, color, icon }
  }

  provide(notifyKey, notify)

  return { notify, snackbar }
}
