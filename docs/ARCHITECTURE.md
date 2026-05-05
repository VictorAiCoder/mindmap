# Architecture — Mind Map App

> **Подход:** Feature-Sliced Design (FSD) v2.1 — каноничный.
> **Stack:** Vue 3 + TypeScript + Vite.
> **State:** composables + provide/inject (без Pinia).
> **Документация FSD:** https://feature-sliced.design/

---

## 🏛️ Слои (сверху вниз)

| Слой | Назначение | Может импортировать из |
|------|-----------|------------------------|
| `app` | Точка входа, провайдеры, корневой `App.vue`, инициализация инфраструктуры | всех нижележащих |
| `pages` | Страницы: компоновка виджетов под URL/экран | `widgets`, `features`, `entities`, `shared` |
| `widgets` | Композитные блоки UI: холст, тулбар, панели | `features`, `entities`, `shared` |
| `features` | Действия пользователя: drag, undo, import, layout | `entities`, `shared` |
| `entities` | Бизнес-сущности: `mindmap`, `node`, `image` | `shared` |
| `shared` | Переиспользуемое без бизнес-смысла: utils, UI-kit, generic composables | — (только npm и Vue как инфраструктура) |

**Железное правило:** импорты идут **только сверху вниз**. Нижестоящий слой **никогда** не знает о вышестоящих.

> **Прим. о Vue:** `shared/` может импортировать `vue` (`ref`, `computed`, `watch`). Vue считается инфраструктурой, как TypeScript. Это прагматичное расширение канона для Vue-проектов.

---

## 📂 Структура слайса

Каждый слайс (папка в `entities/`, `features/`, `widgets/`, `pages/`) имеет каноничные сегменты:

```
slice/
├── index.ts        ← Public API — единственная точка импорта снаружи
├── model/          ← state, types, composables, бизнес-логика
├── ui/             ← Vue-компоненты слайса
├── lib/            ← вспомогательные функции, специфичные для слайса
└── api/            ← внешние интеграции (если нужно)
```

**Public API через `index.ts`:**
```ts
import { useMindMap } from '@entities/mindmap'                  // ✅ public API
import { useMindMap } from '@entities/mindmap/model/useMindMap' // ❌ запрещено
```

**Что экспортировать:** только то, что **должно** быть доступно снаружи слайса. Внутренние утилиты — приватны.

---

## 🗺️ Карта проекта

```
src/
├── app/                              ← инициализация
│   ├── App.vue                       ← корневой компонент: provide root state
│   ├── main.ts                       ← createApp().mount()
│   └── providers/
│       └── injectionKeys.ts          ← InjectionKey<MindMapApi> и др.
│
├── pages/
│   └── mindmap/
│       ├── index.ts
│       └── ui/
│           └── MindMapPage.vue       ← склейка виджетов
│
├── widgets/
│   ├── canvas/                       ← холст: pan/zoom/connections/узлы
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
│   ├── node-image/                   ← drag&drop файла/карточки на узел
│   │   ├── index.ts
│   │   └── model/
│   │       ├── useNodeImage.ts
│   │       └── types.ts              ← NodeImageEmits
│   │
│   ├── auto-layout/
│   │   ├── index.ts
│   │   └── model/
│   │       ├── useLayout.ts
│   │       ├── useAutoLayout.ts
│   │       └── types.ts              ← LayoutPosition, LayoutData
│   │
│   ├── image-gallery/                ← операции с пулом изображений
│   │   ├── index.ts
│   │   └── model/
│   │       ├── useSegmentEditor.ts
│   │       └── useSegmentOperations.ts
│   │
│   ├── notes/                        ← редактирование заметок
│   │   ├── index.ts
│   │   └── ui/
│   │       └── NodeNotesPreview.vue
│   │
│   └── persistence/                  ← импорт/экспорт markdown
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
│   ├── mindmap/                      ← главная сущность: документ + tree ops
│   │   ├── index.ts
│   │   ├── model/
│   │   │   ├── types.ts              ← MindMapDocument, MindMapApi
│   │   │   ├── useMindMap.ts         ← главный композибл-владелец state
│   │   │   ├── useTreeOperations.ts
│   │   │   ├── useTreeTraversal.ts
│   │   │   └── useNodeFactory.ts
│   │   └── lib/                      ← (зарезервировано)
│   │
│   ├── node/                         ← узел дерева
│   │   ├── index.ts
│   │   ├── model/
│   │   │   ├── types.ts              ← MindMapNode, ScenePosition, Center2D
│   │   │   ├── constants.ts          ← NODE_SCALE
│   │   │   ├── useNodeDisplay.ts
│   │   │   └── useNodeScale.ts       ← composable + computeEffectiveScale
│   │   └── ui/
│   │       ├── MapNode.vue           ← с slots для actions/image/notes
│   │       └── NodeContent.vue
│   │
│   └── image/                        ← изображения
│       ├── index.ts
│       ├── model/
│       │   ├── types.ts              ← Clip, RawImage, ImageSegment, StoredImage
│       │   ├── useImageStorage.ts
│       │   └── useNodeImage.ts       ← reactive props для отображения img у узла
│       └── ui/
│           └── NodeImage.vue
│
└── shared/
    ├── lib/
    │   ├── bezier.ts
    │   ├── injectStrict.ts
    │   ├── history/
    │   │   └── useHistory.ts         ← generic <T>, не знает о домене
    │   ├── image/
    │   │   └── imageHandler.ts       ← processImageFile, getImageFromDrop
    │   ├── layout/                   ← чистые алгоритмы
    │   │   ├── compact.ts
    │   │   ├── mindmap.ts
    │   │   ├── radial.ts
    │   │   ├── spacious.ts
    │   │   ├── treeDown.ts
    │   │   ├── treeRight.ts
    │   │   └── utils.ts
    │   └── __tests__/
    │       └── bezier.spec.ts
    ├── composables/
    │   └── useTheme.ts               ← generic light/dark + localStorage
    ├── ui/                           ← UI-kit (зарезервировано)
    └── config/                       ← env/constants (зарезервировано)
```

