Here is the complete structured report of the mindmap project.

---

# Mindmap Project -- Complete Codebase Analysis

## 1. Full Directory Tree

```
A:\_OpenCode\mindmap\
├── .git/
├── .gitignore
├── .husky/
├── .vscode/
│   └── extensions.json
├── dist/                              (build output, not analyzed)
├── docs/
│   ├── ARCHITECTURE.md                (405 lines) -- canonical FSD doc
│   ├── DECISIONS.md
│   ├── EMBED.md
│   ├── MIGRATION.md
│   ├── STACK.md
│   ├── STRUCTURE.md                   (160 lines)
│   ├── пример.png
│   └── adr/
│       ├── 0001-types-organization.md
│       └── 0002-state-management.md
├── embed/                             (EMBED LIBRARY -- exported as npm package)
│   ├── index.ts                       (40 lines) -- public API barrel
│   ├── injection-keys.ts              (57 lines) -- InjectionKey<T> symbols
│   ├── MindmapViewer.vue              (373 lines) -- root embed component
│   ├── types.ts                       (14 lines) -- re-exports
│   ├── components/
│   │   ├── CanvasControls.vue
│   │   ├── DragHint.vue
│   │   ├── EmbedCanvas.vue            (251 lines) -- read-only canvas
│   │   ├── EmbedNode.vue              (300+ lines)
│   │   ├── EmbedNodeContent.vue
│   │   ├── EmbedNodeImage.vue
│   │   ├── EmbedNodeMenu.vue
│   │   ├── EmbedNotesPreview.vue
│   │   ├── ImageGalleryCard.vue
│   │   ├── ImageGalleryPanel.vue
│   │   ├── ImagePreview.vue
│   │   ├── ImportMarkdownDialog.vue
│   │   ├── ImportMarkdownHost.vue
│   │   ├── MapNode.vue                (397 lines) -- main node component
│   │   ├── MindMapCanvas.vue          (626 lines) -- LARGEST FILE
│   │   ├── NodeActions.vue
│   │   ├── NodeActionsMenu.vue
│   │   ├── NodeContent.vue
│   │   ├── NodeImage.vue
│   │   ├── NodeNotesPreview.vue
│   │   ├── NotesPanel.vue
│   │   ├── NotesToolbar.vue
│   │   └── SegmentCanvas.vue
│   │   └── SegmentEditorPanel.vue
│   ├── composables/
│   │   ├── useConnections.ts          (106 lines) -- SVG bezier connections
│   │   ├── useHistory.ts              (93 lines) -- generic undo/redo
│   │   ├── useImageStorage.ts         (224 lines) -- image CRUD pool
│   │   ├── useMindMapApi.ts           (97 lines) -- facade composable
│   │   ├── useNodeDrag.ts             (165 lines) -- drag-and-drop
│   │   ├── useNodeMenu.ts             (273 lines) -- singleton menu state
│   │   ├── usePanZoom.ts              (292 lines) -- pan/zoom/focus
│   │   ├── usePersistence.ts          (438 lines) -- import/export/localStorage
│   │   ├── useSegmentEditor.ts
│   │   ├── useSegmentOperations.ts
│   │   ├── useTreeOperations.ts       (536 lines) -- 25+ CRUD methods
│   │   ├── useEmbedConnections.ts
│   │   └── useEmbedPanZoom.ts
│   ├── lib/
│   │   ├── export.ts                  (1 line) -- re-export
│   │   ├── layout.ts                  (3 lines) -- re-export
│   │   ├── markdown.ts
│   │   ├── mermaid.ts
│   │   └── parse.ts                   (1 line) -- re-export
│   └── types/
│       ├── history.ts
│       ├── image-storage.ts
│       ├── mindmap-api.ts
│       ├── node-drag.ts
│       ├── persistence.ts
│       ├── segment-operations.ts
│       └── tree-operations.ts
├── embed-setup.md
├── env.d.ts
├── index.html
├── knip.json
├── maps/                              (user data -- .json, .jpg, .png files)
├── node_modules/
├── package.json                       (59 lines)
├── package-lock.json
├── public/
│   └── favicon.ico
├── README.md
├── README_ENG.md
├── scripts/
│   └── migrate-mindmap-imports.mjs    (162 lines)
├── src/                               (EDITOR APPLICATION -- FSD structure)
│   ├── main.ts                        (18 lines) -- duplicate entry point
│   ├── app/
│   │   └── model/
│   │       └── useTheme.ts            (44 lines) -- singleton light/dark
│   ├── editor/
│   │   ├── App.vue                    (216 lines) -- thin shell orchestrator
│   │   ├── main.ts                    (12 lines) -- primary entry point
│   │   └── toolbar/
│   │       └── ToolbarPanel.vue       (253 lines)
│   ├── entities/
│   │   ├── image/
│   │   │   ├── index.ts               (1 line) -- type barrel
│   │   │   └── model/
│   │   │       └── types.ts           (51 lines) -- Clip, RawImage, ImageSegment, StoredImage
│   │   ├── mindmap/
│   │   │   ├── index.ts               (15 lines) -- barrel
│   │   │   ├── lib/.gitkeep
│   │   │   └── model/
│   │   │       ├── types.ts           (15 lines) -- MindMapDocument
│   │   │       ├── useNodeFactory.ts
│   │   │       ├── useTreeOperations.ts
│   │   │       └── useTreeTraversal.ts
│   │   └── node/
│   │       ├── index.ts               (5 lines) -- barrel
│   │       └── model/
│   │           ├── constants.ts       (NODE_SCALE)
│   │           ├── drag.ts            (NodeDragState, DEFAULT_NODE_DRAG_STATE)
│   │           ├── emits.ts           (NodeImageEmits)
│   │           ├── types.ts           (57 lines) -- MindMapNode, ScenePosition, Center2D
│   │           ├── useNodeDimensions.ts
│   │           ├── useNodeDisplay.ts
│   │           ├── useNodeImage.ts
│   │           └── useNodeScale.ts
│   ├── features/
│   │   ├── image-gallery/
│   │   │   ├── lib/
│   │   │   │   ├── useSegmentEditor.ts
│   │   │   │   └── useSegmentOperations.ts
│   │   │   └── model/.gitkeep
│   │   ├── layout/
│   │   │   ├── index.ts               (16 lines) -- barrel
│   │   │   ├── README.md
│   │   │   ├── lib/
│   │   │   │   ├── layoutCompact.ts
│   │   │   │   ├── layoutMindMap.ts
│   │   │   │   ├── layoutRadial.ts
│   │   │   │   ├── layoutSpacious.ts
│   │   │   │   ├── layoutTreeDown.ts
│   │   │   │   ├── layoutTreeRight.ts
│   │   │   │   ├── layoutUtils.ts
│   │   │   │   └── types.ts           (LayoutType enum)
│   │   │   └── model/
│   │   │       ├── types.ts           (LayoutPosition, LayoutData, etc.)
│   │   │       ├── useAutoLayout.ts   (57 lines)
│   │   │       └── useLayout.ts       (220 lines) -- core layout engine
│   │   ├── notes/
│   │   │   └── model/
│   │   │       ├── hljsSetup.ts
│   │   │       └── useMarkdown.ts     (178 lines) -- marked + DOMPurify + mermaid
│   │   └── persistence/
│   │       ├── index.ts               (5 lines) -- barrel
│   │       ├── lib/
│   │       │   ├── exportMarkdown.ts
│   │       │   └── importMarkdown.ts
│   │       └── model/
│   │           └── usePersistence.ts  (458 lines) -- WITH auto-save (legacy)
│   └── shared/
│       ├── config/
│       │   ├── constants.ts           (40 lines)
│       │   ├── node-dimensions.ts     (103 lines)
│       │   └── .gitkeep
│       └── lib/
│           ├── bezier.ts              (51 lines)
│           ├── injectStrict.ts        (36 lines)
│           ├── useImageHandler.ts     (111 lines) -- pure image processing
│           └── __tests__/
│               └── bezier.spec.ts     (92 lines)
├── TASK.md
├── TASK-2.md
├── tsconfig.json                      (7 lines) -- references node + app
├── tsconfig.app.json                  (41 lines)
├── tsconfig.embed.json                (33 lines)
├── tsconfig.node.json                 (20 lines)
├── vite.config.ts                     (19 lines)
├── vite.embed.ts                      (34 lines)
└── vitest.config.ts                   (22 lines)
```

