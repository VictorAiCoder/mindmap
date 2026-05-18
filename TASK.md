# TASK: Улучшение layout — устранение наложения узлов

## Проблема

При применении автоматической раскладки узлы могут налезать друг на друга. Причина: алгоритмы рассчитывают позиции на основе **фиксированных размеров ядра узла** (250×40 / 270×50), но реальный визуальный bounding box включает:

```
        ┌─────────────┐
        │   IMAGE     │  ← NodeImage.vue: bottom: 100%, высота переменная
        │  (160×120)  │     (default 160px width, aspect-ratio dependent)
        └─────────────┘
              │
        ┌─────────────┐
        │  NODE CORE  │  ← 250×40 (или 270×50 для root)
        │  (текст)    │
        └─────────────┘
              │
        ┌─────────────┐
        │   NOTES     │  ← NodeNotesPreview.vue: top: 100%, высота до ~160px
        │  (превью)   │     (max-height: 11.429em, max-width: 20em)
        └─────────────┘
```

### Что сейчас учитывается

| Элемент | Учитывается? | Где |
|---------|:-----------:|-----|
| Ядро узла (текст) | ✅ | `NODE_W`, `NODE_H`, `ROOT_W`, `ROOT_H` |
| Scale узла | ✅ | `scaleOf(node)` в `useLayout.ts` |
| Превью заметок | ⚠️ частично | `getNodeHeight()` в `layoutUtils.ts` — формула `previewLines × 18 + 26`, но не используется во всех алгоритмах |
| Картинка над узлом | ❌ | Не учитывается нигде |
| Actions-кнопка | ❌ | Не учитывается |
| Collapsed-состояние | ✅ | `node.collapsed` пропускает детей |

### Где именно наложение

1. **Вертикальное**: картинка узла A налезает на ядро/заметку узла B, если они на одной вертикали с маленьким зазором
2. **Горизонтальное**: заметка узла A (max-width 280px) вылезает за bounds узла и налезает на соседний узел
3. **Диагональное**: при радиальной раскладке картинки на внешних кольцах пересекаются

## Анализ кода

### layoutUtils.ts — `getNodeHeight()`

```ts
export function getNodeHeight(node: MindMapNode, depth: number): number {
  const baseHeight = depth === 0 ? ROOT_H : NODE_H
  if (!node.notes?.trim()) return baseHeight
  const lineCount = node.notes.split('\n').length
  const previewLines = Math.min(lineCount, NOTE_MAX_PREVIEW_LINES)
  const previewHeight = previewLines * NOTE_LINE_HEIGHT + NOTE_PADDING
  return baseHeight + previewHeight
}
```

**Проблемы:**
- Считает только заметки, игнорирует картинки
- `NOTE_MAX_PREVIEW_LINES = 7` → max 7×18+26 = 152px, но CSS `max-height: 11.429em` ≈ 160px — рассинхрон
- Эта функция используется НЕ во всех алгоритмах — `useLayout.ts` имеет свою копию `nodeHeight()` без учёта заметок

### useLayout.ts — своя `nodeHeight()`

```ts
function nodeHeight(depth: number, node: MindMapNode): number {
  const base = depth === 0 ? ROOT_H : NODE_H
  return base * scaleOf(node)  // ← НЕТ учёта заметок!
}
```

**Это главный баг.** `useLayout.ts` (основной composable для реактивного расчёта позиций) использует свою версию `nodeHeight()`, которая **не учитывает заметки вообще**. А `layoutUtils.getNodeHeight()` — учитывает, но используется только в отдельных алгоритмах (`layoutMindMap`, `layoutSpacious`, etc.).

### NodeImage.vue

- `position: absolute; bottom: 100%` — картинка всегда НАД узлом
- Default width: 160px, height зависит от aspect ratio (обычно ~120px)
- `margin-bottom: 0.429em` — небольшой отступ
- Может быть изменён пользователем через resize (100–1000px)

### NodeNotesPreview.vue

- `position: absolute; top: 100%` — заметка всегда ПОД узлом
- `max-width: 20em` (~280px), `max-height: 11.429em` (~160px)
- `margin-top: 0.429em` — небольшой отступ
- В expanded режиме: `max-width: 27.143em`, `max-height: 35.714em`

## План решения

### Фаза 1: Единый расчёт высоты узла

**Цель:** один источник truth для размеров узла, учитывающий все элементы.

1. **Создать `entities/node/model/useNodeDimensions.ts`**:
   ```ts
   export interface NodeDimensions {
     coreWidth: number       // NODE_W или ROOT_W × scale
     coreHeight: number      // NODE_H или ROOT_H × scale
     imageHeight: number     // 0 если нет картинки, иначе estimated height
     notesHeight: number     // 0 если нет заметок, иначе preview height
     totalHeight: number     // coreHeight + imageHeight + notesHeight + gaps
     totalWidth: number      // max(coreWidth, notesWidth, imageWidth)
   }
   
   export function getNodeDimensions(
     node: MindMapNode,
     depth: number,
     scale: number
   ): NodeDimensions
   ```

