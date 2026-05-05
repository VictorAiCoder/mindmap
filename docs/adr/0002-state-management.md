🎯 **Принято. Пишу ADR.**

📐 Резюме твоих ответов:
- **Статус решения:** не уточнил → беру **🅱 органически сложилось** (наиболее вероятно для одиночного проекта)
- **Боль:** ✅ нет
- **Критерий пересмотра:** server state → Pinia
- **Тесты:** не уточнил → **не упоминаю в ADR**, чтобы не врать

🛡️ Если 🅱 неверно — скажи после ревью, поправим одной строкой.

---

## 📝 ADR-0002 — готовый текст

📂 **Создай файл `docs/adr/0002-state-management.md`** со следующим содержимым:

```markdown
# ADR 0002: State Management — composables + provide/inject

**Статус:** Принято
**Дата:** 2025-01-05
**Контекст:** Архитектурная фиксация существующего решения (post-hoc ADR)

---

## Контекст

Mind Map App — Vue 3 SPA для одного пользователя, работающая полностью
локально (state хранится в IndexedDB / LocalStorage). Нужен механизм
**shared state** и **dependency injection** между:

- корнем приложения (`App.vue`),
- глубоко вложенными компонентами (`NotesPanel`, `MindMapCanvas`, …),
- 20+ composables, образующими доменные модули (`useHistory`,
  `useTreeOperations`, `useImageStorage`, …).

Стандартный путь Vue-сообщества для этой задачи — **Pinia**. Этот ADR
фиксирует, **почему проект использует встроенные средства Vue
(composables + provide/inject)** вместо Pinia, и при каких условиях
это решение должно быть пересмотрено.

## Решение

Используется иерархия composables с типобезопасным DI через
`InjectionKey<T>`.

### Архитектура

```
useMindMap()                    ← корневой composable, composition root
├── useHistory(document)        ← undo/redo, snapshot всего документа
├── useTreeOperations(...)      ← операции над деревом узлов
├── useImageStorage(images)     ← пул картинок с reference counting
├── useSegmentOperations(...)   ← операции над сегментами изображений
└── usePersistence(...)         ← export/import, LocalStorage

App.vue:
  const mindmap = useMindMap()
  provide(mindMapKey, mindmap)  ← единственный composition root

Глубоко вложенные потребители:
  const mindmap = injectStrict(mindMapKey)
