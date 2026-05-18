# Стек и запуск

## Технологический стек

| Слой | Выбор | Почему |
|------|-------|--------|
| Фреймворк | Vue 3 (Composition API) | First-class TypeScript, гранулярная реактивность |
| Язык | TypeScript (strict) | Ловит ошибки на этапе компиляции |
| UI-тулкит | Vuetify 4 | Зрелая темизация, design-токены, a11y |
| Архитектура | Feature-Sliced Design v2.1 | Чёткие слои, строгие импорты |
| Сборка | Vite 7 | Быстрый, ESM-native |
| Тесты | Vitest + happy-dom | Интегрирован с Vite |
| Markdown | marked + marked-highlight | Расширяемый, стандарты |
| Санитизация | DOMPurify | Защита от XSS |
| Подсветка | highlight.js (tree-shaken) | 50+ языков, ~40 КБ gzip |
| Иконки | Material Design Icons | 7000+ иконок |

**Чего нет**: lodash, Pinia, Axios, moment.

---

## Запуск

### Требования

- Node.js `^20.19.0` или `>=22.12.0`

### Установка

```bash
npm install
```

### Разработка

```bash
npm run dev         # Vite, порт 3000
npm run test:watch  # Тесты watch
```

### Продакшн

```bash
npm run build       # type-check + бандлинг
npm run preview     # просмотр сборки
```

### Проверки

```bash
npm run type-check  # vue-tsc --build
npm run test        # vitest run
```

---

## Тестирование

Тесты покрывают **чистую доменную логику**:

| Файл | Что проверяет |
|------|--------------|
| `shared/lib/__tests__/bezier.spec.ts` | Геометрия кривых |
| `widgets/canvas/model/__tests__/useConnections.spec.ts` | Граф связей |

UI-компоненты не покрываются юнит-тестами — сценарии лучше покрывать E2E.

Pre-commit хук (`husky`) запускает `npm test`.

---

## Принципы

- **Markdown — источник истины**
- **FSD-слои** — строгая иерархия зависимостей
- **Composition вместо inheritance**
- **Explicit вместо implicit**
- **Single Responsibility**
- **Никакого vendor lock-in**
