# Mindmap Embed Restructuring Plan

## Goal: embed/ as the foundation, editor/ as thin shell

### Architecture

```
embed/                         src/editor/
┌──────────────────────┐       ┌──────────────────────┐
│ composables/         │       │ App.vue              │
│  useMindMapApi.ts    │       │ main.ts              │
│  useTreeOperations.ts│       │ MindMap.vue          │
│  useHistory.ts       │       │ providers/           │
│  useImageStorage.ts  │       │ model/useTheme.ts    │
│  usePersistence.ts   │       └──────────────────────┘
│  useSegmentOps.ts    │
│ types/               │       src/widgets/canvas/
│  mindmap-api.ts      │       ┌──────────────────────┐
│  MindMapApi.ts       │       │ MindMapCanvas.vue    │ ← prop: api
│ components/          │       │ MapNode.vue          │
│  MindmapViewer.vue   │       │ CanvasControls.vue   │
│  EmbedCanvas.vue     │       │ DragHint.vue         │
│  EmbedNode*.vue      │       └──────────────────────┘
│  ToolbarPanel.vue    │
│ lib/                 │       src/features/
│  markdown.ts         │       ┌──────────────────────┐
│  parse.ts            │       │ notes/               │
│  layout.ts           │       │ node-actions/        │
└──────────────────────┘       │ image-gallery/       │
                               └──────────────────────┘
```

### Key Contracts

- MindMapCanvas: `injectStrict(mindMapKey)` → `props: { api: MindMapApi }`
- MapNode: keeps `inject('globalZoom')` + `inject('imageStorage')` (provided by MindMapCanvas from api)
- MindmapViewer: accepts `api` prop, provides MindMapApi
- useMindMapApi: factory (no localStorage, API-based persistence)
- enc: imports only from `@mindmap-embed`, no aliases on `mindmap/src/*`

### Phase 1: Core (embed/types + composables)

| # | File | Action | Source |
|---|------|--------|--------|
| 1 | embed/types/history.ts | NEW | src/app/model/useHistory.ts → HistoryApi interface |
| 2 | embed/types/image-storage.ts | NEW | src/app/store/useImageStorage.ts → ImageStorageApi, ResolvedImage |
| 3 | embed/types/persistence.ts | NEW | src/features/persistence/model/usePersistence.ts → PersistenceApi, ExportFormat |
| 4 | embed/types/mindmap-api.ts | NEW | src/types/mindmap-api.ts → MindMapApi + re-exports |
| 5 | embed/composables/useHistory.ts | NEW | src/app/model/useHistory.ts (full impl) |
| 6 | embed/composables/useImageStorage.ts | NEW | src/app/store/useImageStorage.ts (full impl) |
| 7 | embed/composables/useTreeOperations.ts | NEW | src/entities/mindmap/model/useTreeOperations.ts (full impl) |
| 8 | embed/composables/useSegmentOperations.ts | NEW | src/features/image-gallery/lib/useSegmentOperations.ts |
| 9 | embed/composables/usePersistence.ts | NEW | src/features/persistence/model/usePersistence.ts (no localStorage watch) |
| 10 | embed/composables/useMindMapApi.ts | NEW | Factory (analog useMindMap.ts, API-based persistence) |

### Phase 2: Components (embed/components)

