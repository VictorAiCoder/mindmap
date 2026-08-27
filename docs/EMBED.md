# mindmap-embed

> Read-only viewer для интерактивных mind maps из markdown. Самодостаточный ES-модуль для интеграции в Vue 3 проекты.

![Vue 3.5](https://img.shields.io/badge/Vue-3.5-42b883?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)

---

## Что это

**mindmap-embed** — это лёгкий (≈190 KB JS + 8 KB CSS) компонент-просмотрщик, который превращает markdown в интерактивную карту. Не требует Vuetify, не хранит данные, не редактирует — только показывает.

Ключевые свойства:

- **Markdown-first** — заголовки markdown (`#`, `##`, `###`) парсятся в дерево узлов
- **Read-only** — нет drag-and-drop, нет редактирования, нет undo/redo
- **6 алгоритмов раскладки** — mindmap, radial, compact, spacious, treeDown, treeRight
- **Полноэкранный режим** — Teleport overlay с кнопкой expand
- **Preview-режим** — статичное превью без интерактивности (для карточек)
- **XSS-safe** — рендеринг через DOMPurify с белым списком тегов

---

## Установка

### 1. Собрать бандл

```bash
cd mindmap/
npm install
npm run build:embed
```

Результат — `dist/embed/`:

```
dist/embed/
├── index.js       # ES-модуль (~190 KB)
├── index.js.map   # Sourcemap
└── style.css      # Стили (~8 KB)
```

### 2. Подключить в проекте

**Nuxt 3/4** (`nuxt.config.ts`):

```ts
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  alias: {
    '@mindmap-embed': fileURLToPath(new URL('../mindmap/dist/embed', import.meta.url)),
  },
  css: ['~/../mindmap/dist/embed/style.css'],
})
```

**Vite** (`vite.config.ts`):

```ts
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@mindmap-embed': resolve(__dirname, '../mindmap/dist/embed'),
    },
  },
})
```

---

## Быстрый старт

### Через markdown (raw строка)

```vue
<template>
  <MindmapViewer :markdown="articleBody" height="500px" />
</template>

<script setup>
import { defineAsyncComponent, computed } from 'vue'
import { stringify } from 'minimark/stringify'

const MindmapViewer = defineAsyncComponent(() =>
  import('@mindmap-embed').then(m => m.MindmapViewer)
)

const props = defineProps({ article: Object })

// Nuxt Content v3: body — это MinimarkTree AST, не строка
const articleBody = computed(() => {
  if (!props.article?.body) return ''
  return stringify(props.article.body, { format: 'markdown/mdc' })
})
</script>
```

### Через slug (fetch с сервера)

```vue
<template>
  <MindmapViewer slug="my-article" height="500px" />
</template>

<script setup>
import { defineAsyncComponent } from 'vue'

const MindmapViewer = defineAsyncComponent(() =>
  import('@mindmap-embed').then(m => m.MindmapViewer)
)
</script>
```

Компонент сделает `GET /api/mindmap/{slug}` и отрендерит дерево из ответа.

---

## Props API

| Prop | Тип | Дефолт | Описание |
|------|-----|--------|----------|
| `markdown` | `string` | — | Raw markdown для парсинга в дерево |
| `slug` | `string` | — | Slug для fetch из `/api/mindmap/{slug}`. Если есть `markdown` — фоллбэк |
| `layout` | `LayoutType` | `'mindmap'` | Алгоритм раскладки |
| `showNotes` | `boolean` | `true` | Показывать заметки узлов (hover-to-expand) |
| `showImages` | `boolean` | `true` | Показывать картинки над узлами |
| `height` | `string` | `'500px'` | Высота контейнера (CSS value) |
| `class` | `string` | `''` | Дополнительный CSS-класс |
| `allowFullscreen` | `boolean` | `true` | Кнопка полноэкранного режима |
| `previewMode` | `boolean` | `false` | Статичное превью: `pointer-events: none`, без pan/zoom |

### LayoutType

```ts
type LayoutType =
  | 'mindmap'    // Базовый: корень в центре, дети влево-вправо
  | 'radial'     // Круговой: дети по окружности
  | 'compact'    // Компактный: всё вправо, минимальные зазоры
  | 'spacious'   // Просторный: влево-вправо, большие зазоры
  | 'treeDown'   // Вертикальный: org-chart стиль
  | 'treeRight'  // Горизонтальный: всё вправо
```


---

## Слоты

MindmapViewer поддерживает 3 именованных слота для кастомизации рендера узлов. Слоты пробрасываются через provide/inject — промежуточные компоненты (EmbedCanvas) не требуют изменений.

### `image` — замена картинки узла

Заменяет дефолтный `EmbedNodeImage`. Рендерится над нодой (`bottom: 100%`).

**Scoped props:**

```ts
{
  node: MindMapNode        // полные данные узла
  src: string              // imageId (или URL)
  clip: Clip | null        // регион обрезки
  isRoot: boolean
  imageWidth: number | null
  scale: number
}
```

### `notes` — замена заметки

Заменяет дефолтный `EmbedNotesPreview`. Рендерится под нодой (`top: 100%`).

**Scoped props:**

```ts
{
  node: MindMapNode
  notes: string            // raw markdown заметок
  color: string            // цвет border-left
  isExpanded: boolean      // состояние expand
  isLong: boolean          // >200 chars или >5 строк
}
```

### `menu` — контекстное меню

Заменяет дефолтное `EmbedNodeMenu`. Триггер — кнопка `⋯` в правой части ноды (появляется при hover).

**Scoped props:**

```ts
{
  node: MindMapNode
  isRoot: boolean
  isLeaf: boolean
  hasNotes: boolean
  hasChildren: boolean
  hasImage: boolean
}
```

### Дефолтное меню

Если слот `menu` не передан, используется `EmbedNodeMenu` — read-only контекстное меню:

- Копировать текст (clipboard API)
- Свернуть/развернуть (если есть дети)
- Открыть заметку (если есть notes)
- Инфо: глубина, число детей

### Пример

```vue
<MindmapViewer :markdown="body" height="700px">
  <template #image="{ node, src, scale }">
    <MyLazyImage :url="src" :zoom="scale" />
  </template>

  <template #notes="{ node, notes, color }">
    <FeedbackPanel :node-id="node.id" />
  </template>

  <template #menu="{ node, isRoot }">
    <CustomContextMenu :node-id="node.id" :is-root="isRoot" />
  </template>
</MindmapViewer>
```

---

## Экспорты

```ts
import {
  MindmapViewer,           // Vue-компонент (default export)
  parseMarkdownToTree,     // markdown → MindMapNode дерево
  useLayout,               // Composable для раскладки
  renderMarkdown,          // markdown → sanitized HTML (для заметок)
  configureMarkdown,       // Регистрация языков хайлайтинга
} from '@mindmap-embed'

import type {
  MindmapViewerProps,      // Тип пропсов
  LayoutType,              // Тип раскладки
  LayoutPosition,          // Позиция узла
  LayoutBounds,            // Границы сцены
  LayoutData,              // Данные раскладки
  PositionMap,             // Map<id, позиция>
  EmbedSlots,              // Тип слотов
  EmbedNodeImageSlotProps, // Props слота image
  EmbedNodeNotesSlotProps, // Props слота notes
  EmbedNodeMenuSlotProps,  // Props слота menu
} from '@mindmap-embed'
```

### parseMarkdownToTree

```ts
function parseMarkdownToTree(
  markdown: string,
  images: Ref<StoredImage[]>
): MindMapNode | null
```

Парсит markdown-заголовки в дерево MindMapNode. Используется внутри MindmapViewer автоматически.

### useLayout

```ts
function useLayout(
  rootNode: Ref<MindMapNode>,
  layoutType?: Ref<LayoutType>
): { layoutData: Ref<LayoutData> }
```

Вычисляет позиции узлов для выбранного алгоритма раскладки.

### renderMarkdown

```ts
function renderMarkdown(source: string): string
```

Рендерит markdown в sanitized HTML. Используется для заметок узлов (GFM: таблицы, чек-листы, код).

---

## Паттерны интеграции

### Nuxt Content v3 + minimark

```ts
import { stringify } from 'minimark/stringify'

// body — это MinimarkTree AST, НЕ строка
const articleBody = computed(() => {
  if (!article.value?.body) return ''
  try {
    return stringify(article.value.body, { format: 'markdown/mdc' })
  } catch {
    return ''
  }
})
```

### Ленивая загрузка (IntersectionObserver)

```vue
<template>
  <div ref="cardRef">
    <ClientOnly>
      <MindmapViewer
        v-if="isVisible"
        :slug="slug"
        height="150px"
        :preview-mode="true"
        :allow-fullscreen="false"
      />
      <template #fallback>
        <div class="skeleton" />
      </template>
    </ClientOnly>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const cardRef = ref(null)
const isVisible = ref(false)

onMounted(() => {
  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) isVisible.value = true },
    { rootMargin: '200px' }
  )
  if (cardRef.value) observer.observe(cardRef.value)
})
</script>
```

### Dark theme (CSS-переменные)

```css
.mindmap-viewer {
  --bg: #0a100d;
  --accent: #27b94b;
  --border: #222;
  --text-dim: #555;
  --radius: 6px;
  --font-mono: 'JetBrains Mono', monospace;
}
```

---

## Сборка

Конфиг: `vite.embed.ts`

```ts
build: {
  lib: {
    entry: './embed/index.ts',
    formats: ['es'],
    fileName: () => 'index.js',
    cssFileName: 'style',
  },
  outDir: 'dist/embed',
  rollupOptions: {
    external: ['vue'],  // Vue — peer dependency, не бандлится
  },
}
```

**Команды:**

```bash
npm run build:embed        # Только JS + CSS
npm run build:embed:types  # Только типы (.d.ts)
npm run build:embed:all    # Всё вместе
```

**Dev-workflow:**

```bash
# В mindmap/:
npm run build:embed    # Пересобрать бандл
# В consumer проекте:
npm run dev            # Подхватит изменения
```

---

## Стили

Бандл экспортирует `style.css` с дефолтными стилями. Основные CSS-переменные:

| Переменная | Дефолт | Описание |
|------------|--------|----------|
| `--bg` | `#0a100d` | Фон контейнера |
| `--accent` | `#27b94b` | Акцентный цвет (connections, hover) |
| `--border` | `#222` | Рамка контейнера |
| `--text-dim` | `#555` | Приглушённый текст |
| `--radius` | `6px` | Скругление углов |
| `--font-mono` | `JetBrains Mono` | Моноширинный шрифт |

**Accent color override:** MindmapViewer автоматически заменяет `#5C6BC0` (indigo) на `#27b94b` (зелёный) в цветах узлов.

---

## Ограничения

| Ограничение | Описание |
|-------------|----------|
| **Read-only** | Нет редактирования, drag-and-drop, undo/redo |
| **5 языков хайлайтинга** | JavaScript, TypeScript, XML, Bash, Markdown (vs 50 в full editor) |
| **Нет localStorage** | Данные не сохраняются клиенте |
| **Нет toolbar** | Нет кнопок zoom, layout switch — только pan/zoom колёсиком |
| **Vue — peer dependency** | Потребитель должен предоставить Vue 3.5+ |
| **SSR-небезопасен** | Обёрнут в `<ClientOnly>`, на сервере не рендерится |

---

## Файловая карта

```
embed/
├── index.ts                    # Public API barrel (экспорты)
├── types.ts                    # MindmapViewerProps, LayoutType
├── MindmapViewer.vue           # Root component (fullscreen, fetch, parse)
├── lib/
│   ├── parse.ts                # Re-export parseMarkdownToTree
│   ├── layout.ts               # Re-export useLayout
│   └── markdown.ts             # marked + DOMPurify + hljs (5 языков)
├── composables/
│   ├── useEmbedPanZoom.ts      # Re-export usePanZoom
│   └── useEmbedConnections.ts  # Re-export useConnections
└── components/
    ├── EmbedCanvas.vue         # Read-only canvas (pan/zoom, SVG connections)
    ├── EmbedNode.vue           # Node wrapper (root/branch/leaf стили)
    ├── EmbedNodeContent.vue    # Текст + toggle + badge
    ├── EmbedNodeImage.vue      # Плавающая картинка
    └── EmbedNotesPreview.vue   # Hover-to-expand заметки
```

---

## Связь с full editor

mindmap-embed — это **подмножество** полного редактора mindmap (`src/`). Полный редактор включает:

- Drag-and-drop редактирование
- Undo/redo (50 шагов)
- Toolbar с действиями
- Image gallery + segment editor
- 50+ языков хайлайтинга
- Vuetify UI

Embed-бандл берёт только: парсинг markdown, раскладку, pan/zoom, SVG-connections, рендер узлов. Без Vuetify, без store, без persistence.

---

*Документация для mindmap-embed v0.0.0*