---

## 🔑 Ключевые архитектурные решения

### 1. `entities/mindmap` — владелец главного state (без Pinia)

`useMindMap` — корневой композибл документа. Регистрируется один раз в `app/App.vue`, передаётся через `provide` с ключами из `app/providers/injectionKeys.ts`. Все слайсы получают API через `inject` (обёртка `injectStrict` из `@shared/lib/injectStrict`).

**Почему не Pinia?** Текущая архитектура использует composables + DI. Миграция на Pinia — отдельное решение (если будет — оформить ADR).

### 2. `useHistory` → `shared/lib/history/`

Generic `useHistory<T>(state: Ref<T>)` не знает о домене. Каноничное место — `shared`.

### 3. `useImageHandler` → `shared/lib/image/imageHandler.ts`

Чистые pure-функции (File → DataURL → resize → JPEG). Не Vue, не реактивность. Прямой `shared`.

### 4. `useTheme` → `shared/composables/`

Generic light/dark + localStorage. Module-level singleton — деталь реализации, не повод поднимать в `app/`. Если в будущем понадобится приложение-специфичный layer тем — сделать обёртку в `app/`.

### 5. `MapNode.vue` — entity UI с слотами для фич

Чтобы `entities/node/ui/MapNode.vue` не зависел от features, использует **именованные слоты**:

```vue
<!-- entities/node/ui/MapNode.vue -->
<template>
  <div class="map-node" :style="positionStyle">
    <slot name="image" />
    <NodeContent :node="node" />
    <slot name="notes-preview" />
    <slot name="actions" />
  </div>
</template>
```

Виджет `widgets/canvas` инжектит фичи в слоты:

```vue
<!-- widgets/canvas/ui/MindMapCanvas.vue -->
<MapNode v-for="pos in positions" :key="pos.node.id" :pos="pos">
  <template #image>
    <NodeImage :node="pos.node" />              <!-- entities/image -->
  </template>
  <template #notes-preview>
    <NodeNotesPreview :node="pos.node" />       <!-- features/notes -->
  </template>
  <template #actions>
    <NodeActions :node="pos.node" />            <!-- features/node-actions -->
  </template>
</MapNode>
```

**Профит:**
- ✅ Entity не зависит от features (правильное направление импортов).
- ✅ `MapNode` переиспользуем для превью/тестов без features.
- ✅ Виджет — точка композиции, видно весь UI узла в одном месте.

### 6. `useNodeImage` существует в **двух** слайсах — это норма

- `entities/image/model/useNodeImage.ts` — реактивные **display props** для `NodeImage.vue` (resolve через storage, computed src/clip).
- `features/node-image/model/useNodeImage.ts` — **drop-обработчики** (drag-over, drop файла или карточки галереи).

Это **разные ответственности**, имена случайно похожи. Возможно стоит переименовать второй в `useNodeImageDrop` — оформить как минорный рефакторинг.

### 7. Layout: pure отдельно от композиблов

| Что | Где |
|-----|-----|
| Алгоритмы (`layoutMindMap`, `layoutRadial`, ...) — pure | `shared/lib/layout/` |
| Композиблы `useLayout`, `useAutoLayout` | `features/auto-layout/model/` |
| Типы `LayoutPosition`, `LayoutData` | `features/auto-layout/model/types.ts` |

