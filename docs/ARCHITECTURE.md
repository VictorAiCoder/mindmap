# Architecture — Mind Map App

> **Подход:** Feature-Sliced Design (FSD) v2.1, каноничный.
> **Stack:** Vue 3 + TypeScript + Vite. State: composables + provide/inject (без Pinia).
> **Документация FSD:** https://feature-sliced.design/

---

## 🏛️ Слои (сверху вниз)

| Слой | Назначение | Импорт из |
|------|-----------|-----------|
| `app` | Инициализация, провайдеры, корневой `App.vue`, темизация | всех нижележащих |
| `pages` | Страницы — компоновка виджетов | `widgets`, `features`, `entities`, `shared` |
| `widgets` | Композитные блоки UI: холст, тулбар, панели | `features`, `entities`, `shared` |
| `features` | Действия пользователя | `entities`, `shared` |
| `entities` | Бизнес-сущности | `shared` |
| `shared` | Переиспользуемое без бизнес-смысла | — (только npm) |

**Железное правило:** импорт только сверху вниз. Низший слой **не знает** о вышестоящих.

---

## 📂 Структура слайса

```
slice/
├── index.ts        ← Public API — единственная точка импорта снаружи
├── model/          ← state, types, composables, бизнес-логика
├── ui/             ← Vue-компоненты
├── lib/            ← вспомогательное, специфичное для слайса
└── api/            ← внешние интеграции (если нужно)
```

**Public API:**
```ts
import { useMindMap } from '@entities/mindmap'                 // ✅
import { useMindMap } from '@entities/mindmap/model/useMindMap' // ❌ запрещено
```

---

## 🗺️ Карта проекта

```
src/
├── app/
│   ├── App.vue
│   ├── main.ts
│   └── providers/
│       └── injectionKeys.ts
│
├── pages/
│   └── mindmap/
│       ├── index.ts
│       └── ui/
│           └── MindMapPage.vue
│
├── widgets/
│   ├── canvas/
│   │   ├── index.ts
│   │   ├── model/
│   │   │   ├── usePanZoom.ts
│   │   │   └── useConnections.ts
│   │   ├── ui/
│   │   │   ├── MindMapCanvas.vue
│   │   │   ├── CanvasControls.vue
│   │   │   └── DragHint.vue
│   │   └── __tests__/
│   │       └── useConnections.spec.ts
│   │
│   ├── toolbar/
│   │   ├── index.ts
│   │   └── ui/
│   │       └── ToolbarPanel.vue
│   │
│   ├── notes-panel/
│   │   ├── index.ts
│   │   ├── model/
│   │   │   └── useMarkdown.ts
│   │   ├── lib/
│   │   │   └── hljs.ts
│   │   └── ui/
│   │       ├── NotesPanel.vue
│   │       └── NotesToolbar.vue
│   │
│   └── image-gallery/
│       ├── index.ts
│       └── ui/
│           ├── ImageGalleryPanel.vue
│           ├── ImageGalleryCard.vue
│           ├── ImagePreview.vue
│           ├── SegmentEditorPanel.vue
│           └── SegmentCanvas.vue
│
├── features/
│   ├── node-drag/
│   │   ├── index.ts
│   │   └── model/
│   │       ├── useNodeDrag.ts
│   │       └── types.ts
│   │
│   ├── node-actions/
│   │   ├── index.ts
│   │   ├── model/
│   │   │   └── useNodeMenu.ts
│   │   └── ui/
│   │       ├── NodeActions.vue
│   │       └── NodeActionsMenu.vue
│   │
│   ├── node-image/                  ← NEW: drop файла/карточки на узел
│   │   ├── index.ts
│   │   └── model/
│   │       └── useNodeImage.ts
│   │
│   ├── auto-layout/
│   │   ├── index.ts
│   │   └── model/
│   │       ├── useLayout.ts
│   │       ├── useAutoLayout.ts
│   │       └── types.ts            ← LayoutPosition, LayoutData
│   │
│   ├── image-gallery/
│   │   ├── index.ts
│   │   └── model/
│   │       ├── useImageHandler.ts  ← если не уйдёт в shared (см. примечание)
│   │       ├── useSegmentEditor.ts
│   │       └── useSegmentOperations.ts
│   │
│   ├── notes/
│   │   ├── index.ts
│   │   └── ui/
│   │       └── NodeNotesPreview.vue
│   │
│   └── persistence/
│       ├── index.ts
│       ├── model/
│       │   └── usePersistence.ts
│       ├── lib/
│       │   ├── exportMarkdown.ts
│       │   └── importMarkdown.ts
│       └── ui/
│           ├── ImportMarkdownDialog.vue
│           └── ImportMarkdownHost.vue
│
├── entities/
│   ├── mindmap/
│   │   ├── index.ts
│   │   ├── model/
│   │   │   ├── types.ts            ← MindMapDocument, MindMapApi
│   │   │   ├── useMindMap.ts       ← главный композибл-владелец state
│   │   │   ├── useTreeOperations.ts
│   │   │   ├── useTreeTraversal.ts
│   │   │   ├── useNodeFactory.ts
│   │   │   └── constants.ts
│   │   └── lib/
│   │
│   ├── node/
│   │   ├── index.ts
│   │   ├── model/
│   │   │   ├── types.ts            ← MindMapNode, ScenePosition, Center2D
│   │   │   ├── useNodeDisplay.ts
│   │   │   ├── useNodeScale.ts     ← computeEffectiveScale + composable
│   │   │   └── constants.ts        ← NODE_SCALE и др.
│   │   └── ui/
│   │       ├── MapNode.vue         ← с slots для actions/image/notes
│   │       └── NodeContent.vue
│   │
│   └── image/
│       ├── index.ts
│       ├── model/
│       │   ├── types.ts            ← Clip, RawImage, ImageSegment, StoredImage
│       │   └── useImageStorage.ts
│       └── ui/
│           └── NodeImage.vue
│
└── shared/
    ├── lib/
    │   ├── bezier.ts
    │   ├── injectStrict.ts
    │   ├── history/
    │   │   └── useHistory.ts       ← generic <T>, не знает о mindmap
    │   ├── layout/                 ← чистые алгоритмы
    │   │   ├── compact.ts
    │   │   ├── mindmap.ts
    │   │   ├── radial.ts
    │   │   ├── spacious.ts
    │   │   ├── treeDown.ts
    │   │   ├── treeRight.ts
    │   │   └── utils.ts
    │   └── __tests__/
    │       └── bezier.spec.ts
    ├── ui/                         ← UI-kit (зарезервировано)
    ├── composables/
    │   └── useTheme.ts
    └── config/                     ← (зарезервировано)
```

