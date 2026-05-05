// src/features/layout/index.ts

// Публичные типы (результат раскладки)
export type {
  LayoutPosition,
  LayoutBounds,
  LayoutData,
  PositionMap,
} from './model/types'

// Публичный enum выбора алгоритма (UI-селектор раскладок)
export type { LayoutType } from './lib/types'

// Композаблы и константы
export { useLayout } from './model/useLayout'
export { useAutoLayout, LAYOUT_TYPES } from './model/useAutoLayout'