### 8. `useNodeScale` — единый модуль в entity

Содержит pure `computeEffectiveScale()` + composable `useNodeScale()`. Оставляем единым в `entities/node/model/useNodeScale.ts`. Расщепление возможно позже (см. ADR, если будет потребность).

### 9. Алиасы

В `tsconfig.json` и `vite.config.ts`:

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

**Соглашение об импорте public API:**
```ts
import { useMindMap } from '@entities/mindmap'   // ✅ через index.ts
```

Не `@entities/mindmap/index` и не во внутренности.

---

## 🚦 Правила импортов (cheat sheet)

| Откуда → куда | Можно? |
|---------------|:------:|
| `app` → любой нижележащий | ✅ |
| `pages` → `widgets`/`features`/`entities`/`shared` | ✅ |
| `widgets` → `features`/`entities`/`shared` | ✅ |
| `features` → `entities`/`shared` | ✅ |
| `entities` → `shared` | ✅ |
| `entities` → `features` | ❌ |
| `shared` → любой FSD-слой | ❌ |
| Между слайсами одного слоя (например `entities/node` → `entities/image`) | ⚠️ только через public API; избегать кросс-зависимостей |
| Во внутренности другого слайса (минуя `index.ts`) | ❌ |
| Импорт из `vue`, `npm-пакетов` | ✅ всем |

---

## 📦 Карта переезда `src/types/`

| Файл | Куда | Комментарий |
|------|------|-------------|
| `mindmap.ts` | **удалить** | Дубликат, реальные типы уже в `entities/{node,image,mindmap}/model/types.ts` |
| `mindmap-api.ts` | `entities/mindmap/model/types.ts` | `MindMapApi`, `ImageStorageApi` — фасады entity |
| `mindmap-constants.ts` | `entities/node/model/constants.ts` | `NODE_SCALE` |
| `layout.ts` | `features/auto-layout/model/types.ts` | `LayoutPosition`, `LayoutData` |
| `node-drag.ts` | `features/node-drag/model/types.ts` | |
| `node-image-emits.ts` | `features/node-image/model/types.ts` | Vue emit-типы |
| `injection-keys.ts` | `app/providers/injectionKeys.ts` | Ключи для provide/inject |

После полной миграции **папка `src/types/` удаляется**.

---

## 🧪 Тесты

Каждый тест **рядом** со своим модулем в локальной `__tests__/`:

```
shared/lib/__tests__/bezier.spec.ts
widgets/canvas/__tests__/useConnections.spec.ts
entities/node/__tests__/useNodeScale.spec.ts
```

Не выносить тесты в корневой `tests/` — это разрывает связь с кодом.

---

## 🧭 Стратегия миграции

**Параллельная** (вариант B): новые файлы создаются в FSD-структуре, старые превращаются в **re-export stubs**, импорты потребителей мигрируют постепенно. Когда последний импорт переехал — stub удаляется.

Пример stub'а:
```ts
// src/composables/useHistory.ts (legacy)
export * from '@shared/lib/history/useHistory'
```

**Порядок миграции — снизу вверх по слоям FSD:**

1. **`shared/`** — фундамент (bezier, injectStrict, layout-алгоритмы, history, imageHandler, useTheme).
2. **`entities/`** — модели и базовый UI (типы уже на месте; добавить composables и компоненты).
3. **`features/`** — пользовательские действия.
4. **`widgets/`** — холст, тулбар, панели.
5. **`pages/`** + **`app/`** — финальная композиция.
6. **Удаление legacy** — `src/composables/`, `src/components/`, `src/types/`.

Подробный пошаговый план — в `MIGRATION.md`.

---

## 🛡️ Контроль архитектуры (опционально)

Для автоматического enforce правил импортов рекомендуется один из:

- [`@conarti/eslint-plugin-feature-sliced`](https://github.com/conarti/eslint-plugin-feature-sliced) — специализированный.
- [`eslint-plugin-boundaries`](https://github.com/javierbrea/eslint-plugin-boundaries) — generic.

Без них правила опираются на **дисциплину разработчика** и **code review**.

---

## 📚 Ссылки

- [Feature-Sliced Design — официальная документация](https://feature-sliced.design/)
- [FSD на русском](https://feature-sliced.design/ru/)
- [Cheat sheet слоёв](https://feature-sliced.design/docs/get-started/overview)

---

## 📜 История изменений

| Дата | Изменение |
|------|-----------|
| YYYY-MM-DD | Первая версия архитектуры — каноничный FSD. |