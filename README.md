# MindMap

Редактор mind map, где источник данных — обычный markdown-файл. Импортируй `.md` — получи интерактивную карту. Редактируй визуально — экспортируй обратно в чистый markdown.

![Vue 3](https://img.shields.io/badge/Vue-3.5-42b883?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/tested_with-Vitest-6e9f18?logo=vitest&logoColor=white)
![FSD](https://img.shields.io/badge/architecture-FSD%20v2.1-3b82f6?logo=figma&logoColor=white)

---

## Зачем

- **Работа с LLM** — ответ от ChatGPT/Claude → навигируемая карта
- **Базы знаний в Git** — diff'ы, code review, версионирование
- **Обратимая сериализация** — визуальное изменение = чистый markdown

## Возможности

- Двунаправленный markdown I/O
- Автоматическая раскладка с кастомными позициями
- Markdown-заметки с GFM (таблицы, чек-листы)
- Подсветка 50+ языков (highlight.js, ~40 КБ gzip)
- Галерея изображений с drag-and-drop и сегментным редактором
- Undo/redo (до 50 шагов)
- Pan & zoom с Bezier-кривыми
- Drag-and-drop дерева
- Светлая/тёмная тема (Vuetify)
- XSS-защита (DOMPurify)
- Масштабирование узлов (0.75x — 2.5x)

## Архитектура

**Feature-Sliced Design v2.1** — строгая иерархия слоёв:

```
app/ → widgets/ → features/ → entities/ → shared/
```

Импорты только сверху вниз. Public API через `index.ts`.

## Быстрый старт

```bash
npm install
npm run dev         # порт 3000
npm run build       # type-check + bundle
npm run test        # vitest
```

Требования: Node.js `^20.19.0` или `>=22.12.0`.

## Стек

Vue 3 + TypeScript + Vite 7 + Vuetify 4 + Vitest + FSD v2.1

Без lodash, Pinia, Axios, moment.

## Документация

| Файл | Содержание |
|------|-----------|
| [docs/STRUCTURE.md](docs/STRUCTURE.md) | Карта всех файлов проекта |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Архитектурные решения |
| [docs/STACK.md](docs/STACK.md) | Стек, запуск, тестирование |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Детальное описание FSD |
| [docs/MIGRATION.md](docs/MIGRATION.md) | План миграции на FSD |
| [docs/adr/](docs/adr/) | Architecture Decision Records |

---

Приватный проект. Все права защищены.
