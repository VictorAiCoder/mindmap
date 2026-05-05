🧵 **Сшиваю все 4 сообщения в единый документ.** Готов к копипасту в `docs/MIGRATION.md`.

---

````markdown
# План миграции на Feature-Sliced Design (FSD)

> **Проект:** Vue 3 + TypeScript mind-map application
> **Цель:** реструктурировать `src/` из плоской структуры (`components/`, `composables/`, `types/`, `utils/`) в FSD-слои (`app/`, `pages/`, `widgets/`, `features/`, `entities/`, `shared/`).
> **Подход:** инкрементальная миграция, каждый коммит — компилируется и проходит тесты.

---

## Содержание

1. [Принципы и инварианты](#1-принципы-и-инварианты)
2. [Целевая структура](#2-целевая-структура)
3. [Phase 0 — подготовка](#3-phase-0--подготовка)
4. [Phase 1 — shared/](#4-phase-1--shared)
5. [Phase 1.5 — types/ → разнос](#5-phase-15--types--разнос)
6. [Phase 2 — entities/](#6-phase-2--entities)
7. [Phase 3 — features/](#7-phase-3--features)
8. [Phase 4 — app/store/](#8-phase-4--appstoreusemindmapts)
9. [Phase 5 — widgets/](#9-phase-5--widgets-слой)
10. [Phase 6 — pages/ + app finalization](#10-phase-6--pages--app-finalization)
11. [Phase 7 — final cleanup](#11-phase-7--final-cleanup)
12. [Финальная структура](#12-финальная-структура-проекта)
13. [Чеклист готовности](#13-чеклист-готовности-после-каждой-phase)
14. [Rollback strategy](#14-rollback-strategy)
15. [Открытые вопросы и решения](#15-открытые-вопросы-и-решения)
16. [Метрики успеха](#16-метрики-успеха)
17. [Время выполнения](#17-время-выполнения-оценка)
18. [Финальные напоминания](#18-финальные-напоминания)
19. [Что НЕ входит в миграцию](#19-что-не-входит-в-эту-миграцию)
20. [Что дальше](#20-после-миграции--что-дальше)

---

## 1. Принципы и инварианты

🎯 **Принципы, которые нельзя нарушать:**

1. **Каждый коммит — компилируется и проходит тесты.** Никаких «допилю в следующем коммите».
2. **Один коммит — одно логическое изменение.** Не смешивай переезд `useHistory` и переезд `useTheme` в одном коммите.
3. **Public API через `index.ts`.** Если файл не экспортируется из barrel — он внутренняя деталь слайса.
4. **Направление зависимостей строго сверху вниз.** Если `entity` хочет что-то из `feature` — это сигнал, что архитектура неверна, **остановись и проанализируй**.
5. **`git mv`, не `mv` + `git add`.** Сохраняет историю файла.
6. **Ручная проверка после Phase 4, 5, 6.** Автотесты не покрывают всё — открой dev-server и тыкни мышкой.
7. **Делай короткие сессии.** Усталость → ошибки → откат → демотивация.

### Иерархия слоёв

| Слой       | Содержимое                                      | Может зависеть от                       |
|------------|-------------------------------------------------|-----------------------------------------|
| `app/`     | Инициализация, store, provide(), глобальные стили | всех нижних                           |
| `pages/`   | Композиция widgets в страницы                   | widgets, features, entities, shared     |
| `widgets/` | Самостоятельные UI-блоки (canvas, toolbar)      | features, entities, shared              |
| `features/`| Пользовательские сценарии (auto-layout, export) | entities, shared                        |
| `entities/`| Доменные сущности (node, mindmap, image)        | shared                                  |
| `shared/`  | Утилиты, библиотеки, константы                  | —                                       |

### Структура слайса

```
<layer>/<slice>/
├── ui/         # Vue-компоненты
├── model/      # composables, store, бизнес-логика
├── lib/        # вспомогательные утилиты, типы
└── index.ts    # public API (только то, что торчит наружу)
```

---

## 2. Целевая структура

```
src/
├── app/
│   ├── App.vue
│   ├── store/
│   │   ├── useMindMap.ts        # MindMapApi inline
│   │   └── index.ts
│   ├── providers/
│   │   └── keys.ts
│   └── styles/
│       └── global.css           # если есть
│
├── pages/
│   └── mindmap/
│       ├── ui/MindMapPage.vue
│       └── index.ts
│
├── widgets/
│   ├── canvas/
│   │   ├── ui/
│   │   │   ├── MindMapCanvas.vue
│   │   │   └── ConnectionLayer.vue
│   │   ├── model/
│   │   │   ├── useLayout.ts
│   │   │   ├── useConnections.ts
│   │   │   ├── useViewport.ts
│   │   │   ├── usePanZoom.ts
│   │   │   ├── useNodeDrag.ts
│   │   │   └── useNodeScale.ts
│   │   ├── lib/types.ts
│   │   └── index.ts
│   ├── toolbar/
│   │   ├── ui/
│   │   │   ├── Toolbar.vue
│   │   │   └── LayoutSelector.vue
│   │   └── index.ts
│   └── note-editor/             # если есть
│       ├── ui/NoteEditor.vue
│       ├── model/useMarkdown.ts
│       └── index.ts
│
├── features/
│   ├── auto-layout/
│   │   ├── model/useAutoLayout.ts
│   │   ├── lib/
│   │   │   ├── types.ts
│   │   │   └── algorithms/
│   │   │       ├── compact.ts
│   │   │       ├── mindmap.ts
│   │   │       ├── radial.ts
│   │   │       ├── spacious.ts
│   │   │       ├── treeDown.ts
│   │   │       └── treeRight.ts
│   │   └── index.ts
│   ├── persistence/
│   │   ├── model/usePersistence.ts
│   │   ├── lib/
│   │   │   ├── exportPng.ts
│   │   │   └── exportJson.ts
│   │   └── index.ts
│   └── image-gallery/
│       ├── model/
│       │   ├── useImageStorage.ts
│       │   └── useSegmentOperations.ts
│       ├── ui/ImageGallery.vue
│       └── index.ts
│
├── entities/
│   ├── node/
│   │   ├── ui/
│   │   │   ├── MindNode.vue
│   │   │   └── NodeContent.vue
│   │   ├── model/
│   │   │   ├── types.ts          # MindMapNode
│   │   │   └── constants.ts      # NODE_SCALE
│   │   └── index.ts
│   ├── mindmap/
│   │   ├── model/useTreeOperations.ts
│   │   └── index.ts
│   └── image/
│       ├── ui/
│       │   ├── NodeImage.vue
│       │   └── types.ts          # NodeImageEmits
│       └── index.ts
│
├── shared/
│   └── lib/
│       ├── useHistory.ts
│       ├── useTheme.ts
│       ├── useToggle.ts
│       ├── imageHandler.ts
│       ├── hljs.ts
│       └── index.ts
│
├── main.ts
└── (style.css → app/styles/global.css)
```

### Aliases

```ts
@app/*       → src/app/*
@pages/*     → src/pages/*
@widgets/*   → src/widgets/*
@features/*  → src/features/*
@entities/*  → src/entities/*
@shared/*    → src/shared/*
```

---

## 3. Phase 0 — подготовка

> 🎯 **Цель:** настроить инфраструктуру для безопасной миграции.

### Шаг 0.1 — Зафиксировать baseline

```bash
git checkout main
git pull
git tag pre-fsd-migration
git push origin pre-fsd-migration

# Создать ветку миграции:
git checkout -b refactor/fsd-migration
```

### Шаг 0.2 — Добавить FSD-aliases

**`tsconfig.json`** (или `tsconfig.app.json`):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*":         ["./src/*"],
      "@app/*":      ["./src/app/*"],
      "@pages/*":    ["./src/pages/*"],
      "@widgets/*":  ["./src/widgets/*"],
      "@features/*": ["./src/features/*"],
      "@entities/*": ["./src/entities/*"],
      "@shared/*":   ["./src/shared/*"]
    }
  }
}
```

> ⚠️ Старый `@/*` пока **сохраняется** — удалим в Phase 7.

**`vite.config.ts`:**

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@':         fileURLToPath(new URL('./src', import.meta.url)),
      '@app':      fileURLToPath(new URL('./src/app', import.meta.url)),
      '@pages':    fileURLToPath(new URL('./src/pages', import.meta.url)),
      '@widgets':  fileURLToPath(new URL('./src/widgets', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
      '@shared':   fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
})
```

### Шаг 0.3 — Создать пустые директории слоёв

```bash
mkdir -p src/app/{store,providers,styles}
mkdir -p src/pages
mkdir -p src/widgets
mkdir -p src/features
mkdir -p src/entities
mkdir -p src/shared/lib
```

> 💡 Чтобы git отслеживал пустые папки, можно временно положить `.gitkeep` в каждую. После миграции файлы появятся, и `.gitkeep` можно будет удалить.

### Шаг 0.4 — Проверка

```bash
npm run typecheck
npm test
npm run build
```

**Коммит:**
```
chore: setup FSD aliases and layer directories

- Added @app, @pages, @widgets, @features, @entities, @shared aliases.
- Created empty layer directories (with .gitkeep).
- Legacy @/* alias preserved (will be removed in final cleanup).
- Tag: pre-fsd-migration created on main.
```

✅ **Phase 0 завершена.** 1 коммит.

---

## 4. Phase 1 — shared/

> 🎯 **Цель:** перенести инфраструктурные утилиты в `shared/lib/`.

### Шаг 1.1 — Параметризация `useHistory` (решение Q4)

**До миграции:** в `useHistory.ts` константа `MAX_HISTORY = 50` хардкоднута.

**После:** параметризовать через опции:

```ts
// src/composables/useHistory.ts (пока ещё в старом месте)
import { ref, watch, type Ref } from 'vue'

export interface HistoryApi {
  undo: () => void
  redo: () => void
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>
}

export interface UseHistoryOptions {
  maxSize?: number
}

export function useHistory<T>(
  state: Ref<T>,
  options: UseHistoryOptions = {}
): HistoryApi {
  const maxSize = options.maxSize ?? 50

  // ... существующая реализация, но MAX_HISTORY → maxSize ...
}
```

**Обновить вызов в `useMindMap.ts`** (старое место):
```ts
const history = useHistory(rootNode, { maxSize: 50 })
```

**Проверка:** typecheck + тесты должны быть зелёные.

**Коммит:**
```
refactor(history): parametrize useHistory maxSize via options

- Заменён хардкод MAX_HISTORY = 50 на options.maxSize (default 50).
- API: useHistory<T>(state, { maxSize? }).
- Поведение не изменилось.
```

### Шаг 1.2 — Перенос `useHistory`

```bash
git mv src/composables/useHistory.ts src/shared/lib/useHistory.ts
```

**Обновить импорты:**

```bash
grep -rln "from '@/composables/useHistory'" src/
sed -i "s|from '@/composables/useHistory'|from '@shared/lib'|g" \
  $(grep -rln "from '@/composables/useHistory'" src/)
```

> ⚠️ После замены потребители импортят из `@shared/lib`, поэтому нужен barrel.

### Шаг 1.3 — Перенос `useTheme`

```bash
git mv src/composables/useTheme.ts src/shared/lib/useTheme.ts
```

```bash
grep -rln "from '@/composables/useTheme'" src/
sed -i "s|from '@/composables/useTheme'|from '@shared/lib'|g" \
  $(grep -rln "from '@/composables/useTheme'" src/)
```

### Шаг 1.4 — Перенос остальных утилит

Кандидаты в `shared/lib/` (проверь, что есть в проекте):

```bash
# Composables
git mv src/composables/useToggle.ts      src/shared/lib/useToggle.ts      2>/dev/null

# Утилиты
git mv src/utils/imageHandler.ts         src/shared/lib/imageHandler.ts   2>/dev/null

# Библиотеки-обёртки
git mv src/lib/hljs.ts                   src/shared/lib/hljs.ts           2>/dev/null
```

**Обновить импорты:**

```bash
grep -rln "from '@/composables/useToggle'" src/
sed -i "s|from '@/composables/useToggle'|from '@shared/lib'|g" \
  $(grep -rln "from '@/composables/useToggle'" src/)

grep -rln "from '@/utils/imageHandler'" src/
sed -i "s|from '@/utils/imageHandler'|from '@shared/lib'|g" \
  $(grep -rln "from '@/utils/imageHandler'" src/)

grep -rln "from '@/lib/hljs'" src/
sed -i "s|from '@/lib/hljs'|from '@shared/lib'|g" \
  $(grep -rln "from '@/lib/hljs'" src/)
```

### Шаг 1.5 — Создать barrel `shared/lib/index.ts`

```ts
// src/shared/lib/index.ts
export { useHistory, type HistoryApi, type UseHistoryOptions } from './useHistory'
export { useTheme } from './useTheme'
export { useToggle } from './useToggle'
export { handleImagePaste } from './imageHandler' // подставь реальные имена
export { default as hljs } from './hljs'
```

> 🔍 Проверь точные именованные экспорты каждого модуля.

### Шаг 1.6 — Очистка пустых директорий

```bash
rmdir src/composables 2>/dev/null  # если пуста
rmdir src/utils       2>/dev/null
rmdir src/lib         2>/dev/null
```

> ⚠️ Они НЕ будут пусты — там ещё `useMindMap.ts`, `tree/`, `image/`, `layout/`, `persistence/`. Удалятся позже.

**Проверка:**
```bash
npm run typecheck && npm test
```

**Коммит:**
```
refactor(shared): move infrastructure utilities → shared/lib

- useHistory, useTheme, useToggle, handleImagePaste, hljs → shared/lib/.
- Public API: src/shared/lib/index.ts barrel.
- Все потребители переведены на @shared/lib.
- Старые директории composables/utils/lib пока сохраняются (содержат ещё не мигрированные файлы).
```

✅ **Phase 1 завершена.** 2 коммита (1.1 + 1.2-1.6).

---

## 5. Phase 1.5 — types/ → разнос

> 🎯 **Цель:** разнести содержимое `src/types/` по правильным слоям/слайсам **до** миграции компонентов, использующих эти типы.

### Что в `src/types/`

Предположительно (адаптируй под реальность):

```
src/types/
├── mindmap-api.ts        # MindMapApi (агрегатор) — отложен до Phase 4
├── injection-keys.ts     # InjectionKey<MindMapApi> — отложен до Phase 6
├── node.ts               # MindMapNode — Phase 1.5.1
├── node-image-emits.ts   # NodeImageEmits — Phase 1.5.5
├── layout.ts             # LayoutPosition, NodeDragState etc. — Phase 1.5.3
└── ...
```

> ⚠️ **`mindmap-api.ts` и `injection-keys.ts` НЕ трогаем сейчас.**
> - `mindmap-api.ts` будет inline'нут в Phase 4.
> - `injection-keys.ts` переедет в Phase 6.

### Шаг 1.5.1 — `MindMapNode` → `entities/node/model/types.ts`

```bash
mkdir -p src/entities/node/model
git mv src/types/node.ts src/entities/node/model/types.ts
```

**Создать barrel `entities/node/index.ts`:**
```ts
// src/entities/node/index.ts
export type { MindMapNode } from './model/types'
```

**Заменить импорты:**
```bash
grep -rln "from '@/types/node'" src/
sed -i "s|from '@/types/node'|from '@entities/node'|g" \
  $(grep -rln "from '@/types/node'" src/)
```

### Шаг 1.5.2 — `NODE_SCALE` (если есть) → `entities/node/model/constants.ts`

Если в проекте есть константы узлов (масштабы, размеры):

```bash
# Если константы в отдельном файле:
git mv src/constants/node.ts src/entities/node/model/constants.ts 2>/dev/null

# Расширить barrel:
echo "export * from './model/constants'" >> src/entities/node/index.ts
```

### Шаг 1.5.3 — Layout-типы → `widgets/canvas/lib/types.ts`

> 🤔 **Решение Q2:** drag/layout типы — часть widget canvas, не features.

```bash
mkdir -p src/widgets/canvas/lib
git mv src/types/layout.ts src/widgets/canvas/lib/types.ts
```

**Создать barrel `widgets/canvas/index.ts`** (компонент добавим позже):
```ts
// src/widgets/canvas/index.ts
export type {
  LayoutPosition,
  LayoutBounds,
  LayoutData,
  PositionMap,
  NodeDragState,
  NodeDragEmits,
} from './lib/types'

// MindMapCanvas будет добавлен в Phase 5.
```

**Заменить импорты:**
```bash
grep -rln "from '@/types/layout'" src/
sed -i "s|from '@/types/layout'|from '@widgets/canvas'|g" \
  $(grep -rln "from '@/types/layout'" src/)
```

### Шаг 1.5.4 — Внутренние импорты в `widgets/canvas/lib/types.ts`

Если файл импортит `MindMapNode`:

```ts
// Было:
import type { MindMapNode } from './node'

// Стало:
import type { MindMapNode } from '@entities/node'
```

### Шаг 1.5.5 — `NodeImageEmits` → `entities/image/ui/types.ts`

```bash
mkdir -p src/entities/image/ui
git mv src/types/node-image-emits.ts src/entities/image/ui/types.ts
```

**Создать barrel `entities/image/index.ts`:**
```ts
// src/entities/image/index.ts
export type { NodeImageEmits } from './ui/types'
// NodeImage.vue будет добавлен в Phase 2.4.
```

**Заменить импорты:**
```bash
grep -rln "from '@/types/node-image-emits'" src/
sed -i "s|from '@/types/node-image-emits'|from '@entities/image'|g" \
  $(grep -rln "from '@/types/node-image-emits'" src/)
```

### Шаг 1.5.6 — Проверка `src/types/`

После Phase 1.5 в `src/types/` должны остаться только:
- `mindmap-api.ts` (удалится в Phase 4)
- `injection-keys.ts` (переедет в Phase 6)

```bash
ls src/types/
# Ожидается: mindmap-api.ts  injection-keys.ts
```

**Проверка + коммит:**
```bash
npm run typecheck && npm test
```
```
refactor(types): distribute src/types into FSD slices

- MindMapNode + node-constants → entities/node/.
- Layout types (LayoutPosition, NodeDragState, ...) → widgets/canvas/lib/.
- NodeImageEmits → entities/image/ui/.
- Barrel'ы (entities/node, widgets/canvas, entities/image) созданы.
- mindmap-api.ts и injection-keys.ts оставлены до Phase 4 и Phase 6.
```

✅ **Phase 1.5 завершена.** 1 коммит.

---

## 6. Phase 2 — entities/

> 🎯 **Цель:** перенести компоненты узлов и tree-операции в `entities/`.
> Сборка `useMindMap` отложена до Phase 4.

### Шаг 2.1 — `MindNode` + `NodeContent` → `entities/node/ui/`

```bash
mkdir -p src/entities/node/ui
git mv src/components/MindNode.vue    src/entities/node/ui/MindNode.vue
git mv src/components/NodeContent.vue src/entities/node/ui/NodeContent.vue 2>/dev/null
```

**Внутренние импорты в `MindNode.vue`:**
```ts
// Было:
import type { MindMapNode } from '@/types/node'
import { useToggle } from '@/composables/useToggle'
import NodeImage from '@/components/NodeImage.vue'

// Стало:
import type { MindMapNode } from '@entities/node'   // self-reference через barrel — ок
import { useToggle } from '@shared/lib'
import NodeImage from '@/components/NodeImage.vue'  // оставить как есть до Phase 2.4
```

> 💡 Можно использовать relative-импорт для self-reference: `import type { MindMapNode } from '../model/types'`. На вкус — alias или relative.

**Расширить `entities/node/index.ts`:**
```ts
// src/entities/node/index.ts
export type { MindMapNode } from './model/types'
export * from './model/constants'  // если есть
export { default as MindNode } from './ui/MindNode.vue'
export { default as NodeContent } from './ui/NodeContent.vue'  // если есть
```

> 🔍 **Default vs named export:** Vue SFC — это default-export. В barrel переэкспортируем как named (`{ MindNode }`).

**Заменить импорты у потребителей:**

```bash
grep -rln "from '@/components/MindNode" src/
grep -rln "from '@/components/NodeContent" src/
```

> ⚠️ **Замена default → named** — это смена синтаксиса. `sed` не поможет (нужно править `import X from '...'` → `import { X } from '...'`). Делай руками или через IDE rename.

Например:
```ts
// Было:
import MindNode from '@/components/MindNode.vue'

// Стало:
import { MindNode } from '@entities/node'
```

Главные потребители — `MindMapCanvas.vue` (ещё не мигрирован, в `src/components/`).

**Проверка + коммит:**
```bash
npm run typecheck && npm test
```
```
refactor(entities): move MindNode + NodeContent → entities/node/ui

- MindNode.vue, NodeContent.vue → entities/node/ui/.
- Public API: named exports from @entities/node.
- Внутренние импорты переведены на @shared/lib, @entities/node.
- Потребители (MindMapCanvas) обновлены: { MindNode } from '@entities/node'.
```

### Шаг 2.2 — Проверка границ entities/node

После 2.1 структура `entities/node/`:
```
entities/node/
├── ui/
│   ├── MindNode.vue
│   └── NodeContent.vue
├── model/
│   ├── types.ts        # MindMapNode
│   └── constants.ts    # NODE_SCALE (если есть)
└── index.ts
```

**Проверка инвариантов:**
```bash
# 1. Внутри entities/node нет импортов из features/widgets/pages/app:
grep -rn "from '@features" src/entities/node/
grep -rn "from '@widgets"  src/entities/node/
grep -rn "from '@pages"    src/entities/node/
grep -rn "from '@app"      src/entities/node/
# Все 4 команды должны вернуть 0 совпадений.

# 2. entities/node может импортить только из @shared:
grep -rn "from '@shared" src/entities/node/  # ✅ норма
```

> ⚠️ Если что-то нашлось в features/widgets/pages/app — это нарушение слоевой иерархии. Остановись и проанализируй: либо тип неправильно классифицирован, либо архитектура нуждается в пересмотре.

**Коммит:** не нужен (только проверка).

### Шаг 2.3 — `useTreeOperations` → `entities/mindmap/`

> 🔵 Здесь — только tree-операции. `useMindMap.ts` НЕ переносим (он переедет в Phase 4 в `app/store/`).

```bash
mkdir -p src/entities/mindmap/model
git mv src/composables/tree/useTreeOperations.ts src/entities/mindmap/model/useTreeOperations.ts
```

**Если в `src/composables/tree/` остался файл `types.ts`** (после извлечения `MindMapNode` в Phase 2.1) — проверь, что там осталось:

```bash
ls src/composables/tree/
cat src/composables/tree/types.ts  # если файл ещё существует
```

Возможные сценарии:
- **Пусто/осиротело** → `git rm src/composables/tree/types.ts`.
- **Остались типы tree-операций** (`TreeOperationsApi`?) → перенести вместе с composable:

```bash
# Если TreeOperationsApi определён отдельно:
git mv src/composables/tree/types.ts src/entities/mindmap/model/types.ts
```

> 🔍 **Часто `TreeOperationsApi` определён прямо в `useTreeOperations.ts` через `export interface`.** Тогда отдельный `types.ts` не нужен.

**Внутренние импорты в `useTreeOperations.ts`:**
```ts
// Было:
import type { MindMapNode } from './types'           // relative
import { useHistory } from '@/composables/useHistory'

// Стало:
import type { MindMapNode } from '@entities/node'    // через alias
import { useHistory } from '@shared/lib'
```

**Создать `entities/mindmap/index.ts`:**
```ts
// src/entities/mindmap/index.ts
export {
  useTreeOperations,
  type TreeOperationsApi,
} from './model/useTreeOperations'
```

> ⚠️ Если `TreeOperationsApi` определён в отдельном `types.ts` — экспорт оттуда:
> ```ts
> export type { TreeOperationsApi } from './model/types'
> export { useTreeOperations } from './model/useTreeOperations'
> ```

**Заменить импорты у потребителей:**

```bash
grep -rln "from '@/composables/tree/useTreeOperations'" src/
grep -rln "from '@/composables/tree/types'" src/
```

Главный потребитель — `src/composables/useMindMap.ts` (он ещё не переехал).

```bash
sed -i "s|from '@/composables/tree/useTreeOperations'|from '@entities/mindmap'|g" \
  $(grep -rln "from '@/composables/tree/useTreeOperations'" src/)

sed -i "s|from '@/composables/tree/types'|from '@entities/mindmap'|g" \
  $(grep -rln "from '@/composables/tree/types'" src/)
```

**Очистка пустой папки:**
```bash
# Если src/composables/tree/ пуста после переезда:
rmdir src/composables/tree/
```

**Проверка + коммит:**
```bash
npm run typecheck && npm test
```
```
refactor(entities): move useTreeOperations → entities/mindmap

- useTreeOperations + TreeOperationsApi → entities/mindmap/model/.
- entities/mindmap thin by design: только tree-операции над MindMapNode.
- useMindMap (агрегатор) переедет в app/store/ на Phase 4.
- Внутренние импорты переведены на @entities/node, @shared/lib.
```

### Шаг 2.4 — `NodeImage` → `entities/image/`

```bash
# 1) Найти компонент
ls src/components/  # или src/components/image/
find src -name "NodeImage.vue"
```

**Допустим, файл в `src/components/NodeImage.vue`:**

```bash
git mv src/components/NodeImage.vue src/entities/image/ui/NodeImage.vue
```

> 📝 **Файл `entities/image/ui/types.ts`** уже создан в Phase 1.5.5 (`NodeImageEmits`).

**Внутренние импорты в `NodeImage.vue`:**

Скорее всего там:
```ts
import type { NodeImageEmits } from '@/types/node-image-emits'  // уже заменено в 1.5.5 на @entities/image
import { handleImagePaste } from '@/utils/imageHandler'         // уже заменено в 1.4 на @shared/lib
```

**Дополнительные потенциальные правки:**
```ts
// Если есть:
import type { MindMapNode } from '@/composables/tree/types'
// Заменить на:
import type { MindMapNode } from '@entities/node'
```

**Расширить `entities/image/index.ts`:**
```ts
// src/entities/image/index.ts
export type { NodeImageEmits } from './ui/types'
export { default as NodeImage } from './ui/NodeImage.vue'
```

**Заменить импорты у потребителей:**

```bash
grep -rln "from '@/components/NodeImage" src/

# default → named: правь вручную, sed ненадёжен
# import NodeImage from '@/components/NodeImage.vue'
#   →
# import { NodeImage } from '@entities/image'
```

> ⚠️ **Точечные правки руками или через IDE rename.**

**Главный потребитель**: `entities/node/ui/MindNode.vue` — там используется `<NodeImage />`.

```ts
// src/entities/node/ui/MindNode.vue
// Было:
import NodeImage from '@/components/NodeImage.vue'
// Стало:
import { NodeImage } from '@entities/image'
```

**Проверка + коммит:**
```bash
npm run typecheck && npm test && npm run dev  # ручной чек, что картинки рендерятся
```
```
refactor(entities): move NodeImage component → entities/image/ui

- NodeImage.vue → entities/image/ui/.
- Public API: named export from @entities/image.
- Consumers updated (MindNode.vue uses { NodeImage }).
```

✅ **Phase 2 завершена.** 4 коммита (2.1, 2.2, 2.3, 2.4).

---

## 7. Phase 3 — features/

> 🎯 **Цель:** перенести `auto-layout`, `persistence`, `image-gallery` в `features/`.
> Каждая feature независима и может быть мигрирована параллельно. Делаем последовательно для атомарности коммитов.

### Шаг 3.1 — `auto-layout`

```bash
mkdir -p src/features/auto-layout/model
mkdir -p src/features/auto-layout/lib/algorithms
```

**Перенос:**
```bash
# Главный composable
git mv src/composables/layout/useAutoLayout.ts src/features/auto-layout/model/useAutoLayout.ts

# Типы
git mv src/composables/layout/types.ts src/features/auto-layout/lib/types.ts

# Алгоритмы (массовый перенос)
git mv src/composables/layout/algorithms/* src/features/auto-layout/lib/algorithms/
```

**Очистка:**
```bash
# Если src/composables/layout/ пуста:
rmdir src/composables/layout/algorithms/ 2>/dev/null
rmdir src/composables/layout/ 2>/dev/null
```

**Внутренние импорты в `useAutoLayout.ts`:**
```ts
// Было:
import type { LayoutType, LayoutFn, LayoutPositions } from './types'
import { compactLayout } from './algorithms/compact'
// ...

// Стало (relative-импорты внутри slice — норма):
import type { LayoutType, LayoutFn, LayoutPositions } from '../lib/types'
import { compactLayout } from '../lib/algorithms/compact'
// ...

// Или через barrel (если создашь lib/algorithms/index.ts):
import { compactLayout, mindmapLayout, /* ... */ } from '../lib/algorithms'
```

**Внутренние импорты в `lib/types.ts`:**
```ts
// Если там есть импорты MindMapNode:
import type { MindMapNode } from '@entities/node'
```

**Создать `features/auto-layout/index.ts`:**
```ts
// src/features/auto-layout/index.ts
export { useAutoLayout } from './model/useAutoLayout'
export type {
  LayoutType,
  LayoutFn,
  LayoutPositions,
  LayoutDescriptor,
} from './lib/types'
```

> 🔍 **Решение:** алгоритмы (`compactLayout`, etc.) НЕ экспортируются наружу. Они — внутренняя деталь реализации. Наружу торчит только `useAutoLayout` + типы.

**Заменить импорты у потребителей:**

```bash
grep -rln "from '@/composables/layout/useAutoLayout'" src/
grep -rln "from '@/composables/layout/types'" src/
grep -rln "from '@/composables/layout/algorithms" src/
```

```bash
# Главный потребитель — useMindMap.ts (ещё не мигрирован, в src/composables/)
sed -i "s|from '@/composables/layout/useAutoLayout'|from '@features/auto-layout'|g" \
  $(grep -rln "from '@/composables/layout/useAutoLayout'" src/)

sed -i "s|from '@/composables/layout/types'|from '@features/auto-layout'|g" \
  $(grep -rln "from '@/composables/layout/types'" src/)
```

> ⚠️ **Важно:** если кто-то импортит конкретный алгоритм напрямую (`from '@/composables/layout/algorithms/compact'`) — это **нарушение инкапсуляции**. Найди и переведи на использование `useAutoLayout()`. Если действительно нужен прямой доступ — экспортируй из `features/auto-layout/index.ts` явно.

**Проверка + коммит:**
```bash
npm run typecheck && npm test
```
```
refactor(features): extract auto-layout → features/auto-layout

- useAutoLayout, LayoutType, LayoutFn, LayoutPositions, LayoutDescriptor → features/auto-layout/.
- Algorithms (compact, mindmap, radial, spacious, treeDown, treeRight) → lib/algorithms/.
- Алгоритмы инкапсулированы — не экспортируются из public API.
- Public API: useAutoLayout + типы LayoutType/LayoutFn/LayoutPositions/LayoutDescriptor.
```

### Шаг 3.2 — `persistence`

```bash
mkdir -p src/features/persistence/model
mkdir -p src/features/persistence/lib
```

**Перенос:**
```bash
git mv src/composables/persistence/usePersistence.ts src/features/persistence/model/usePersistence.ts

# Утилиты экспорта (если они отдельные)
find src/composables/persistence/ -type f
# Например:
git mv src/composables/persistence/exportPng.ts  src/features/persistence/lib/exportPng.ts
git mv src/composables/persistence/exportJson.ts src/features/persistence/lib/exportJson.ts
```

**Очистка:**
```bash
rmdir src/composables/persistence/ 2>/dev/null
```

**Внутренние импорты:**
```ts
// usePersistence.ts:
// Было:
import { exportToPng } from './exportPng'
// Стало:
import { exportToPng } from '../lib/exportPng'

// Если импортит MindMapNode:
import type { MindMapNode } from '@entities/node'
```

**Создать `features/persistence/index.ts`:**
```ts
// src/features/persistence/index.ts
export {
  usePersistence,
  type PersistenceApi,
  type ExportFormat,
} from './model/usePersistence'
```

> 🔍 `exportPng`, `exportJson` — внутренние helpers, наружу не торчат.

**Заменить импорты у потребителей:**
```bash
grep -rln "from '@/composables/persistence" src/

sed -i "s|from '@/composables/persistence/usePersistence'|from '@features/persistence'|g" \
  $(grep -rln "from '@/composables/persistence/usePersistence'" src/)
```

**Проверка + коммит:**
```bash
npm run typecheck && npm test
```
```
refactor(features): extract persistence → features/persistence

- usePersistence + types (PersistenceApi, ExportFormat) → features/persistence/model/.
- Export helpers (exportPng, exportJson) → lib/, инкапсулированы.
- Public API: usePersistence + PersistenceApi + ExportFormat.
```

### Шаг 3.3 — `image-gallery`

> 🎯 Самая «пухлая» feature: composables + UI-компонент `ImageGallery.vue`.

```bash
mkdir -p src/features/image-gallery/model
mkdir -p src/features/image-gallery/ui
```

**Перенос composables:**
```bash
git mv src/composables/image/useImageStorage.ts      src/features/image-gallery/model/useImageStorage.ts
git mv src/composables/image/useSegmentOperations.ts src/features/image-gallery/model/useSegmentOperations.ts
```

**Перенос UI:**
```bash
# Найти ImageGallery.vue
find src -name "ImageGallery.vue"
# Допустим: src/components/ImageGallery.vue

git mv src/components/ImageGallery.vue src/features/image-gallery/ui/ImageGallery.vue
```

**Очистка:**
```bash
rmdir src/composables/image/ 2>/dev/null
```

**Внутренние импорты в composables:**
```ts
// useImageStorage.ts:
import type { MindMapNode } from '@entities/node'

// useSegmentOperations.ts:
import { useImageStorage } from './useImageStorage'  // relative — OK
import type { MindMapNode } from '@entities/node'
```

**Внутренние импорты в `ImageGallery.vue`:**
```ts
import { useImageStorage } from '../model/useImageStorage'
// или через локальный barrel — если создашь features/image-gallery/model/index.ts
```

> 🤔 **Стиль:** внутри одного слайса допустимы и relative, и через alias. Я предпочитаю **relative для близких файлов** (model ↔ ui в одном feature) и **alias для cross-slice**. Не настаиваю — выбирай как удобнее.

**Создать `features/image-gallery/index.ts`:**
```ts
// src/features/image-gallery/index.ts
export {
  useImageStorage,
  type ImageStorageApi,
  type ResolvedImage,
} from './model/useImageStorage'

export {
  useSegmentOperations,
  type SegmentOperationsApi,
} from './model/useSegmentOperations'

export { default as ImageGallery } from './ui/ImageGallery.vue'
```

**Заменить импорты у потребителей:**

```bash
grep -rln "from '@/composables/image" src/
grep -rln "from '@/components/ImageGallery" src/
```

```bash
sed -i "s|from '@/composables/image/useImageStorage'|from '@features/image-gallery'|g" \
  $(grep -rln "from '@/composables/image/useImageStorage'" src/)

sed -i "s|from '@/composables/image/useSegmentOperations'|from '@features/image-gallery'|g" \
  $(grep -rln "from '@/composables/image/useSegmentOperations'" src/)

# ImageGallery.vue: default → named — правь вручную
```

**Проверка + коммит:**
```bash
npm run typecheck && npm test && npm run dev  # ручной чек: галерея картинок открывается
```
```
refactor(features): extract image-gallery → features/image-gallery

- useImageStorage + ImageStorageApi + ResolvedImage → features/image-gallery/model/.
- useSegmentOperations + SegmentOperationsApi → features/image-gallery/model/.
- ImageGallery.vue → features/image-gallery/ui/.
- Public API: 2 composables + 1 component + типы.
```

✅ **Phase 3 завершена.** 3 коммита (3.1, 3.2, 3.3).

---

### 📊 Промежуточный итог

После Phase 3 структура:

```
src/
├── app/                    ← пусто (заполним в Phase 4–6)
├── entities/
│   ├── node/        ✅
│   ├── mindmap/     ✅ (тонкая: только useTreeOperations)
│   └── image/       ✅
├── features/
│   ├── auto-layout/    ✅
│   ├── persistence/    ✅
│   └── image-gallery/  ✅
├── shared/
│   └── lib/         ✅
│
├── composables/            ← должна остаться только useMindMap.ts
├── components/             ← остались widgets-уровня компоненты (Toolbar, MindMapCanvas, etc.)
├── types/                  ← остался mindmap-api.ts (удалится в Phase 4) + injection-keys.ts (Phase 6)
└── ...
```

**Готовность миграции: ~55%.**

**Зелёный CI:** обязательно после каждого из 3 коммитов Phase 3.

---

## 8. Phase 4 — app/store/useMindMap.ts

> 🎯 **Кульминация.** Здесь происходит:
> 1. Перенос `useMindMap.ts` в `app/store/`.
> 2. **Inline-определение** `MindMapApi` (удаление зависимости от `src/types/mindmap-api.ts`).
> 3. Удаление файла `src/types/mindmap-api.ts`.
> 4. Применение параметризованного `useHistory(state, { maxSize })`.

### Шаг 4.1 — Создать `app/store/` и перенести файл

```bash
mkdir -p src/app/store
git mv src/composables/useMindMap.ts src/app/store/useMindMap.ts
```

### Шаг 4.2 — Inline `MindMapApi` + правка импортов

**Открыть `src/app/store/useMindMap.ts` и привести к виду:**

```ts
import { ref, computed, type Ref, type ComputedRef } from 'vue'

// shared
import { useHistory, type HistoryApi } from '@shared/lib'

// entities
import type { MindMapNode } from '@entities/node'
import {
  useTreeOperations,
  type TreeOperationsApi,
} from '@entities/mindmap'

// features
import {
  useImageStorage,
  useSegmentOperations,
  type ImageStorageApi,
  type SegmentOperationsApi,
  type ResolvedImage,
} from '@features/image-gallery'
import {
  usePersistence,
  type PersistenceApi,
  type ExportFormat,
} from '@features/persistence'

// ─── Local constants ──────────────────────────────
const MAX_HISTORY = 50

// ─── Public API ───────────────────────────────────
export interface MindMapApi
  extends TreeOperationsApi,
          PersistenceApi,
          SegmentOperationsApi {
  rootNode: Ref<MindMapNode>
  undo: HistoryApi['undo']
  redo: HistoryApi['redo']
  canUndo: HistoryApi['canUndo']
  canRedo: HistoryApi['canRedo']
  resetToDefault: () => void
  nodeCount: ComputedRef<number>
  treeDepth: ComputedRef<number>
  unusedImageCount: ComputedRef<number>
  imageStorage: ImageStorageApi
}

// Re-export для удобства (опционально):
export type { ResolvedImage, ExportFormat }

export function useMindMap(): MindMapApi {
  // ... существующая реализация ...

  // ⚠️ Применить новый API useHistory:
  const history = useHistory<MindMapNode>(rootNode, { maxSize: MAX_HISTORY })

  // ... остальное без изменений ...

  return {
    rootNode,
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    resetToDefault,
        nodeCount,
    treeDepth,
    unusedImageCount,
    imageStorage,
    ...treeOps,
    ...persistence,
    ...segmentOps,
  }
}
```

> 🔍 **Что важно проверить:**
> - Удалён `import type { MindMapApi } from '@/types/mindmap-api'`.
> - `MindMapApi` определён локально через `export interface`.
> - `useHistory` вызывается с новым API: `useHistory<T>(state, { maxSize })`.
> - Все остальные импорты — через alias (`@shared`, `@entities`, `@features`).

### Шаг 4.3 — Удалить `src/types/mindmap-api.ts`

```bash
# Перед удалением: убедись, что никто не импортит этот файл
grep -rn "from '@/types/mindmap-api'" src/
# Должно быть 0 совпадений (useMindMap был последним потребителем)

git rm src/types/mindmap-api.ts
```

### Шаг 4.4 — Создать barrel `app/store/index.ts`

```ts
// src/app/store/index.ts
export { useMindMap, type MindMapApi } from './useMindMap'
export type { ResolvedImage, ExportFormat } from './useMindMap'
```

### Шаг 4.5 — Заменить импорты у потребителей `useMindMap` / `MindMapApi`

```bash
grep -rn "from '@/composables/useMindMap'" src/
grep -rn "MindMapApi" src/
```

**Главные потребители:**
- `App.vue` (вызов `useMindMap()` + `provide(...)`) — переедет в Phase 6.
- `injection-keys.ts` (тип `InjectionKey<MindMapApi>`) — переедет в Phase 6.
- Возможно, тесты.

```bash
# Замена импорта useMindMap:
sed -i "s|from '@/composables/useMindMap'|from '@app/store'|g" \
  $(grep -rln "from '@/composables/useMindMap'" src/)
```

**Для `MindMapApi`:** старый путь `'@/types/mindmap-api'` уже невалиден (файл удалён). Все потребители должны импортить из `@app/store`:

```bash
sed -i "s|from '@/types/mindmap-api'|from '@app/store'|g" \
  $(grep -rln "from '@/types/mindmap-api'" src/)
```

> ⚠️ Обычно sed ничего не найдёт — мы удалили файл и все импорты на 4.3. Это страховка.

### Шаг 4.6 — Очистка пустой директории

```bash
ls src/composables/  # должна быть пустой
rmdir src/composables/ 2>/dev/null
```

**Проверка + коммит:**
```bash
npm run typecheck && npm test && npm run build && npm run dev
```

> ⚠️ **Ручная проверка обязательна:** запусти dev-server, проверь:
> - Mind-map рендерится.
> - Undo/redo работают (история ≤ 50 шагов).
> - Все features (auto-layout, export, image-gallery) функционируют.

**Коммит:**
```
refactor(app): assemble useMindMap as app-level store

- Moved: src/composables/useMindMap.ts → src/app/store/useMindMap.ts.
- Inlined MindMapApi (removed src/types/mindmap-api.ts dead indirection).
- Applied parametrized useHistory(state, { maxSize: MAX_HISTORY }).
- Public API: src/app/store/index.ts re-exports useMindMap + MindMapApi.
- Все потребители переведены на @app/store.
- src/composables/ удалён (пуст).
```

✅ **Phase 4 завершена.** 1 коммит (большой, но атомарный).

---

## 9. Phase 5 — widgets слой

> 🎯 **Цель:** перенести `MindMapCanvas`, `Toolbar`, `NoteEditor` в `widgets/`.
> Это композиционный слой: widgets зависят от entities + features + shared.

### Шаг 5.1 — `widgets/canvas/`

> 📝 **Папка `widgets/canvas/lib/types.ts` уже создана** в Phase 1.5.3 (с `LayoutPosition`, `LayoutBounds`, `NodeDragState`, etc.).

```bash
mkdir -p src/widgets/canvas/ui
mkdir -p src/widgets/canvas/model
```

**Перенос UI:**
```bash
# Главный компонент
git mv src/components/MindMapCanvas.vue src/widgets/canvas/ui/MindMapCanvas.vue

# Связанные компоненты канваса (если есть отдельные)
find src/components -name "ConnectionLayer*"
git mv src/components/ConnectionLayer.vue src/widgets/canvas/ui/ConnectionLayer.vue 2>/dev/null

# Любые другие компоненты, которые относятся к канвасу
# (свайпом по src/components/ — реши, какие сюда)
```

**Перенос model:**
```bash
# Composables, которые управляют поведением канваса
git mv src/composables/useLayout.ts        src/widgets/canvas/model/useLayout.ts        2>/dev/null
git mv src/composables/useConnections.ts   src/widgets/canvas/model/useConnections.ts   2>/dev/null
git mv src/composables/useViewport.ts      src/widgets/canvas/model/useViewport.ts      2>/dev/null
git mv src/composables/usePanZoom.ts       src/widgets/canvas/model/usePanZoom.ts       2>/dev/null
git mv src/composables/useNodeDrag.ts      src/widgets/canvas/model/useNodeDrag.ts      2>/dev/null
git mv src/composables/useNodeScale.ts     src/widgets/canvas/model/useNodeScale.ts     2>/dev/null
```

> ⚠️ **Названия гипотетические.** Проверь, какие composables реально есть, и распредели их:
> - **canvas-специфичные** (рендеринг, viewport, drag, zoom) → `widgets/canvas/model/`.
> - **общеприкладные** (если такие остались) → `shared/lib/`.

**Внутренние импорты в `MindMapCanvas.vue`:**
```ts
// Было:
import MindNode from '@/components/MindNode.vue'
import { useLayout } from '@/composables/useLayout'
import type { LayoutPosition } from '@/types/layout'

// Стало:
import { MindNode } from '@entities/node'
import { useLayout } from '../model/useLayout'         // relative внутри слайса
import type { LayoutPosition } from '../lib/types'
import { useAutoLayout } from '@features/auto-layout'  // если используется
```

**Расширить `widgets/canvas/index.ts`:**
```ts
// src/widgets/canvas/index.ts
export { default as MindMapCanvas } from './ui/MindMapCanvas.vue'

// Re-export типов (уже было из Phase 1.5):
export type {
  LayoutPosition,
  LayoutBounds,
  LayoutData,
  PositionMap,
  NodeDragState,
  NodeDragEmits,
} from './lib/types'

// Composables НЕ экспортируем — это внутренняя кухня widget'а.
```

> 🔍 **Принцип:** widget наружу даёт **только компонент**. Все его hooks — внутренняя реализация.

**Заменить импорт `MindMapCanvas` у потребителей:**

```bash
grep -rln "from '@/components/MindMapCanvas" src/
# Главный потребитель — App.vue (ещё не переехал)

# default → named: правь руками
# import MindMapCanvas from '@/components/MindMapCanvas.vue'
#   →
# import { MindMapCanvas } from '@widgets/canvas'
```

**Проверка + коммит:**
```bash
npm run typecheck && npm test && npm run dev
# Ручная проверка: канвас рендерится, drag/zoom/pan работают.
```
```
refactor(widgets): assemble canvas widget

- MindMapCanvas.vue + связанные компоненты (ConnectionLayer, …) → widgets/canvas/ui/.
- Composables (useLayout, useConnections, useViewport, usePanZoom, useNodeDrag, useNodeScale) → widgets/canvas/model/.
- Public API: { MindMapCanvas } + типы рендеринга (LayoutPosition, NodeDragState, …).
- Composables инкапсулированы внутри widget'а.
```

### Шаг 5.2 — `widgets/toolbar/`

```bash
mkdir -p src/widgets/toolbar/ui
```

**Перенос:**
```bash
git mv src/components/Toolbar.vue        src/widgets/toolbar/ui/Toolbar.vue
git mv src/components/LayoutSelector.vue src/widgets/toolbar/ui/LayoutSelector.vue 2>/dev/null
# Любые UI-кнопки/селекторы, относящиеся к панели инструментов
```

**Внутренние импорты в `Toolbar.vue`:**
```ts
// Было:
import { inject } from 'vue'
import { mindMapKey } from '@/types/injection-keys'
import LayoutSelector from './LayoutSelector.vue'

// Стало:
import { inject } from 'vue'
import { mindMapKey } from '@app/providers/keys'  // переедет в Phase 6
// На Phase 5 ещё import { mindMapKey } from '@/types/injection-keys' — поправим в Phase 6
import LayoutSelector from './LayoutSelector.vue'

// Если использует типы layout:
import type { LayoutType } from '@features/auto-layout'
```

> ⚠️ На Phase 5 `injection-keys.ts` ещё в `src/types/`. Импорт оставляем как есть, поправим в Phase 6.

**Создать `widgets/toolbar/index.ts`:**
```ts
// src/widgets/toolbar/index.ts
export { default as Toolbar } from './ui/Toolbar.vue'
```

**Заменить импорт `Toolbar` у потребителей:**

```bash
grep -rln "from '@/components/Toolbar" src/
# Главный потребитель — App.vue
```

Правки руками: `import Toolbar from '@/components/Toolbar.vue'` → `import { Toolbar } from '@widgets/toolbar'`.

**Проверка + коммит:**
```bash
npm run typecheck && npm test && npm run dev
# Ручная проверка: тулбар рендерится, кнопки работают.
```
```
refactor(widgets): assemble toolbar widget

- Toolbar.vue + LayoutSelector.vue → widgets/toolbar/ui/.
- Public API: { Toolbar }.
```

### Шаг 5.3 — `widgets/note-editor/`

> 🤔 **Открытый вопрос:** есть ли в проекте отдельный `NoteEditor`? Если нет — пропусти этот шаг.

```bash
find src -name "NoteEditor*" -o -name "useMarkdown*"
```

**Если есть:**
```bash
mkdir -p src/widgets/note-editor/ui
mkdir -p src/widgets/note-editor/model

git mv src/components/NoteEditor.vue   src/widgets/note-editor/ui/NoteEditor.vue
git mv src/composables/useMarkdown.ts  src/widgets/note-editor/model/useMarkdown.ts 2>/dev/null
```

**Внутренние импорты:**
```ts
// useMarkdown.ts может использовать hljs:
import hljs from '@shared/lib'
```

**Создать `widgets/note-editor/index.ts`:**
```ts
export { default as NoteEditor } from './ui/NoteEditor.vue'
```

**Заменить импорт у потребителей** + правки руками.

**Проверка + коммит:**
```
refactor(widgets): assemble note-editor widget

- NoteEditor.vue + useMarkdown.ts → widgets/note-editor/.
- Public API: { NoteEditor }.
```

> 🔵 Если в проекте нет такого widget'а — пропусти. Документируй в PR-описании: «note-editor отсутствует, шаг пропущен».

✅ **Phase 5 завершена.** 2–3 коммита.

---

## 10. Phase 6 — pages + app finalization

> 🎯 **Цель:** разделить `App.vue` на `App.vue` (инициализация) + `MindMapPage.vue` (страница). Финализировать `app/`-слой.

### Шаг 6.1 — Перенести `injection-keys.ts` → `app/providers/keys.ts`

```bash
mkdir -p src/app/providers
git mv src/types/injection-keys.ts src/app/providers/keys.ts
```

**Внутри `keys.ts`:**
```ts
import type { InjectionKey } from 'vue'
import type { MindMapApi } from '@app/store'

export const mindMapKey: InjectionKey<MindMapApi> = Symbol('mindMapKey')

// Если есть другие injection keys — оставить здесь же:
// export const themeKey: InjectionKey<ThemeApi> = Symbol('themeKey')
```

**Заменить импорты:**
```bash
grep -rln "from '@/types/injection-keys'" src/

sed -i "s|from '@/types/injection-keys'|from '@app/providers/keys'|g" \
  $(grep -rln "from '@/types/injection-keys'" src/)
```

**Очистка `src/types/`:**
```bash
ls src/types/  # должна быть пустой
rmdir src/types/ 2>/dev/null
```

**Коммит:**
```
refactor(app): move injection-keys → app/providers/keys

- src/types/injection-keys.ts → src/app/providers/keys.ts.
- Импорт MindMapApi через @app/store.
- src/types/ удалена (пуста).
```

### Шаг 6.2 — Создать `pages/mindmap/`

```bash
mkdir -p src/pages/mindmap/ui
```

**Создать `MindMapPage.vue`** — извлечь UI из текущего `App.vue`:

**Текущий `App.vue` (предположительно):**
```vue
<script setup lang="ts">
import { provide } from 'vue'
import { useMindMap } from '@app/store'
import { useTheme } from '@shared/lib'
import { mindMapKey } from '@app/providers/keys'
import { MindMapCanvas } from '@widgets/canvas'
import { Toolbar } from '@widgets/toolbar'

const mindmap = useMindMap()
provide(mindMapKey, mindmap)

useTheme()  // инициализация темы
</script>

<template>
  <div class="app">
    <Toolbar />
    <MindMapCanvas />
  </div>
</template>
```

**Разделить на:**

**`src/pages/mindmap/ui/MindMapPage.vue`** (UI-композиция страницы):
```vue
<script setup lang="ts">
import { MindMapCanvas } from '@widgets/canvas'
import { Toolbar } from '@widgets/toolbar'
// Если есть NoteEditor: import { NoteEditor } from '@widgets/note-editor'
</script>

<template>
  <div class="mindmap-page">
    <Toolbar />
    <MindMapCanvas />
    <!-- <NoteEditor /> если есть -->
  </div>
</template>

<style scoped>
.mindmap-page {
  /* стили страницы — перенести из App.vue */
}
</style>
```

**`src/pages/mindmap/index.ts`:**
```ts
export { default as MindMapPage } from './ui/MindMapPage.vue'
```

**`src/app/App.vue`** (инициализация — становится тонким):
```vue
<script setup lang="ts">
import { provide } from 'vue'
import { useMindMap } from '@app/store'
import { useTheme } from '@shared/lib'
import { mindMapKey } from '@app/providers/keys'
import { MindMapPage } from '@pages/mindmap'

// Глобальная инициализация
const mindmap = useMindMap()
provide(mindMapKey, mindmap)

useTheme()  // ⚠️ корректное место — на app-уровне (решение Q3)
</script>

<template>
  <MindMapPage />
</template>
```

> 🔍 **Граница ответственности:**
> - `App.vue` — `provide()`, инициализация темы, persistence-load (если есть).
> - `MindMapPage.vue` — только UI-композиция.

### Шаг 6.3 — Перенести `App.vue` физически в `src/app/`

```bash
git mv src/App.vue src/app/App.vue
```

**Обновить `src/main.ts`:**
```ts
// src/main.ts
import { createApp } from 'vue'
import App from '@app/App.vue'  // ← обновить путь
import './app/styles/global.css' // если CSS перенесён (см. ниже)

createApp(App).mount('#app')
```

> 🤔 **CSS:** если в проекте есть глобальные стили (`src/style.css`, `src/assets/main.css`):
> ```bash
> mkdir -p src/app/styles
> git mv src/style.css src/app/styles/global.css 2>/dev/null
> # Обновить импорт в main.ts
> ```

### Шаг 6.4 — Перенести `main.ts` (опционально)

> 🤔 **Решение:** `main.ts` оставить в корне `src/` или перенести в `src/app/`?
> - 🅰️ **В корне** (`src/main.ts`) — стандарт Vite, `index.html` на него ссылается.
> - 🅱️ **В `src/app/main.ts`** — формально чище, но требует правки `index.html`.
>
> **Рекомендация: 🅰️.** Не трогать. `main.ts` — это entrypoint Vite, его место — корень `src/`.

**Проверка + коммит:**
```bash
npm run typecheck && npm test && npm run build && npm run dev
# Ручная проверка: всё приложение работает end-to-end.
```
```
refactor(app, pages): split App.vue into app-init + page UI

- src/App.vue → src/app/App.vue (тонкий: provide + theme init).
- Создан src/pages/mindmap/ui/MindMapPage.vue (композиция widgets).
- main.ts обновлён: import App from '@app/App.vue'.
- useTheme() остался в App.vue (Q3 → app-level scope).
```

✅ **Phase 6 завершена.** 2 коммита.

---

## 11. Phase 7 — final cleanup

> 🎯 **Цель:** удалить устаревшие alias'ы, проверить отсутствие мёртвых файлов, обновить документацию.

### Шаг 7.1 — Удалить старый alias `@/*`

**В `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "paths": {
      // УДАЛИТЬ: "@/*": ["./src/*"],
      "@app/*":      ["./src/app/*"],
      "@pages/*":    ["./src/pages/*"],
      "@widgets/*":  ["./src/widgets/*"],
      "@features/*": ["./src/features/*"],
      "@entities/*": ["./src/entities/*"],
      "@shared/*":   ["./src/shared/*"]
    }
  }
}
```

**В `vite.config.ts`** — аналогично, удалить `'@'`.

**Проверка:**
```bash
grep -rn "from '@/" src/
# Должно быть 0 совпадений. Если есть — заменить вручную.
```

**Коммит:**
```
chore: remove legacy @/* path alias

Все импорты переведены на FSD-aliases (@app, @pages, @widgets, @features, @entities, @shared).
```

### Шаг 7.2 — Проверка пустых директорий

```bash
find src -type d -empty
# Должно быть пусто. Если что-то нашлось:
find src -type d -empty -delete
```

### Шаг 7.3 — Обновить README/документацию

В `README.md` (или создать `docs/ARCHITECTURE.md`) добавить:

```markdown
## Архитектура

Проект использует **Feature-Sliced Design (FSD)** в адаптированной форме.

### Слои (сверху вниз)

| Слой       | Содержимое                                      | Может зависеть от                |
|------------|-------------------------------------------------|----------------------------------|
| `app/`     | Инициализация, store, provide(), глобальные стили | всех нижних                    |
| `pages/`   | Композиция widgets в страницы                   | widgets, features, entities, shared |
| `widgets/` | Самостоятельные UI-блоки (canvas, toolbar)      | features, entities, shared       |
| `features/`| Пользовательские сценарии (auto-layout, export) | entities, shared                 |
| `entities/`| Доменные сущности (node, mindmap, image)        | shared                           |
| `shared/`  | Утилиты, библиотеки, константы                  | —                                |

### Структура слайса

```
<layer>/<slice>/
├── ui/         # Vue-компоненты
├── model/      # composables, store, бизнес-логика
├── lib/        # вспомогательные утилиты, типы
└── index.ts    # public API (только то, что торчит наружу)
```

### Правила импортов

- Импорт между слайсами — **только через `index.ts`** (alias).
- Внутри слайса допустимы relative-импорты.
- Cross-import между слайсами одного слоя **нежелателен** (если возникает — вынести общее в нижний слой).

### Aliases

```ts
@app/*       → src/app/*
@pages/*     → src/pages/*
@widgets/*   → src/widgets/*
@features/*  → src/features/*
@entities/*  → src/entities/*
@shared/*    → src/shared/*
```

### Где живёт `MindMapApi`?

`MindMapApi` определён inline в `src/app/store/useMindMap.ts` и реэкспортируется
из `@app/store`. Это — public API глобального store приложения.
```

### Шаг 7.4 — (Опционально) ESLint-правило для слоевой иерархии

Если используется ESLint, добавить плагин `eslint-plugin-boundaries`:

```bash
npm i -D eslint-plugin-boundaries
```

**`.eslintrc.cjs`:**
```js
module.exports = {
  plugins: ['boundaries'],
  settings: {
    'boundaries/elements': [
      { type: 'app',      pattern: 'src/app/*' },
      { type: 'pages',    pattern: 'src/pages/*' },
      { type: 'widgets',  pattern: 'src/widgets/*' },
      { type: 'features', pattern: 'src/features/*' },
      { type: 'entities', pattern: 'src/entities/*' },
      { type: 'shared',   pattern: 'src/shared/*' },
    ],
  },
  rules: {
    'boundaries/element-types': ['error', {
      default: 'disallow',
      rules: [
        { from: 'app',      allow: ['pages', 'widgets',
```