---

## 🔑 Ключевые решения

### 1. `entities/mindmap` — владелец главного state (без Pinia)

`useMindMap` — корневой композибл документа. Регистрируется в `app/App.vue`, `provide`-ится через ключи из `app/providers/injectionKeys.ts`. Все слайсы получают API через `inject` (с обёрткой `injectStrict` из `shared/lib`).

### 2. `useHistory` → `shared/lib/history/`

`useHistory<T>` — это **generic composable** для undo/redo. Он не знает о домене mindmap. Каноничное место — `shared/lib/`. `useMindMap` импортирует его как примитив.

### 3. `MapNode.vue` → `entities/node/ui/`, через слоты

Базовый узел живёт в entity. Чтобы entity не зависел от features, MapNode принимает **именованные слоты**:

```vue
<!-- entities/node/ui/MapNode.vue -->
<template>
  <div class="map-node">
    <slot name="image" />
    <NodeContent :node="node" />
    <slot name="notes-preview" />
    <slot name="actions" />
  </div>
</template>
```

А виджет `widgets/canvas/ui/MindMapCanvas.vue` инжектит фичи в слоты:

```vue
<MapNode v-for="pos in positions" :pos="pos">
  <template #image>
    <NodeImage :node="pos.node" />               <!-- entities/image -->
  </template>
  <template #actions>
    <NodeActions :node="pos.node" />             <!-- features/node-actions -->
  </template>
  <template #notes-preview>
    <NodeNotesPreview :node="pos.node" />        <!-- features/notes -->
  </template>
</MapNode>
```

**Это даёт:**
- ✅ Entity не зависит от features (правильное направление импортов).
- ✅ MapNode переиспользуем без features (для тестов, превью, экспорта).
- ✅ Виджет — точка композиции.

