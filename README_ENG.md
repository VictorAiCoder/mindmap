# MindMap

> A markdown-native mind map editor designed for LLM-assisted knowledge work.

Import a Markdown document — get an interactive mind map. Edit visually — export back to clean Markdown. Built as a round-trip bridge between structured text and spatial thinking, with first-class support for code snippets, syntax highlighting, and rich note editing on every node.

![Vue 3](https://img.shields.io/badge/Vue-3.5-42b883?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/tested_with-Vitest-6e9f18?logo=vitest&logoColor=white)

---

## ✨ Why this project

Most mind map tools lock your data inside proprietary formats. **MindMap is built around Markdown as its source of truth** — which makes it uniquely suited for:

- **LLM workflows** — paste structured output from ChatGPT/Claude and get an instantly navigable map
- **Git-friendly knowledge bases** — diff, review, and version-control your thinking
- **Reversible serialization** — every visual edit maps cleanly back to Markdown, no data loss

---

## 🎯 Features

- 📥 **Bidirectional Markdown I/O** — lossless import/export of nested structures, notes, and code blocks
- 🌲 **Six layout strategies** — radial, compact, spacious, tree-down, tree-right, mind-map — hot-swappable
- 📝 **Markdown notes on every node** with GFM support (tables, task lists, blockquotes)
- 🎨 **Syntax highlighting for 50+ languages** via `highlight.js` (atom-one-dark theme)
- 🖼️ **Inline images** with drag-and-drop attachment
- ↩️ **Full undo/redo history**
- 🔍 **Smooth pan & zoom** with Bezier-curve connections
- ⚡ **Drag-and-drop tree editing** with visual hints
- 🌗 **Light/dark theming** via Vuetify design tokens
- 🛡️ **XSS-safe rendering** — all user markdown sanitized through DOMPurify

---

## 🏛️ Architectural Highlights

This section documents the engineering principles that shaped the codebase. It's deliberately opinionated.

### 1. Composition-first, zero state-management libraries

No Pinia. No Vuex. No Redux-alikes. The entire application state is modeled through **composable functions** (`composables/`), each owning a single slice of behavior:

```
useMindMap           → root orchestrator
useHistory           → undo/redo stack
useLayout            → layout dispatcher
usePersistence       → save/load/import/export
usePanZoom           → viewport transforms
useConnections       → edge geometry
useNodeDrag          → drag mechanics
useTreeOperations    → CRUD on the tree
useTreeTraversal     → read-only queries
useNodeFactory       → node construction
```

Each composable is **framework-idiomatic** (returns reactive refs, exposes typed APIs) and **independently testable** — see `useConnections.spec.ts`.

### 2. Strategy Pattern for layout engines

Layout algorithms live as isolated modules under `composables/layout/`:

```
layoutCompact.ts
layoutMindMap.ts
layoutRadial.ts
layoutSpacious.ts
layoutTreeDown.ts
layoutTreeRight.ts
```

Adding a new layout requires **zero changes** to the core — just drop a file implementing the `LayoutStrategy` contract and register it in `useLayout.ts`. Shared geometry helpers are extracted to `layoutUtils.ts` to keep each strategy declarative and focused.

This follows the **Open/Closed Principle** at the feature level.

### 3. Type-safe dependency injection

Vue's `provide`/`inject` is powerful but untyped by default. The project addresses this with:

- **`types/injection-keys.ts`** — `InjectionKey<T>` tokens for every provided contract
- **`utils/injectStrict.ts`** — a type-narrowing wrapper that throws on missing injections, eliminating the `T | undefined` mess from consumer code

```ts
// Consumer code stays clean and safe:
const api = injectStrict(MindMapApiKey)  // Typed as MindMapApi, guaranteed non-null
```

### 4. Domain logic separated from UI

The `composables/tree/` module splits tree concerns using SRP:

- **`useNodeFactory.ts`** — node construction (Factory)
- **`useTreeOperations.ts`** — mutations: add, remove, move, reparent (Command)
- **`useTreeTraversal.ts`** — pure read queries: find, walk, filter (Visitor)

Components never touch the tree directly. They call operations; operations are recorded by `useHistory`; history replays operations in reverse for undo. This makes **undo/redo a free consequence of the architecture**, not a retrofit.

### 5. Reversible Markdown serialization

`persistence/importMarkdown.ts` and `persistence/exportMarkdown.ts` are designed as **inverse functions**: `export(import(md)) ≈ md`. This means:

- No proprietary format to learn
- No vendor lock-in
- Human-readable diffs in Git

### 6. Single source of truth for Markdown rendering

`useMarkdown.ts` is the **only** place that calls `marked.parse`. All components consume `renderMarkdown(text)` — which means:

- XSS sanitization is enforced **once**, infrastructure-level (via DOMPurify with a strict allow-list)
- Syntax highlighting config lives in **one** place
- Swapping the Markdown engine is a one-file change

### 7. Tree-shaken syntax highlighting

Instead of the 1 MB default `highlight.js` bundle, languages are **explicitly registered** in `composables/notes/hljsSetup.ts`:

- 50 languages chosen by real-world popularity (TIOBE / GitHub stats)
- Common aliases mapped (`ts` → typescript, `yml` → yaml, `sh` → bash, `html` → xml)
- Bundle cost: **~40 KB gzipped** vs ~300 KB for the full build

### 8. Math-driven UI primitives

Node connections are rendered as **cubic Bezier curves** (`utils/bezier.ts`), with control points computed to produce natural-feeling organic edges — not polyline zigzags. The geometry module is **pure** and unit-tested (`bezier.spec.ts`).

### 9. Design-token-based theming

No hardcoded colors. All styles consume Vuetify CSS variables (`var(--v-theme-surface)`, `rgb(var(--v-theme-primary))`, …), which means:

- Light/dark theme swap is a single Vuetify API call
- Future custom themes require zero CSS changes

### 10. Build-time type safety

`vue-tsc --build` runs in parallel with Vite's build (via `npm-run-all2`), catching type errors across `.vue` templates — not just `.ts` files. The project treats **TypeScript as a correctness tool**, not decoration.

---

## 🧪 Testing Philosophy

Tests target **pure domain logic**, where the value-per-test is highest:

- `utils/bezier.spec.ts` — geometric correctness of curves
- `composables/canvas/__tests__/useConnections.spec.ts` — connection graph behavior

UI components are intentionally **not** unit-tested — the framework (Vue + Vuetify) already guarantees rendering correctness, and E2E tests would cover user flows better than shallow component tests. This is a deliberate **test-what-matters** stance.

Stack: **Vitest** + **happy-dom** + **@vue/test-utils**.

---

## 🚀 Getting Started

### Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- npm / pnpm / yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev        # Start Vite dev server
npm run test:watch # Run tests in watch mode
```

### Production build

```bash
npm run build      # Type-check + bundle in parallel
npm run preview    # Preview production build locally
```

### Quality gates

```bash
npm run type-check # Strict TypeScript + Vue template type-checking
npm run test       # Run all tests once
```

---

## 📁 Project Structure

```
src/
├── components/
│   ├── canvas/      # Viewport, zoom, pan, drag hints
│   ├── node/        # Node rendering, actions, content, notes preview
│   └── panels/      # Toolbars and notes editor
├── composables/
│   ├── canvas/      # Connection geometry, pan/zoom (+ tests)
│   ├── drag/        # Drag-and-drop and node-drag mechanics
│   ├── layout/      # 6 pluggable layout strategies
│   ├── notes/       # highlight.js setup
│   ├── persistence/ # Markdown import/export
│   ├── tree/        # Tree factory / operations / traversal
│   └── *.ts         # Cross-cutting: history, theme, markdown, ...
├── types/           # Shared interfaces, injection keys, API contracts
└── utils/           # Pure helpers (Bezier, injectStrict) + tests
```

Every directory has a **single responsibility**. Cross-module communication goes through typed contracts in `types/`.

---

## 🎨 Tech Stack

| Layer         | Choice                         | Why                                           |
|---------------|--------------------------------|-----------------------------------------------|
| Framework     | Vue 3 (Composition API)        | First-class TypeScript, granular reactivity  |
| Language      | TypeScript (strict)            | Catch errors at compile time                 |
| UI toolkit    | Vuetify 4                      | Mature theming, design tokens, a11y built-in |
| Build         | Vite 7                         | Fast, ESM-native, modern                     |
| Testing       | Vitest + happy-dom             | Vite-integrated, zero-config                 |
| Markdown      | marked + marked-highlight      | Standards-compliant, pluggable               |
| Sanitization  | DOMPurify                      | Battle-tested XSS prevention                 |
| Highlighting  | highlight.js (tree-shaken)     | 50 languages, atom-one-dark theme            |

**Notable absences** (by design): no lodash, no Pinia, no Axios, no moment. The project relies on the platform and the framework — not a dependency thicket.

---

## 🧭 Design Principles

- **Markdown is the source of truth** — the UI is a view over a text document, not the other way around
- **Composition over inheritance** — every feature is a composable function
- **Explicit over implicit** — typed injection keys, no magic strings
- **Single Responsibility** — one file, one concern
- **Test what breaks hardest** — pure logic over shallow UI tests
- **Zero vendor lock-in** — your data stays as `.md` files

---

## 📄 License

[Add license here]

---

*Built with deliberate minimalism and architectural discipline.*