---

## 2. Approximate Lines Per File (Key Files)

| File | Lines | Layer |
|------|------:|-------|
| `embed/components/MindMapCanvas.vue` | 626 | embed/widget |
| `embed/composables/useTreeOperations.ts` | 536 | embed/feature |
| `embed/composables/usePersistence.ts` | 438 | embed/feature |
| `embed/components/MapNode.vue` | 397 | embed/entity-ui |
| `embed/MindmapViewer.vue` | 373 | embed/root |
| `embed/composables/usePanZoom.ts` | 292 | embed/feature |
| `embed/composables/useNodeMenu.ts` | 273 | embed/feature |
| `embed/components/EmbedCanvas.vue` | 251 | embed/widget |
| `src/editor/toolbar/ToolbarPanel.vue` | 253 | editor/widget |
| `src/features/persistence/model/usePersistence.ts` | 458 | features/persistence |
| `embed/composables/useImageStorage.ts` | 224 | embed/entity |
| `src/features/layout/model/useLayout.ts` | 220 | features/layout |
| `src/editor/App.vue` | 216 | editor/app |
| `embed/composables/useNodeDrag.ts` | 165 | embed/feature |
| `src/features/notes/model/useMarkdown.ts` | 178 | features/notes |
| `embed/composables/useConnections.ts` | 106 | embed/feature |
| `embed/composables/useMindMapApi.ts` | 97 | embed/facade |
| `embed/composables/useHistory.ts` | 93 | embed/shared |
| `embed/injection-keys.ts` | 57 | embed/shared |
| `src/shared/config/node-dimensions.ts` | 103 | shared/config |
| `src/shared/lib/useImageHandler.ts` | 111 | shared/lib |
| `src/shared/lib/bezier.ts` | 51 | shared/lib |
| `src/shared/lib/injectStrict.ts` | 36 | shared/lib |
| `src/entities/node/model/types.ts` | 57 | entities/node |
| `src/entities/image/model/types.ts` | 51 | entities/image |
| `src/app/model/useTheme.ts` | 44 | app/model |
| `src/shared/config/constants.ts` | 40 | shared/config |

