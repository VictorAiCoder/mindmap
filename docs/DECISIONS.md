# Архитектурные решения

## 1. Composition-first, без state-менеджеров

Ни Pinia, ни Vuex. Всё состояние живёт в **composable-функциях**:

| Composable | Слой | Ответственность |
|------------|------|-----------------|
| `useMindMap` | `app/store/` | Корневой оркестратор, MindMapApi |
| `useHistory` | `app/model/` | Стек undo/redo (до 50 шагов) |
| `useTheme` | `app/model/` | Light/dark singleton + localStorage |
| `useImageStorage` | `app/store/` | CRUD пула изображений |
| `useLayout` | `features/layout/` | Вычисление позиций узлов |
| `usePersistence` | `features/persistence/` | Импорт/экспорт, localStorage |
| `useMarkdown` | `features/notes/` | Рендеринг markdown + санитизация |
| `useConnections` | `widgets/canvas/` | SVG Bezier-связи |
| `useNodeDrag` | `widgets/canvas/` | Drag-and-drop узлов |
| `usePanZoom` | `widgets/canvas/` | Pan, zoom, фокусировка |
| `useTreeOperations` | `entities/mindmap/` | CRUD дерева |
| `useTreeTraversal` | `entities/mindmap/` | Read-only обход |

## 2. Типобезопасный dependency injection

- `app/providers/injection-keys.ts` — `InjectionKey<T>` токены
- `shared/lib/injectStrict.ts` — обёртка с throw при отсутствии

```ts
const api = injectStrict(mindMapKey)  // MindMapApi, non-null
```

## 3. Доменная логика отделена от UI (SRP)

`entities/mindmap/model/` разделён по Single Responsibility:

- **`useNodeFactory.ts`** — создание узлов (Factory)
- **`useTreeOperations.ts`** — мутации (Command)
- **`useTreeTraversal.ts`** — read-only запросы (Visitor)

Undo/redo — бесплатное следствие архитектуры: `useHistory` снапшотит документ до каждой мутации.

## 4. Обратимая markdown-сериализация

`importMarkdown.ts` и `exportMarkdown.ts` — обратные функции: `export(import(md)) ≈ md`.

- Нет проприетарного формата
- Читаемые diff'ы в Git
- Авто-чистка неиспользуемых картинок при экспорте

## 5. Единая точка рендеринга markdown

`features/notes/model/useMarkdown.ts` — единственный вызов `marked.parse`:

- XSS-санитизация через DOMPurify
- Подсветка синтаксиса в одном месте
- Смена движка = правка одного файла

## 6. Tree-shaken подсветка

50+ языков регистрируются явно в `hljsSetup.ts`. Размер: **~40 КБ gzip** вместо ~300 КБ.

## 7. Bezier-кривые

Связи — кубические кривые Безье (`shared/lib/bezier.ts`). Модуль чистый, покрыт тестами.

## 8. Изображения: Raw + Segments

- **RawImage** — загруженный файл (base64 dataUrl)
- **ImageSegment** — вырезка (clip) из RawImage с нормализованными координатами [0..1]

Сегменты не дублируют данные — ссылка через `sourceId`.

## 9. Темизация через Vuetify

Все стили через CSS-переменные Vuetify. Переключение темы — один вызов API.

## 10. Типобезопасность на сборке

`vue-tsc --build` параллельно с Vite. TypeScript strict mode. `noUncheckedIndexedAccess` включён.
