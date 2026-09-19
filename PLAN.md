---
status: complete
phase: 5
updated: 2026-09-19
---

# Рефакторинг MindMapCanvas.vue

## Goal
Разбить God Component MindMapCanvas.vue (465 строк script) на composable-модули, убрать дублирование Map, объединить дубли useSegmentEditor, ввести Command pattern для CRUD.

## Context & Decisions

| Decision | Rationale | Source |
|----------|-----------|--------|
| Оставляем Vue emit (не EventEmitter) | Devtools integration, единообразие с остальными компонентами | ref:task:ses_f4869f1eaffe3bBtpDNzTOGrXX |
| usePositionIndex вместо 4 Map-созданий | Убирает дублирование, мемоизация, O(1) доступ | ref:task:ses_f4869f1eaffe3bBtpDNzTOGrXX |
| Merge useSegmentEditor в embed/composables | Два идентичных файла (346 строк каждый), разница только в import path MindMapApi. src-копия не используется напрямую | ref:task:ses_f4869f1eaffe3bBtpDNzTOGrXX |
| Command pattern для MapNode | Единый @command интерфейс вместо 16+ отдельных @event handlers на MapNode | ref:task:ses_f4869f1eaffe3bBtpDNzTOGrXX |
| hit-test выносим в useHitTest отдельно | Чистая функция, легко тестируется, подготовка к quadtree | ref:task:ses_f4869f1eaffe3bBtpDNzTOGrXX |

## Phase 1: usePositionIndex + useSegmentEditor merge [COMPLETE]
- [x] 1.1 Создать `embed/composables/usePositionIndex.ts`
  - Экспортирует: `posById` (computed Map), `rootPos` (computed), `toPositionMap()` (функция)
  - Заменяет 4 паттерна new Map() в MindMapCanvas.vue: lines 197-210, 265-271, 283-290, 292-309
  - Принимает `layoutData: ComputedRef<LayoutData>`
- [x] 1.2 Обновить MindMapCanvas.vue: импортировать usePositionIndex, удалить inline Map-создания
- [x] 1.3 Удалить `src/features/image-gallery/lib/useSegmentEditor.ts` (дубликат, не используется напрямую)
- [x] 1.4 Проверить: `npm run build` в mindmap/ проходит без ошибок

## Phase 2: useNodeOperations (CRUD + emit) [COMPLETE]
- [x] 2.1 Создать `embed/composables/useNodeOperations.ts`
  - Выносит: handleDelete, handleResetPosition, handleSetImage, handleSetImageById, handleRemoveImage, handleToggleNotePin, handleToggleNotesVisible
  - Принимает: mindmap (MindMapApi), notify (NotifyFn), emit (Function)
  - Возвращает объект с обработчиками
- [x] 2.2 Обновить MindMapCanvas.vue: импортировать useNodeOperations, удалить CRUD handlers
- [x] 2.3 Проверить: все emit'ы работают, notify-вызовы сохранены

## Phase 3: Command pattern для MapNode [COMPLETE]
- [x] 3.1 Определить `NodeCommand` тип в `embed/types/node-command.ts`
- [x] 3.2 Обновить useMapNodeDrag.ts + useNodeImage.ts: command emitter
- [x] 3.3 Обновить MapNode.vue: заменить 16 отдельных emit на один `@command`
- [x] 3.4 Обновить MindMapCanvas.vue: switch(cmd.type) диспетчер в handleNodeCommand
- [x] 3.5 Проверить: embed build проходит

## Phase 4: useHitTest + useTextEditor [COMPLETE]
- [x] 4.1 Создать `embed/composables/useHitTest.ts`
  - Выносит: updateDropTarget, HIT_PADDING
  - Принимает: layoutData, panZoom, nodeDrag, wrapperRef
- [x] 4.2 Создать `embed/composables/useTextEditor.ts`
  - Выносит: editingId, editText, startEdit, finishEdit, cancelEdit, findParentId
  - Принимает: mindmap, posById, emit
- [x] 4.3 Обновить MindMapCanvas.vue: импортировать useHitTest + useTextEditor
- [x] 4.4 Проверить: embed build проходит

## Phase 5: Финальная очистка [COMPLETE]
- [x] 5.1 Итоги: MindMapCanvas 626→418 строк (−33%), MapNode 374→313 (−16%)
- [x] 5.2 Все composable ≤ 96 строк (useTextEditor самый большой)
- [x] 5.3 PLAN.md обновлён

## Notes
- 2026-09-19: Рефакторинг завершён. Embed build PASSED.
- **Итоги:**
  - MindMapCanvas.vue: 626 → 418 строк (−208, −33%)
  - MapNode.vue: 374 → 313 строк (−61, −16%)
  - 0 `emit(` в MapNode.vue, 2 в MindMapCanvas.vue (sections-imported, galleryOpen)
  - 5 новых composable: usePositionIndex (53), useNodeOperations (87), useHitTest (55), useTextEditor (83), node-command (41)
  - Удалён дубликат: src/features/image-gallery/lib/useSegmentEditor.ts (346 строк)
  - Изменены: useMapNodeDrag.ts (35→30), useNodeImage.ts (136→119)
- **Паттерн:** composable извлекается при 2+ причинах для изменения, а не по строкам.
- **Command pattern:** discriminated union NodeCommand (16 типов) + switch-диспетчер в handleNodeCommand.