**Estimated total:** ~5000+ lines of TypeScript/Vue source across `src/` and `embed/`.

---

## 3. FSD Layer Structure and Compliance

### Actual Layer Map

| FSD Layer | Directory | Content | Status |
|-----------|-----------|---------|--------|
| **app/** | `src/app/` | `model/useTheme.ts` only | Minimal -- no root App.vue, no providers/ |
| **editor/** | `src/editor/` | `App.vue`, `main.ts`, `toolbar/` | Acts as app-layer orchestrator (non-standard FSD) |
| **widgets/** | (none in `src/`) | No `src/widgets/` directory | Missing -- canvas/toolbar/panels live in `embed/` |
| **features/** | `src/features/` | layout, persistence, notes, image-gallery | Well-structured with index.ts barrels |
| **entities/** | `src/entities/` | node, mindmap, image | Clean entity types + model segment |
| **shared/** | `src/shared/` | lib (bezier, injectStrict, imageHandler), config | Correct placement |
| **embed/** | `embed/` | Complete parallel app (components + composables + types) | Self-contained library, exported as npm package |

### FSD Compliance Assessment

**Good:**
- `src/entities/` cleanly defines domain types (MindMapNode, MindMapDocument, StoredImage)
- `src/features/layout/` properly separates pure algorithms (`lib/`) from Vue composables (`model/`)
- All entity barrels (`index.ts`) exist and export only what's needed
- `src/shared/` contains zero business logic -- only generic utilities
- Imports in `src/` generally follow top-to-bottom direction

**Violations and Concerns:**
1. **`src/editor/App.vue` imports directly from `embed/composables/useMindMapApi`** -- cross-layer dependency (`editor` -> `embed`), bypasses FSD
2. **`embed/components/MapNode.vue` has its own local `injectStrict`** (line 84-88) duplicating `src/shared/lib/injectStrict.ts`
3. **`src/widgets/` and `src/pages/` directories do not exist** -- the ARCHITECTURE.md describes them but the actual structure uses `embed/` as a parallel app
4. **Two `main.ts` files**: `src/main.ts` (18 lines) and `src/editor/main.ts` (12 lines) -- both create Vue apps with Vuetify, slight config differences
5. **Two `usePersistence` files**: `src/features/persistence/model/usePersistence.ts` (458 lines, has auto-save via `watch`) and `embed/composables/usePersistence.ts` (438 lines, NO auto-save) -- nearly identical code with critical behavioral difference

---

## 4. Key Architectural Observations

### 4.1 Dual-App Architecture

The project runs as **two separate applications** from one codebase:
- **Editor app** (`src/editor/`) -- full CRUD mindmap editor with Vuetify UI, toolbar, image gallery, segment editor
- **Embed library** (`embed/`) -- standalone embeddable component (`MindmapViewer`) exported as npm package

The editor **delegates to embed composables** rather than having its own. `src/editor/App.vue` calls `useMindMapApi` from `embed/composables/`.

### 4.2 Composable Facade Pattern

`useMindMapApi` (97 lines) is the central facade that composes:
- `useHistory` -- 50-step JSON-serialized undo/redo
- `useTreeOperations` -- 25+ methods (CRUD, images, layout, scale, markdown import)
- `useImageStorage` -- raw + segment image pool with CRUD
- `useSegmentOperations` -- image segment editing
- `usePersistence` -- optional localStorage + import/export

Everything spreads into one `MindMapApi` object. This is a **module-level singleton** pattern in `useNodeMenu` (shared state across all node instances).

### 4.3 Provide/Inject Architecture

- `mindMapKey` -- `InjectionKey<MindMapApi>` -- provided by App.vue/MindMapCanvas
- `notifyKey` -- `InjectionKey<NotifyFn>` -- snackbar notifications
- `embedSlotsKey` -- `InjectionKey<EmbedSlots>` -- slot injection for embed customization
- `globalZoom` -- string key `provide('globalZoom', panZoom.zoom)` -- NOT typed
- `imageStorage` -- string key `provide('imageStorage', props.api.imageStorage)` -- NOT typed

### 4.4 Layout Engine

6 layout algorithms, all pure functions in `src/features/layout/lib/`:
- `mindmap` -- default split-children-left-right
- `spacious`, `compact`, `radial`, `treeDown`, `treeRight`

`useLayout` composable computes positions from tree + customX/customY overrides. O(N) subtree height allocation with `subtreeHeight()`.

### 4.5 Event Bus / Emit Chain (5 layers)

MindMapCanvas emits -> App.vue -> parent. Events include:
- `child-added`, `sections-imported`, `node-image-set`, `node-image-removed`, `node-deleted`
- `notes-visible-change`, `pin-change`

Text-based matching: `nodeText = section.heading` for connecting mindmap nodes to article sections.

### 4.6 Persistence Strategy

- Editor: `usePersistence` in `src/features/` has **auto-save** via deep `watch` on document
- Embed: `usePersistence` in `embed/composables/` has **NO auto-save** -- consumer controls saving
- JSON format v2: `{ version: 2, root: MindMapNode, images: StoredImage[] }`
- Markdown import/export for human-readable format
- localStorage key: `mindmap-data`

---

## 5. Code Smells and Potential Issues

### 5.1 Debug Console Logs Left in Production Code (HIGH)

**22 console.log/warn calls** found in `embed/`:

| File | Count | Type |
|------|------:|------|
| `MindmapViewer.vue` | 5 | `[IMG-DEBUG]` debug logs |
| `EmbedCanvas.vue` | 1 | `[IMG-DEBUG]` debug log |
| `EmbedNode.vue` | 5 | `[IMG-DEBUG]` debug logs |
| `useImageStorage.ts` | 4 | `console.warn` for validation |
| `useTreeOperations.ts` | 3 | `console.warn` |
| `useSegmentOperations.ts` | 2 | `console.warn` |
| `ImportMarkdownDialog.vue` | 1 | `console.warn` |
| `MindMapCanvas.vue` | 1 | Fallback notify |

**Priority:** The 11 `[IMG-DEBUG]` logs are clearly leftover debugging and should be removed.

### 5.2 Duplicated Persistence Code (HIGH)

`src/features/persistence/model/usePersistence.ts` (458 lines) and `embed/composables/usePersistence.ts` (438 lines) are **near-identical** with one critical difference:
- `src/` version: auto-saves to localStorage via `watch(document, ..., { deep: true })`
- `embed/` version: no auto-save

Both contain the same `normalizeDocument`, `normalizeNode`, `normalizeImages`, `cleanNodeForExport`, `cleanImageForExport`, `pruneUnusedImages`, `parseFileToDocument`, `downloadFile`, `buildTimestamp`, and type guards.

### 5.3 `useNodeMenu` Uses Module-Level Singleton State (MEDIUM)

`useNodeMenu.ts` (lines 49-81) declares state at module scope:
```ts
const activeMenuId = ref<string | null>(null)
const isOpen = ref(false)
const menuPosition = reactive({...})
const activeNodeProps = reactive({...})
let activeHandlers: NodeMenuHandlers | null = null
```

This is intentional (singleton pattern for one-menu-at-a-time) but means:
- Not testable in isolation
- Cannot have multiple mindmap instances with independent menus
- Violates Vue composable conventions (state should be in setup or closure)

### 5.4 TODO Found

```
embed/components/NodeContent.vue line 55:
  // TODO(useNodeDisplay): эти же вычисления дублируются в MapNode.vue
```

### 5.5 Duplicate `injectStrict` in MapNode.vue (LOW)

`MapNode.vue` defines its own local `injectStrict` (line 84-88) instead of importing from `src/shared/lib/injectStrict.ts`. This works but creates a maintenance burden.

### 5.6 Two `main.ts` Entry Points (LOW)

- `src/main.ts` -- creates app with `createVuetify({ components, directives })` (imports ALL)
- `src/editor/main.ts` -- creates app with `createVuetify({ icons: { defaultSet: 'mdi' } })` (minimal)

The `index.html` would determine which one runs. Both exist but serve subtly different purposes.

### 5.7 `any` Usage in markdown.ts (LOW)

```ts
renderer(token: any) {
```
In `src/features/notes/model/useMarkdown.ts` line 25 and `embed/lib/markdown.ts` line 32. Could use a proper marked token type.

### 5.8 Hit-Test is O(N) (INFORMATIONAL)

`MindMapCanvas.vue` line 338-351: Drop target detection iterates all positions linearly. Comment acknowledges this: "Hit-test остаётся O(N) -- пространственный индекс пока не оправдан."

---

## 6. Configuration Summary

| Config | Purpose |
|--------|---------|
| `package.json` | Vue 3.5, Vuetify 4.0, Vite 7.3, TypeScript 5.9, Vitest 4.1 |
| `vite.config.ts` | Editor app: aliases `@`, `@entities`, `@features`, `@shared` |
| `vite.embed.ts` | Embed library build: ES module, externals vue/vuetify/@mdi/font |
| `tsconfig.json` | Project references: tsconfig.node + tsconfig.app |
| `tsconfig.app.json` | Strict mode, bundler resolution, FSD path aliases |
| `tsconfig.embed.json` | Separate config for `embed/**/*.ts` + `src/entities` + `src/features` |
| `vitest.config.ts` | happy-dom environment, same aliases as app |
| `knip.json` | Entry: `src/main.ts` + `src/types/mindmap-api.ts!` (dead code detection) |

**Dependencies:**
- **Runtime:** vue 3.5, vuetify 4.0, @mdi/font, mermaid 11.17, marked 17, highlight.js 11, dompurify 3
- **Dev:** vite 7.3, typescript 5.9, vitest 4.1, vue-tsc 3.2, husky 9, happy-dom 20

---

## 7. Potential Refactoring Targets (Priority Order)

1. **Eliminate persistence duplication** -- Extract shared normalization/serialization logic into `src/features/persistence/lib/` or `src/shared/lib/`. Keep only the auto-save behavior difference in each consumer.

2. **Remove `[IMG-DEBUG]` console.logs** -- 11 debug log statements in production embed code.

3. **Resolve `src/main.ts` vs `src/editor/main.ts`** -- Consolidate into a single entry point.

4. **Import `injectStrict` from shared in MapNode.vue** instead of redefining it locally.

5. **Type the string-keyed provides** -- `globalZoom` and `imageStorage` use string keys; convert to typed `InjectionKey<T>` in `injection-keys.ts`.

6. **Consider renaming `embed/composables/useTreeOperations.ts`** -- at 536 lines with 25+ methods, this is the largest composable. It mixes CRUD, image management, layout, scale, and markdown import. Splitting into `useTreeCrud`, `useTreeImages`, `useTreeLayout` would improve readability.

7. **Knip config points to deleted file** -- `knip.json` references `src/types/mindmap-api.ts!` which appears to have been migrated to `embed/types/mindmap-api.ts`.