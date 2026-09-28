// src/composables/useTheme.ts
import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'mindmap-theme'

function hasStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

function readInitialTheme(): Theme {
  if (!hasStorage()) return 'light'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

// ─── Singleton state (module-level) ──────────────────
// Тема одна на всё приложение, поэтому state живёт в модуле,
// а не создаётся заново при каждом вызове useTheme().
//
// ВАЖНО: на этапе импорта модуля localStorage не читаем (SSR/SSG),
// иначе падает пререндер. Синхронизация — только на клиенте.

const theme = ref<Theme>('light')

if (hasStorage()) {
  theme.value = readInitialTheme()
}

watch(theme, (value) => {
  if (!hasStorage()) return
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Игнорируем переполнение квоты / приватный режим
  }
})

// ─── Public API ──────────────────────────────────────

interface UseThemeReturn {
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