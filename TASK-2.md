# TASK-2: Исправление наложения узлов на глубине 3+ уровней

## Проблема

После внедрения `getNodeDimensions()` узлы на уровнях 1-2 отображаются корректно, но на уровнях 3+ происходит наложение. Причина: алгоритм `placeBranch()` использует `coreHeight` для позиционирования родительского узла, но `subtreeHeight()` возвращает `totalHeight` (включая картинку и заметки). Это создаёт рассогласование:

```
Родитель позиционируется по coreHeight (40px):
    ┌─────────────┐
    │  NODE CORE  │  ← центр в yCenter
    └─────────────┘
          │
    [заметки до 152px ниже]  ← НЕ учтено при позиционировании!
          │
    Дети начинаются с yCenter - totalH/2  ← перекрывают заметки родителя!
```

## Анализ кода

### useLayout.ts — placeBranch()

```ts
function placeBranch(..., yCenter: number, ...) {
  const dims = getNodeDimensions(node, depth)
  const w = dims.coreWidth
  const h = dims.coreHeight  // ← используется coreHeight

  map.set(node.id, { x: effX, y: effY, w, h, depth })
  // effY = node.customY ?? (yCenter - h / 2)  ← центр по coreHeight!

  if (node.collapsed || !node.children?.length) return

  const childHeights = node.children.map(c => subtreeHeight(c, depth + 1))
  const totalH = childHeights.reduce(...) + gaps

  let cy = effYCenter - totalH / 2  // ← дети центрируются в totalH

  node.children.forEach((child, i) => {
    placeBranch(child, childX, cy + childHeights[i] / 2, side, depth + 1)
    cy += childHeights[i] + GAP_V
  })
}
```

**Проблема:** 
- Родитель центрируется по `coreHeight` (40px)
- Дети распределяются в пространстве `totalH` (которое может быть 40 + 6 + 120 + 6 + 152 = 324px)
- Если у родителя есть заметки, они занимают пространство между `coreHeight` и `totalHeight`, но дети уже начинают размещаться с учётом этого пространства → перекрытие

### subtreeHeight()

```ts
function subtreeHeight(node, depth): number {
  const dims = getNodeDimensions(node, depth)
  const selfH = dims.totalHeight  // ← правильно: totalHeight

  if (node.collapsed || !node.children?.length) return selfH

  const childrenH = node.children.reduce(
    (sum, child) => sum + subtreeHeight(child, depth + 1),
    0
  )
  const gaps = (node.children.length - 1) * GAP_V

  return Math.max(selfH, childrenH + gaps)  // ← максимум из self и детей
}
```

Эта функция **правильная** — она возвращает `totalHeight`. Проблема в том, как `placeBranch()` использует это значение.

## Решение

Нужно изменить логику `placeBranch()` так, чтобы:

1. **Родитель позиционировался по `totalHeight`**, а не `coreHeight`
2. **Дети начинались ниже полного bounding box родителя** (включая картинку сверху и заметки снизу)

### Вариант A: Позиционирование по totalHeight

```ts
function placeBranch(..., yCenter: number, ...) {
  const dims = getNodeDimensions(node, depth)
  const w = dims.coreWidth
  const totalH = dims.totalHeight  // ← используем totalHeight

  // Центр узла смещаем так, чтобы ядро было в yCenter,
  // но bounding box учитывал картинку и заметки
  const yOffset = (dims.imageHeight + NODE_IMAGE.MARGIN)  // смещение вверх из-за картинки
  const effY = (node.customY ?? yCenter) - dims.coreHeight / 2 + yOffset

  map.set(node.id, { x: effX, y: effY, w, h: dims.coreHeight, depth })

  if (node.collapsed || !node.children?.length) return

  // Дети начинаются ниже полного bounding box родителя
  const parentBottom = effY + dims.coreHeight + (dims.notesHeight > 0 ? NODE_NOTES.MARGIN + dims.notesHeight : 0)
  
  const childHeights = node.children.map(c => subtreeHeight(c, depth + 1))
  const totalChildrenH = childHeights.reduce((s, v) => s + v, 0) + (childHeights.length - 1) * GAP_V

  // Начальная Y для детей — ниже родителя с зазором
  let cy = parentBottom + GAP_V

  node.children.forEach((child, i) => {
    placeBranch(child, childX, cy + childHeights[i] / 2, side, depth + 1)
    cy += childHeights[i] + GAP_V
  })
}
```

**Проблема варианта A:** Меняет семантику `yCenter` — теперь это не центр узла, а точка привязки. Может сломать другие части алгоритма.

### Вариант B: Раздельное хранение core и total размеров

Более чистый подход — хранить в `AutoPos` оба размера:

```ts
interface AutoPos {
  x: number
  y: number        // Y позиции (верхний левый угол ядра)
  w: number        // coreWidth
  h: number        // coreHeight
  totalHeight: number  // полная высота с картинкой и заметками
  imageHeight: number  // высота картинки (для расчёта отступов)
  notesHeight: number  // высота заметок
  depth: number
}
```

Тогда `calcBounds()` сможет использовать `totalHeight` для правильного расчёта границ, а позиционирование останется через `coreHeight`.

### Вариант C: Увеличение GAP_V динамически

Самый простой фикс — увеличить вертикальный зазор когда у узла есть заметки или картинка:

```ts
function effectiveGapV(node: MindMapNode): number {
  const dims = getNodeDimensions(node, depth)
  let extra = 0
  if (dims.imageHeight > 0) extra += NODE_IMAGE.MARGIN + dims.imageHeight
  if (dims.notesHeight > 0) extra += NODE_NOTES.MARGIN + dims.notesHeight
  return GAP_V + extra
}
```

И использовать `effectiveGapV` вместо `GAP_V` в `subtreeHeight()` и `placeBranch()`.

## Рекомендуемое решение

**Вариант B** — наиболее правильный архитектурно. Нужно:

1. Расширить `AutoPos` дополнительными полями
2. В `calcAutoPositions()` сохранять `totalHeight`, `imageHeight`, `notesHeight`
3. В `calcBounds()` использовать `totalHeight` для расчёта maxY
4. В `placeBranch()` использовать `totalHeight` для расчёта начальной Y детей

## Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `features/layout/model/useLayout.ts` | Расширить `AutoPos`, обновить `calcAutoPositions()`, `placeBranch()`, `calcBounds()` |
| `features/layout/lib/layoutMindMap.ts` | Аналогичные изменения для applyAutoLayout |
| `features/layout/lib/layoutSpacious.ts` | Аналогичные изменения |
| `features/layout/lib/layoutCompact.ts` | Аналогичные изменения |
| `features/layout/lib/layoutTreeRight.ts` | Аналогичные изменения |
| `features/layout/lib/layoutRadial.ts` | Увеличить BASE_RADIUS ещё больше (до 480) |

## Приоритет

🔴 **Высокий** — без этого layout непригоден для глубоких деревьев (3+ уровня).
