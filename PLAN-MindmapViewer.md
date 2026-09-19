---
status: complete
phase: 5
updated: 2026-09-19
---

# Рефакторинг MindmapViewer.vue

## Goal
Разбить MindmapViewer.vue (359 строк, 208 script) на composable-модули, убрать DRY-нарушение в tree processing, вынести fullscreen и data loading.

## Context & Decisions

| Decision | Rationale | Source |
|----------|-----------|--------|
| Minimal fullscreen (без state machine) | 20 строк логики — state machine overengineering | Аналитический обзор |
| processTree объединяет applyAccentColor + collapseBeyondDepth | DRY: дублировалось в parseMarkdown и loadFromApi | Аналитический обзор |
| useMindMapData с toRef для slug/markdown/maxDepth | Реактивные watchers внутри composable | Аналитический обзор |
| CSS class вместо inline-style для fullscreen | Чистота, переиспользуемость | Аналитический обзор |

## Phase 1: treeManipulators.ts [COMPLETE]
- [x] 1.1 Создать `embed/lib/treeManipulators.ts` (55 строк)
  - Экспортирует: `processTree`, `applyAccentColor`, `collapseBeyondDepth`, `ENC_ACCENT`
  - Использует `traverseTree` из `@entities/mindmap`

## Phase 2: useMindMapData composable [COMPLETE]
- [x] 2.1 Создать `embed/composables/useMindMapData.ts` (119 строк)
  - Экспортирует: `rootNode`, `imagePool`, `isLoading`
  - Принимает: `slug`, `markdown`, `maxDepth` (как Ref)
  - Внутри: `loadFromApi`, `parseMarkdown`, `loadOrParse`, watchers, onMounted
- [x] 2.2 Устраняет DRY: loading pipeline в одном месте

## Phase 3: useFullscreen composable [COMPLETE]
- [x] 3.1 Создать `embed/composables/useFullscreen.ts` (42 строки)
  - Экспортирует: `isFullscreen`, `enter`, `exit`
  - Внутри: Escape listener + cleanup on unmount

## Phase 4: CSS cleanup [COMPLETE]
- [x] 4.1 Заменить inline-style для fullscreen на `.mindmap-viewer--fullscreen` CSS class
- [x] 4.2 Упростить `viewerStyle` до `{ height: props.height }`

## Phase 5: Integration + Build [COMPLETE]
- [x] 5.1 Обновить MindmapViewer.vue: импортировать composables, удалить inline-логику
- [x] 5.2 Embed build PASSED (11.88s)

## Notes
- 2026-09-19: Рефакторинг завершён. Embed build PASSED.
- **Итоги:**
  - MindmapViewer.vue: 359 → 242 строки (−117, −33%)
  - script setup: 208 → 80 строк (−128, −62%)
  - 3 новых файла: treeManipulators.ts (55), useMindMapData.ts (119), useFullscreen.ts (42)
  - DRY-нарушение устранено: processTree вызывается в одном месте
  - Fullscreen: minimal composable (ref + enter/exit + Escape + cleanup)