2. **Константы для расчёта**:
   - `IMAGE_DEFAULT_HEIGHT = 120` (160×0.75 aspect ratio)
   - `IMAGE_MARGIN = 6` (0.429em при 14px)
   - `NOTES_PREVIEW_HEIGHT = 160` (sync с CSS max-height)
   - `NOTES_MARGIN = 6` (0.429em при 14px)
   - `NOTES_MAX_WIDTH = 280` (20em при 14px)

3. **Заменить** `nodeHeight()` в `useLayout.ts` на вызов `getNodeDimensions()`
4. **Заменить** `getNodeHeight()` в `layoutUtils.ts` на вызов `getNodeDimensions()`
5. **Обновить** все layout-алгоритмы для использования единой функции

### Фаза 2: Учёт картинки в layout

**Цель:** картинка над узлом не должна налезать на соседние узлы.

1. В `calcAutoPositions()` увеличить `y` узла на `imageHeight + IMAGE_MARGIN`
2. При расчёте `subtreeHeight` учитывать полную высоту (image + core + notes)
3. Для left/right сторон: картинка расширяет bounding box узла влево/вправо если шире ядра

### Фаза 3: Учёт заметок в layout

**Цель:** заметка под узлом не должна налезать на соседние узлы.

1. Увеличить вертикальный зазор `GAP_V` когда у узла есть заметки
2. Для горизонтальных раскладок (treeDown): заметка расширяет ширину поддерева
3. Синхронизировать константы между TS и CSS:
   - `NOTE_MAX_PREVIEW_LINES` → реальная высота в px
   - CSS `max-height: 11.429em` → вынести в константу

### Фаза 4: Синхронизация CSS и TS констант

**Цель:** layout-алгоритмы и CSS используют одинаковые размеры.

1. Создать `shared/config/node-dimensions.ts`:
   ```ts
   export const NODE_IMAGE = {
     DEFAULT_WIDTH: 160,
     DEFAULT_HEIGHT: 120,  // 160 × 0.75
     MIN_WIDTH: 100,
     MAX_WIDTH: 1000,
     MARGIN_BOTTOM: 6,     // 0.429em
   } as const
   
   export const NODE_NOTES = {
     PREVIEW_MAX_HEIGHT: 160,  // 11.429em
     PREVIEW_MAX_WIDTH: 280,   // 20em
     EXPANDED_MAX_HEIGHT: 500, // 35.714em
     EXPANDED_MAX_WIDTH: 380,  // 27.143em
     MARGIN_TOP: 6,            // 0.429em
     LINE_HEIGHT: 18,
     PADDING: 26,
     MAX_PREVIEW_LINES: 7,
   } as const
   ```

2. Импортировать эти константы в:
   - `layoutUtils.ts`
   - `useLayout.ts`
   - `NodeImage.vue` (через CSS variables или JS)
   - `NodeNotesPreview.vue`

### Фаза 5: Тестирование

1. Создать тестовый markdown с:
   - Узлами с картинками
   - Узлами с длинными заметками
   - Узлами с картинками И заметками одновременно
   - Глубоким деревом (4+ уровня)
2. Применить все 6 раскладок — проверить отсутствие наложений
3. Проверить edge cases:
   - Collapsed узлы с картинками
   - Scaled узлы (0.75×, 2.5×)
   - Custom-позиции + auto-layout

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `shared/config/node-dimensions.ts` | **Создать** — единые константы размеров |
| `entities/node/model/useNodeDimensions.ts` | **Создать** — расчёт полных размеров узла |
| `features/layout/lib/layoutUtils.ts` | Заменить `getNodeHeight` на `getNodeDimensions` |
| `features/layout/model/useLayout.ts` | Заменить `nodeHeight` на `getNodeDimensions` |
| `features/layout/lib/layoutMindMap.ts` | Обновить расчёт высот |
| `features/layout/lib/layoutSpacious.ts` | Обновить расчёт высот |
| `features/layout/lib/layoutCompact.ts` | Обновить расчёт высот |
| `features/layout/lib/layoutTreeDown.ts` | Обновить расчёт высот/ширин |
| `features/layout/lib/layoutTreeRight.ts` | Обновить расчёт высот |
| `features/layout/lib/layoutRadial.ts` | Обновить радиусы с учётом картинок |
| `entities/node/ui/NodeImage.vue` | Использовать константы из shared |
| `entities/node/ui/NodeNotesPreview.vue` | Использовать константы из shared |

## Приоритет

1. 🔴 **Фаза 1** — без этого всё остальное бессмысленно
2. 🔴 **Фаза 4** — синхронизация констант (можно параллельно с фазой 1)
3. 🟡 **Фаза 2** — учёт картинок
4. 🟡 **Фаза 3** — учёт заметок
5. 🟢 **Фаза 5** — тестирование
