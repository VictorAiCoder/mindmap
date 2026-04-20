// src/composables/useTheme.ts
import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'mindmap-theme'

function readInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'dark' ? 'dark' : 'light'
}

// ─── Singleton state (module-level) ──────────────────
// Тема одна на всё приложение, поэтому state живёт в модуле,
// а не создаётся заново при каждом вызове useTheme().

const theme = ref<Theme>(readInitialTheme())

watch(theme, (value) => {
  localStorage.setItem(STORAGE_KEY, value)
})

// ─── Public API ──────────────────────────────────────

export interface UseThemeReturn {
  theme: Ref<Theme>
  isDark: ComputedRef<boolean>
  toggle: () => void
  set: (value: Theme) => void
}

export function useTheme(): UseThemeReturn {
  const isDark = computed(() => theme.value === 'dark')

  function toggle(): void {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function set(value: Theme): void {
    theme.value = value
  }

  return { theme, isDark, toggle, set }
}