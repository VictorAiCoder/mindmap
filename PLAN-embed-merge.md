---
status: complete
phase: 5
updated: 2026-09-19
---

# Мерж EmbedCanvas в MindMapCanvas

## Goal
Удалить EmbedCanvas.vue и embed-алиасы, добавить пропс `embed` в MindMapCanvas для read-only режима.

## Context & Decisions

| Decision | Rationale | Source |
|----------|-----------|--------|
| Один usePanZoom с опцией embed | useEmbedPanZoom = пустой реэкспорт (1 строка), различий нет | Пользователь |
| Оставить MindmapViewer как entry point | Data loading, fullscreen, slots — отдельная ответственность | Пользователь |
| EmbedNode в embed-режиме | Read-only узел, без drag/edit/CRUD | Архитектура |

## Phase 1: Удалить embed-алиасы [COMPLETE]
- [x] 1.1 Удалить `embed/composables/useEmbedPanZoom.ts` (1 строка — пустой реэкспорт)
- [x] 1.2 Удалить `embed/composables/useEmbedConnections.ts` (1 строка — пустой реэкспорт)

## Phase 2: Добавить `embed` пропс в MindMapCanvas [COMPLETE]
- [x] 2.1 Добавить пропс `embed: boolean` (default: false)
- [x] 2.2 В template: условный рендер MapNode vs EmbedNode
- [x] 2.3 В template: скрыть panels/menus/controls в embed-режиме
- [x] 2.4 В script: условно пропустить provide, drag, edit, CRUD
- [x] 2.5 В script: условно пропустить hit-test, useNodeDrag, useHitTest

## Phase 3: Обновить MindmapViewer [COMPLETE]
- [x] 3.1 Заменить `<EmbedCanvas>` на `<MindMapCanvas embed :root-node="rootNode" />`
- [x] 3.2 Прокинуть previewMode, showNotes, showImages
- [x] 3.3 Fullscreen overlay тоже использует MindMapCanvas(embed=true)

## Phase 4: Удалить EmbedCanvas [COMPLETE]
- [x] 4.1 Удалить `embed/components/EmbedCanvas.vue` (245 строк)
- [x] 4.2 Удалить `embed/components/EmbedNode.vue` — ПРОВЕРИТЬ: используется ли где-то ещё

## Phase 5: Build verification [COMPLETE]
- [x] 5.1 Embed build PASSED

## Notes
- **Итоги:**
  - Удалено 4 файла: EmbedCanvas.vue (245 строк), useEmbedPanZoom.ts (1), useEmbedConnections.ts (1), EmbedCanvas export из index.ts
  - MindMapCanvas: добавлен пропс `embed` + `imagePool`, `showNotes`, `showImages`, `previewMode`
  - MindmapViewer: EmbedCanvas заменён на MindMapCanvas(embed=true) с createEmbedApi()
  - EmbedNode и его sub-components СОХРАНЕНЫ (используются MindMapCanvas в embed-режиме)
  - Embed build PASSED (13.74s, 2283 modules, 61 chunks)
- useEmbedPanZoom.ts = 1 строка (реэкспорт usePanZoom)
- useEmbedConnections.ts = 1 строка (реэкспорт useConnections)
- EmbedCanvas = 245 строк, 3 composable (useLayout + usePanZoom + useConnections), 1 child (EmbedNode)
- MindMapCanvas = 495 строк, 8 composable, 8 child components
- Общее: useLayout, usePanZoom, useConnections, SVG connections, pan/zoom, bounds