| # | File | Action | Source |
|---|------|--------|--------|
| 11 | embed/components/MapNode.vue | NEW | src/entities/node/ui/MapNode.vue |
| 12 | embed/components/NodeContent.vue | NEW | src/entities/node/ui/NodeContent.vue |
| 13 | embed/components/NodeImage.vue | NEW | src/entities/node/ui/NodeImage.vue |
| 14 | embed/components/NodeNotesPreview.vue | NEW | src/entities/node/ui/NodeNotesPreview.vue |
| 15 | embed/components/MindMapCanvas.vue | NEW | src/widgets/canvas/ui/MindMapCanvas.vue (prop: api) |
| 16 | embed/components/CanvasControls.vue | NEW | src/widgets/canvas/ui/CanvasControls.vue |
| 17 | embed/components/DragHint.vue | NEW | src/widgets/canvas/ui/DragHint.vue |
| 18 | embed/components/NodeActions.vue | NEW | src/features/node-actions/ui/NodeActions.vue |
| 19 | embed/components/NodeActionsMenu.vue | NEW | src/features/node-actions/ui/NodeActionsMenu.vue |
| 20 | embed/components/NotesPanel.vue | NEW | src/features/notes/ui/NotesPanel.vue |
| 21 | embed/components/NotesToolbar.vue | NEW | src/features/notes/ui/NotesToolbar.vue |
| 22 | embed/components/ImageGalleryPanel.vue | NEW | src/features/image-gallery/ui/ImageGalleryPanel.vue |
| 23 | embed/components/ImageGalleryCard.vue | NEW | src/features/image-gallery/ui/ImageGalleryCard.vue |
| 24 | embed/components/ImagePreview.vue | NEW | src/features/image-gallery/ui/ImagePreview.vue |
| 25 | embed/components/SegmentCanvas.vue | NEW | src/features/image-gallery/ui/SegmentCanvas.vue |
| 26 | embed/components/SegmentEditorPanel.vue | NEW | src/features/image-gallery/ui/SegmentEditorPanel.vue |
| 27 | embed/components/ImportMarkdownHost.vue | NEW | src/features/persistence/ui/ImportMarkdownHost.vue |

### Phase 3: Integration

| # | File | Action | Description |
|---|------|--------|-------------|
| 28 | embed/injection-keys.ts | MODIFY | Add mindMapKey, notifyKey (from src/app/providers/) |
| 29 | embed/index.ts | MODIFY | Extended exports: MindMapApi, useMindMapApi, MindMapCanvas, composables |
| 30 | embed/MindmapViewer.vue | MODIFY | Accepts api prop, provides MindMapApi, editMode |
| 31 | src/editor/App.vue | REWRITE | Thin shell: useMindMapApi + provide + MindMapCanvas + ToolbarPanel |
| 32 | src/editor/main.ts | REWRITE | createApp with Vuetify |
| 33 | src/editor/MindMap.vue | REWRITE | Conditional render viewer/editor |
| 34 | vite.embed.ts | MODIFY | Vuetify external, new entry point |

### Phase 4: enc

| # | File | Action | Description |
|---|------|--------|-------------|
| 35 | enc/nuxt.config.ts | MODIFY | Remove aliases on mindmap/src/*, keep @mindmap-embed |
| 36 | enc/composables/useMindmapEditor.ts | DELETE | Replaced by useMindMapApi from embed |
| 37 | enc/components/MindmapEditor.vue | REWRITE | Uses useMindMapApi + MindMapCanvas from embed |

### Phase 5: Cleanup

| # | File | Action |
|---|------|--------|
| 38 | src/widgets/canvas/ | DELETE (moved to embed/components/) |
| 39 | src/widgets/toolbar/ | KEEP in editor or move to src/editor/ |
| 40 | src/entities/node/ui/ | DELETE (moved to embed/components/) |
| 41 | src/features/node-actions/ | DELETE (moved to embed/components/) |
| 42 | src/features/notes/ | DELETE (moved to embed/components/) |
| 43 | src/features/image-gallery/ui/ | DELETE (moved to embed/components/) |
| 44 | src/features/persistence/ui/ | DELETE (moved to embed/components/) |
| 45 | src/app/store/ | DELETE (moved to embed/composables/) |
| 46 | src/app/model/ | DELETE (moved to embed/composables/) |
| 47 | src/types/ | DELETE (moved to embed/types/) |
| 48 | src/app/providers/ | DELETE (moved to embed/injection-keys.ts) |

### Phase 6: Build Verification

| # | File | Action |
|---|------|--------|
| 49 | vite.embed.ts | Update: entry embed/index.ts, Vuetify external, CSS |
| 50 | vite.config.ts | Update: aliases for editor dev |
| 51 | package.json | Update exports |
| 52 | tsconfig.embed.json | Check paths |
| 53 | npm run build:embed | Build, check errors |
| 54 | npm run dev | Check editor dev mode |
| 55 | enc: npm run dev | Check integration |

### Expected Result
- `embed/` — self-contained package: viewer + editor canvas + API + composables
- `src/editor/` — thin shell (~100 lines)
- `enc/` — imports only from `@mindmap-embed`, no aliases on `mindmap/src/*`