```

### Ключевые паттерны

**1. Единый источник истины — документ целиком**

```ts
const document: Ref<MindMapDocument> = ref(
  loadFromStorage() ?? createDefaultDocument()
)
```

История снапшотит **документ** (дерево + пул картинок), а не отдельные
поля. Это даёт атомарный undo/redo для всех связанных изменений.

**2. Композитный фасад через `extends`**

```ts
// src/types/mindmap-api.ts
export interface MindMapApi
  extends TreeOperationsApi, PersistenceApi, SegmentOperationsApi {
  rootNode: Ref<MindMapNode>
  undo: () => void
  redo: () => void
  // ... корневые поля
}
```

Каждый модуль домена **владеет своим контрактом** (`TreeOperationsApi`
живёт рядом с `useTreeOperations`). Фасад `MindMapApi` объединяет их
через `extends`, не переопределяя.

**3. Типобезопасный DI через `Symbol` + `InjectionKey<T>`**

```ts
// src/types/injection-keys.ts
export const mindMapKey: InjectionKey<MindMapApi> = Symbol('mindmap')
export const notifyKey:  InjectionKey<NotifyFn>   = Symbol('notify')
```

`Symbol` исключает коллизии ключей. `InjectionKey<T>` обеспечивает
автоматическую типизацию на стороне потребителя — без `as` и `any`.

**4. Strict-инъекция с понятной ошибкой**

```ts
// src/shared/lib/injectStrict.ts
export function injectStrict<T>(key: InjectionKey<T> | string): T {
  const value = inject(key)
  if (value === undefined) {
    throw new Error(`No provider for ${String(key)}. ...`)
  }
  return value
}
```

Решает известную боль Vue DI: «забыл `provide` — получил `undefined`
без подсказки, где искать».

## Альтернативы

### Pinia — отвергнута

**Плюсы Pinia:**
- DevTools с time-travel и инспекцией state.
- Стандарт сообщества → проще онбординг.
- Pinia Colada для server state.

**Минусы для текущего проекта:**
- **Дополнительная зависимость** ради функциональности, которая
  закрывается 50 строками `useHistory` + `provide/inject`.
- **Stores как глобальные синглтоны** — не нужно для приложения с
  единственным `composition root`.
- **Нет server state** — главный сценарий Pinia (cache, refetch,
  optimistic updates) не применим: всё локально.
- **Дублирование реактивности** — Pinia стейт это `reactive`-обёртка
  поверх той же системы, что используют composables. Слой без выгоды.

### Vuex — не рассматривалась

Устарела для Vue 3, официально рекомендована миграция на Pinia.

### Чистые модули без DI (только импорты) — отвергнута

Привело бы к prop drilling через 3-4 уровня компонентов или к
синглтонам на уровне модулей (`export const state = ...`), что
ломает SSR-совместимость и тестируемость.

## Последствия

### ✅ Плюсы

- **Ноль зависимостей сверх Vue.** Меньше bundle, меньше уязвимостей.
- **Типобезопасность от ключа до потребителя.** `InjectionKey<T>` →
  `injectStrict<T>` → автодополнение в IDE без касталов.
- **State = функции.** Легко рефакторить, мокать, переиспользовать.
- **HMR работает из коробки.** Composables — обычные функции.
- **Локальность.** Контракт модуля живёт рядом с реализацией
  (см. ADR-0001).

### ⚠️ Компромиссы

- **Нет специализированных DevTools для state.** Vue DevTools
  показывают inject-значения, но без time-travel и diff'ов.
  Митигация: `useHistory` логирует операции; в DEV можно
  выставить `window.__mindmap__ = mindmap` для ручной инспекции.
- **Singleton-by-convention.** `useMindMap()` должен вызываться
  **один раз** в `App.vue`. Повторный вызов создаст параллельный
  state. Защита: соглашение в коде, нет runtime-проверки.
- **Сериализация/persistence пишем сами.** Нет встроенной
  `persist`-плагины как в Pinia. Митигация: `usePersistence` уже
  закрывает этот сценарий.

## Известный техдолг

📌 Этот раздел отражает **отступления от принципов** ADR в текущем
коде. Не блокирует — но должен быть устранён в следующих рефакторингах.

1. **Строковые ключи в `MindMapCanvas.vue`:**
   ```ts
   provide('globalZoom', panZoom.zoom)
   provide('imageStorage', mindmap.imageStorage)  // дубликат: уже в mindMapKey
   ```
   Должно быть: `InjectionKey<T>` в `src/types/injection-keys.ts`.

2. **`inject(key, null)` вместо `injectStrict<T>(key)`:**
   `NotesPanel.vue`, `ImportMarkdownHost.vue` используют ручную
   проверку на `null`. `injectStrict` написан, но не используется
   повсеместно.

3. **`useMindMap` ещё не переехал в FSD-структуру.** Живёт в
   `src/composables/useMindMap.ts`. Целевое расположение —
   `src/app/store/` или `src/entities/mindmap/model/`. См.
   `docs/MIGRATION.md`, Phase 4.

## Критерии пересмотра

Это решение **должно быть пересмотрено**, если выполнится **любое** из:

- 🔄 **Появится server state.** Cache, refetch, optimistic updates,
  background sync — это область Pinia + Pinia Colada (или TanStack
  Query). Реализовывать самостоятельно — антипаттерн.
- 👥 **Команда вырастет до 3+ разработчиков.** Стандартизация
  важнее минимализма зависимостей: Pinia как «общий язык».
- 🌐 **Появятся параллельные mind-map'ы в одном tab'е.** Текущий
  singleton-pattern не подходит для multi-document UI.

Если ничего из этого не происходит — **остаёмся на текущем
решении**. Оно проще, легче, типобезопаснее и закрывает все
потребности single-user single-document SPA.

## Связанные документы

- [ADR 0001: Организация типов](./0001-types-organization.md)
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — общая FSD-структура
- [`docs/MIGRATION.md`](../MIGRATION.md) — план миграции composables в FSD
```

