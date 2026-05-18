# Layout — автоматическая раскладка mind map

Фича отвечает за вычисление позиций узлов на канвасе и применение алгоритмов раскладки.

## Архитектура

```
layout/
├── index.ts              ← Public API (barrel)
├── model/
│   ├── types.ts          ← LayoutPosition, LayoutBounds, LayoutData, PositionMap
│   ├── useLayout.ts      ← Composable: реактивный расчёт позиций + bounds
│   └── useAutoLayout.ts  ← applyAutoLayout(), resetLayout(), реестр LAYOUT_TYPES
└── lib/
    ├── types.ts          ← LayoutType, LayoutFn, LayoutDescriptor
    ├── layoutUtils.ts    ← Общие утилиты: размеры, subtree height/width
    ├── layoutMindMap.ts  ← Двусторонняя (left/right) — классическая mind map
    ├── layoutSpacious.ts ← Двусторонняя, увеличенные зазоры
    ├── layoutCompact.ts  ← Однонаправленная (вправо), минимальные зазоры
    ├── layoutTreeDown.ts ← Вертикальное дерево (сверху вниз)
    ├── layoutTreeRight.ts← Горизонтальное дерево (слева направо)
    └── layoutRadial.ts   ← Радиальная (круговая) раскладка
```

## Public API

```ts
// Composable — реактивный расчёт позиций
const { layoutData } = useLayout(rootNode)
// layoutData.value.positions  → LayoutPosition[]
// layoutData.value.bounds     → LayoutBounds

// Применение раскладки (мутирует customX/customY узлов)
applyAutoLayout(root, 'mindmap')

// Сброс кавтоматическим позициям
resetLayout(root)

// Реестр раскладок для UI
LAYOUT_TYPES.mindmap.label   // 'Mind Map'
LAYOUT_TYPES.mindmap.icon    // 'mdi-brain'
LAYOUT_TYPES.mindmap.fn(root) // → Map<string, ScenePosition>
```

## Алгоритмы

| Тип | Направление | Зазоры | Описание |
|-----|-------------|--------|----------|
| `mindmap` | ← root → | средние | Классическая: дети чередуются left/right |
| `spacious` | ← root → | большие | Как mindmap, но с увеличенными отступами |
| `compact` | root → | минимальные | Всё вправо, плотная упаковка |
| `treeDown` | root ↓ | средние | Вертикальное дерево, org-chart стиль |
| `treeRight` | root → | средние | Горизонтальное дерево |
| `radial` | root ○ | угловые | Круговая раскладка, decay угла |

## Как работает useLayout

1. **`calcAutoPositions(root)`** — рекурсивный обход дерева, вычисление позиций
   - Корень центрируется по X (`DEFAULT_CENTER_X = 1200`)
   - Дети делятся на left/right (чётные/нечётные индексы)
   - Высота поддерева = max(self, sum(children) + gaps)
   - Учитывается `node.scale` для размеров
   - Узлы с `customX/customY` используют свои координаты

2. **`calcPositions(root)`** — мёржит auto-позиции с custom-позициями
   - Если `customX != null && customY != null` → берётся custom
   - Иначе → auto из алгоритма
   - Флаг `hasCustomPos` для UI-индикации

3. **`calcBounds(positions)`** — bounding box всех узлов + `CANVAS_PADDING`

## Как работает applyAutoLayout

```ts
applyAutoLayout(root, 'mindmap')
```

1. Берёт `LayoutFn` из `LAYOUT_TYPES[type]`
2. Вызывает `layout.fn(root)` → `Map<id, {x, y}>`
3. Обходит дерево через `traverseTree`, записывает `node.customX = pos.x`, `node.customY = pos.y`

## Как работает resetLayout

```ts
resetLayout(root)
```

Обходит дерево, устанавливает `node.customX = null`, `node.customY = null` — узлы возвращаются к auto-позициям из `useLayout`.

## Утилиты (layoutUtils.ts)

| Функция | Назначение |
|---------|-----------|
| `getNodeWidth(depth)` | Ширина узла: ROOT_W для корня, NODE_W для остальных |
| `getNodeHeight(node, depth)` | Высота с учётом превью заметок |
| `calcSubtreeHeight(node, depth, vGap)` | Высота поддерева (для горизонтальных layout) |
| `calcSubtreeWidth(node, depth, hGap)` | Ширина поддерева (для вертикальных layout) |
| `splitChildrenLeftRight(children)` | Чередование: чётные → right, нечётные → left |
| `calcGroupHeight(nodes, depth, vGap)` | Суммарная высота группы с зазорами |

## Зависимости

- `@entities/node` — MindMapNode, ScenePosition, NODE_SCALE
- `@entities/mindmap` — traverseTree
- `@shared/config/constants` — размеры, зазоры, padding

## Добавление новой раскладки

1. Создать файл `lib/layoutNew.ts` с функцией:
   ```ts
   export function layoutNew(root: MindMapNode): Map<string, ScenePosition> {
     // ... расчёт позиций
     return positions
   }
   ```

2. Добавить тип в `lib/types.ts`:
   ```ts
   export type LayoutType = 'mindmap' | ... | 'new'
   ```

3. Зарегистрировать в `model/useAutoLayout.ts`:
   ```ts
   import { layoutNew } from '../lib/layoutNew'
   
   export const LAYOUT_TYPES: Record<LayoutType, LayoutDescriptor> = {
     // ...
     new: { label: 'Новая', icon: 'mdi-star', fn: layoutNew }
   }
   ```
