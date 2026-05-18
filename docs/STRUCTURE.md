# Структура проекта

Проект использует **Feature-Sliced Design (FSD) v2.1**.

## Слои (сверху вниз)

| Слой | Назначение | Зависит от |
|------|-----------|------------|
| `app/` | Точка входа, провайдеры, корневой store | всех нижележащих |
| `widgets/` | Композитные блоки UI: холст, тулбар | `features`, `entities`, `shared` |
| `features/` | Действия пользователя | `entities`, `shared` |
| `entities/` | Бизнес-сущности: mindmap, node, image | `shared` |
| `shared/` | Утилиты, конфиги | — (только npm) |

**Правило:** импорты только сверху вниз.

## Структура слайса

```
slice/
├── index.ts        ← Public API
├── model/          ← state, types, composables
├── ui/             ← Vue-компоненты
└── lib/            ← вспомогательные функции
```

## Карта файлов

### app/ — инициализация

| Файл | Назначение |
|------|-----------|
| `App.vue` | Корневой компонент: provide, toolbar, snackbar |
| `MindMap.vue` | Обёртка canvas с gallery-open |
| `model/useHistory.ts` | Generic undo/redo (до 50 шагов) |
| `model/useTheme.ts` | Light/dark singleton + localStorage |
| `providers/injection-keys.ts` | Типизированные InjectionKey |
| `store/useMindMap.ts` | Главный фасад: MindMapApi |
| `store/useImageStorage.ts` | CRUD пула изображений (raw + segments) |

### entities/ — доменные сущности

#### mindmap/ — документ + tree-операции

| Файл | Назначение |
|------|-----------|
| `model/types.ts` | MindMapDocument |
| `model/useNodeFactory.ts` | Создание узлов и дефолтного документа |
| `model/useTreeOperations.ts` | CRUD: add, delete, move, reparent, scale |
| `model/useTreeTraversal.ts` | Read-only: find, walk, count, depth |

#### node/ — узел дерева

| Файл | Назначение |
|------|-----------|
| `model/types.ts` | MindMapNode, ScenePosition, Center2D |
| `model/constants.ts` | NODE_SCALE (min/max/default/step) |
| `model/drag.ts` | NodeDragState |
| `model/emits.ts` | NodeImageEmits |
| `model/useNodeScale.ts` | clampScale, normalizeScale |
| `ui/MapNode.vue` | Рендеринг узла |
| `ui/NodeContent.vue` | Текст узла |
| `ui/NodeImage.vue` | Изображение узла |
| `ui/NodeNotesPreview.vue` | Превью заметки |

#### image/ — изображения

| Файл | Назначение |
|------|-----------|
| `model/types.ts` | Clip, RawImage, ImageSegment, StoredImage |

### features/ — пользовательские сценарии

#### layout/ — автоматическая раскладка

| Файл | Назначение |
|------|-----------|
| `model/types.ts` | LayoutPosition, LayoutBounds, LayoutData |
| `model/useLayout.ts` | Вычисление позиций + bounds |
| `model/useAutoLayout.ts` | resetLayout, applyAutoLayout |
| `lib/layoutUtils.ts` | Общая геометрия |
| `lib/layoutCompact.ts` | Компактная раскладка |
| `lib/layoutMindMap.ts` | Mind-map раскладка |
| `lib/layoutRadial.ts` | Радиальная раскладка |
| `lib/layoutSpacious.ts` | Просторная раскладка |
| `lib/layoutTreeDown.ts` | Дерево вниз |
| `lib/layoutTreeRight.ts` | Дерево вправо |

#### persistence/ — импорт/экспорт

| Файл | Назначение |
|------|-----------|
| `model/usePersistence.ts` | exportTree, importTree, localStorage |
| `lib/importMarkdown.ts` | markdown → MindMapNode |
| `lib/exportMarkdown.ts` | MindMapNode → markdown |
| `ui/ImportMarkdownDialog.vue` | Диалог импорта |
| `ui/ImportMarkdownHost.vue` | Хост импорта |

#### notes/ — заметки узлов

| Файл | Назначение |
|------|-----------|
| `model/useMarkdown.ts` | marked + DOMPurify + highlight.js |
| `model/hljsSetup.ts` | Регистрация 50+ языков |
| `ui/NotesPanel.vue` | Редактор заметок |
| `ui/NotesToolbar.vue` | Тулбар заметок |

#### node-actions/ — контекстное меню

| Файл | Назначение |
|------|-----------|
| `model/useNodeMenu.ts` | Логика меню |
| `ui/NodeActions.vue` | Кнопки действий |
| `ui/NodeActionsMenu.vue` | Выпадающее меню |

#### image-gallery/ — галерея + сегменты

| Файл | Назначение |
|------|-----------|
| `model/useSegmentEditor.ts` | Редактор сегментов |
| `model/useSegmentOperations.ts` | Операции с сегментами |
| `ui/ImageGalleryPanel.vue` | Панель галереи |
| `ui/ImageGalleryCard.vue` | Карточка изображения |
| `ui/ImagePreview.vue` | Превью |
| `ui/SegmentCanvas.vue` | Canvas для сегментов |
| `ui/SegmentEditorPanel.vue` | Панель редактора сегментов |

### widgets/ — композитные UI-блоки

#### canvas/ — холст

| Файл | Назначение |
|------|-----------|
| `model/useConnections.ts` | SVG Bezier-связи между узлами |
| `model/useNodeDrag.ts` | Drag-and-drop узлов |
| `model/usePanZoom.ts` | Pan, zoom, focusOnNode |
| `ui/MindMapCanvas.vue` | Главный виджет холста |
| `ui/CanvasControls.vue` | Кнопки zoom |
| `ui/DragHint.vue` | Визуальная подсказка drag |

#### toolbar/ — верхняя панель

| Файл | Назначение |
|------|-----------|
| `ui/ToolbarPanel.vue` | Панель инструментов |

### shared/ — инфраструктура

| Файл | Назначение |
|------|-----------|
| `config/constants.ts` | STORAGE_KEY, MAX_HISTORY, NODE_COLORS, размеры |
| `lib/bezier.ts` | calcBezierPath (кубические кривые) |
| `lib/injectStrict.ts` | Строгий inject с throw |
| `lib/useImageHandler.ts` | Обработка изображений |

### types/ — legacy (в процессе удаления)

| Файл | Назначение |
|------|-----------|
| `mindmap-api.ts` | MindMapApi фасад (re-exports) |