### 4. `useNodeImage` → `features/node-image/`

Несмотря на имя «node...», это **действие пользователя** (drop, drag-over). Зависит от `useImageHandler` и `ImageStorageApi`. Поэтому feature, не entity.

### 5. Layout: pure-алгоритмы отдельно от композиблов

- **Алгоритмы** (без Vue) → `shared/lib/layout/`.
- **Композиблы** (`useLayout`, `useAutoLayout`) → `features/auto-layout/model/`.
- **Типы** (`LayoutPosition`, `LayoutData`) → `features/auto-layout/model/types.ts`.

### 6. `useNodeScale` → `entities/node/model/`

Содержит и pure-функцию `computeEffectiveScale`, и композибл. Оставляем единым модулем в entity (опционально расщепить позже — см. ADR).

### 7. Алиасы

`tsconfig.json` + `vite.config.ts`:
```json
"paths": {
  "@/*":         ["src/*"],
  "@app/*":      ["src/app/*"],
  "@pages/*":    ["src/pages/*"],
  "@widgets/*":  ["src/widgets/*"],
  "@features/*": ["src/features/*"],
  "@entities/*": ["src/entities/*"],
  "@shared/*":   ["src/shared/*"]
}
```

---

## 🚦 Правила импортов

| Откуда → куда | Можно? |
|---------------|:------:|
| `app` → любой нижележащий | ✅ |
| `pages` → `widgets`, `features`, `entities`, `shared` | ✅ |
| `widgets` → `features`, `entities`, `shared` | ✅ |
| `features` → `entities`, `shared` | ✅ |
| `entities` → `shared` | ✅ |
| `entities` → `features` | ❌ |
| `shared` → любой FSD-слой | ❌ |
| Между слайсами одного слоя | ⚠️ избегать; если необходимо — только через public API |
| В **внутренности** другого слайса | ❌ только через `index.ts` |

---

## 📦 Куда едут «лишние» типы из `src/types/`

| Файл | Куда | Комментарий |
|------|------|-------------|
| `mindmap.ts` | удалить | Дубликат, реальные типы уже в `entities/{node,image,mindmap}` |
| `mindmap-api.ts` | `entities/mindmap/model/types.ts` | Тип `MindMapApi` — фасад entity |
| `mindmap-constants.ts` | разнести: `entities/node/model/constants.ts` (NODE_SCALE), `shared/lib/history/constants.ts` (MAX_HISTORY), и т.д. | По смыслу каждой константы |
| `layout.ts` | `features/auto-layout/model/types.ts` | LayoutPosition, LayoutData |
| `node-drag.ts` | `features/node-drag/model/types.ts` | |
| `node-image-emits.ts` | `features/node-image/model/types.ts` | Vue emit-типы |
| `injection-keys.ts` | `app/providers/injectionKeys.ts` | Provide/inject ключи |

---

## 🧪 Тесты

Каждый тест **рядом** с модулем:
```
shared/lib/__tests__/bezier.spec.ts
widgets/canvas/__tests__/useConnections.spec.ts
entities/node/__tests__/useNodeScale.spec.ts
```

---

## 🧭 Стратегия миграции

**Параллельная** (вариант 🅱️ из обсуждения):
1. Создаём новые файлы в FSD-структуре.
2. Старые файлы превращаем в **re-export** stub'ы:
   ```ts
   // src/composables/useHistory.ts
   export * from '@shared/lib/history/useHistory'
   ```
3. Постепенно мигрируем импорты в потребителях.
4. Когда последний импорт переехал — удаляем stub.

Порядок миграции снизу вверх:
1. `shared/` — bezier, injectStrict уже там; добавить layout, history, useImageHandler, useTheme.
2. `entities/` — model + ui (типы уже есть, добавить composables и компоненты).
3. `features/` — все действия.
4. `widgets/` — холст, тулбар, панели.
5. `pages/` + `app/` — финал.
6. **Удаление legacy:** `src/composables/`, `src/components/`, `src/types/`.

Подробный план — в `MIGRATION.md`.

---

## 📚 Ссылки

- [FSD official](https://feature-sliced.design/)
- [FSD на русском](https://feature-sliced.design/ru/)
- [ADR 0001 — Организация типов под FSD](./adr/0001-types-organization.md) *(требует обновления)*