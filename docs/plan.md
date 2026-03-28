# CreateFlowchart.com — End-to-End Implementation Plan

> **Source PRD**: [prd.md](./prd.md) | **Architecture**: Hybrid Feature-Based
> **Status**: Draft — Awaiting Approval | **Last Updated**: 2026-03-29

---

## 1. Tech Stack & Roles

| Layer | Technology | Version | Role |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 16.2.1 | SSR/RSC for SEO, API routes, Turbopack dev |
| **UI** | React | 19.x | Components, Server Components, Hooks, Actions |
| **Canvas** | @xyflow/react (React Flow) | 12.x | Node/edge rendering, drag-drop, custom nodes |
| **Layout Engine** | ELK.js (`elkjs`) | latest | Auto-layout in Web Worker (layered/hierarchical) |
| **Client State** | Zustand | 5.x | Editor state, auth, UI — client components only |
| **Server State** | TanStack Query | 5.x | Fetch/cache server data (flows, templates) |
| **Validation** | Zod | 3.x | FlowGraph schema, API input/output validation |
| **Styling** | Vanilla CSS + CSS Modules | — | Design tokens (custom properties), scoped styles |
| **Fonts** | Google Fonts (Inter) | — | Typography via `next/font/google` |
| **Realtime CRDT** | Yjs | 13.x | Conflict-free shared FlowGraph state |
| **Realtime Server** | Node.js + `ws` + `y-websocket` | 22.x LTS | Standalone WSS for Yjs sync, presence, snapshots |
| **Database** | PostgreSQL | 16.x | Users, flows, versions, templates |
| **Vector Search** | pgvector | 0.7+ | Semantic template search (cosine similarity) |
| **ORM** | Drizzle ORM | latest | Type-safe queries, migrations, schema |
| **Auth** | Better Auth | latest | OAuth (GitHub, Google), email/password, JWT sessions, Drizzle adapter |
| **AI Gateway** | Multi-Provider (OpenRouter, OpenAI, Anthropic, xAI) | — | Priority-based fallback routing across providers |
| **Embeddings** | OpenAI `text-embedding-3-small` | — | 1536-dim vectors for template search |
| **Queue** | BullMQ | 5.x | Background jobs: AI generation, export rendering, embedding generation |
| **Cache/Queue Store** | Redis (self-hosted via Coolify) | 7.x | Rate limiting, BullMQ backing store, session cache, Yjs snapshot buffer |
| **Rate Limiting** | Custom (Redis `INCR` + `EXPIRE`) | — | 10 AI gen/min/user, per-socket WS limits |
| **Export** | `html-to-image` + `@react-pdf/renderer` | — | PNG, SVG, PDF, Mermaid, JSON |
| **Monorepo** | Turborepo + pnpm | latest/9.x | Workspace orchestration, caching |
| **Testing** | Vitest + Playwright | — | Unit/integration + E2E |
| **Containers** | Docker (multi-stage) | — | Images < 200MB per service |
| **Orchestration** | Coolify | 4.x | Self-hosted PaaS, SSL (Let's Encrypt) |
| **Errors** | Sentry | — | Runtime error capture |
| **CI/CD** | GitHub Actions | — | Lint → Test → Build → Deploy |

---

## 2. Architecture: Hybrid Feature-Based

### Core Principle

```
app/        → ROUTING ONLY (thin pages, thin API handlers — max 15 lines each)
features/   → DOMAIN CODE (each feature is self-contained: components, hooks, stores, styles, services)
shared/     → CROSS-CUTTING (design system UI, generic hooks, infra utilities, global stores)
packages/   → MONOREPO SHARED (core engine, AI pipeline, DB schema — used by web + realtime)
```

### Rules

| Rule | Enforcement |
|---|---|
| `app/` pages import from `features/` — no domain logic in route files | Code review |
| Each `features/X/index.ts` is the ONLY public API | No deep imports from outside |
| `features/` can import from `shared/` and `packages/` | Dependency flows downward |
| `shared/` NEVER imports from `features/` | Hard boundary |
| Cross-feature communication via stores, props, or API calls | No circular deps |
| Zustand stores are client-only | Never in Server Components |

### Monorepo Structure

```
CreateFlowChart/
├── .github/workflows/
│   ├── ci.yml                         # Lint + Test + Build on PR
│   └── deploy.yml                     # Deploy to Coolify on merge to dev
│
├── apps/
│   ├── web/                           # Next.js 16.2.1
│   │   ├── app/                       # ── ROUTING LAYER (thin) ──
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx           → features/auth LoginForm
│   │   │   │   └── signup/page.tsx          → features/auth SignupForm
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx                 → features/dashboard FlowList
│   │   │   ├── (editor)/
│   │   │   │   ├── layout.tsx               → features/editor EditorShell
│   │   │   │   ├── sandbox/page.tsx         → features/editor SandboxEditor
│   │   │   │   └── [flowId]/page.tsx        → features/editor CloudEditor
│   │   │   ├── (public)/
│   │   │   │   ├── gallery/page.tsx         → features/gallery GalleryPage
│   │   │   │   ├── templates/page.tsx       → features/templates TemplateList
│   │   │   │   ├── templates/[slug]/page.tsx→ features/templates TemplateView
│   │   │   │   └── flow/[id]/page.tsx       → features/sharing PublicFlowView
│   │   │   ├── embed/[id]/page.tsx          → features/sharing EmbedView
│   │   │   ├── api/                         # Thin API handlers
│   │   │   │   ├── ai/generate/route.ts          → features/ai service
│   │   │   │   ├── ai/analyze/route.ts           → features/ai service
│   │   │   │   ├── ai/improve/route.ts           → features/ai service
│   │   │   │   ├── ai/explain/route.ts           → features/ai service
│   │   │   │   ├── flows/route.ts                → features/dashboard service
│   │   │   │   ├── flows/[id]/route.ts           → features/dashboard service
│   │   │   │   ├── templates/route.ts             → features/templates service
│   │   │   │   ├── templates/[slug]/route.ts      → features/templates service
│   │   │   │   ├── export/route.ts                → features/export service
│   │   │   │   ├── actions/test/route.ts          → features/editor action service
│   │   │   │   └── auth/[...all]/route.ts         → shared/lib better-auth handler
│   │   │   ├── layout.tsx                   # Root (fonts, providers, metadata)
│   │   │   └── globals.css                  # Design tokens + resets
│   │   │
│   │   ├── features/                  # ── DOMAIN LAYER (feature-based) ──
│   │   │   ├── editor/                # 🎨 Canvas, nodes, toolbar, commands, layout
│   │   │   │   ├── components/
│   │   │   │   │   ├── Canvas.tsx
│   │   │   │   │   ├── EditorShell.tsx
│   │   │   │   │   ├── Toolbar.tsx
│   │   │   │   │   ├── Sidebar.tsx
│   │   │   │   │   ├── CommandMenu.tsx
│   │   │   │   │   ├── SandboxEditor.tsx
│   │   │   │   │   ├── CloudEditor.tsx
│   │   │   │   │   └── nodes/
│   │   │   │   │       ├── StartNode.tsx
│   │   │   │   │       ├── ProcessNode.tsx
│   │   │   │   │       ├── DecisionNode.tsx
│   │   │   │   │       ├── ActionNode.tsx
│   │   │   │   │       └── EndNode.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useFlowEditor.ts
│   │   │   │   │   ├── useAutoLayout.ts
│   │   │   │   │   ├── useCommandMenu.ts
│   │   │   │   │   └── useSandboxStorage.ts
│   │   │   │   ├── stores/
│   │   │   │   │   └── editorStore.ts
│   │   │   │   ├── styles/
│   │   │   │   │   ├── canvas.module.css
│   │   │   │   │   ├── toolbar.module.css
│   │   │   │   │   └── nodes.module.css
│   │   │   │   ├── workers/
│   │   │   │   │   └── elk-worker.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── ai/                    # 🤖 Generate, analyze, improve, explain
│   │   │   │   ├── components/
│   │   │   │   │   ├── GenerateModal.tsx
│   │   │   │   │   ├── AnalysisPanel.tsx
│   │   │   │   │   ├── ImproveDiff.tsx
│   │   │   │   │   └── ExplainPanel.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useAIGenerate.ts
│   │   │   │   │   ├── useAIAnalyze.ts
│   │   │   │   │   └── useAIImprove.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── ai-service.ts
│   │   │   │   ├── styles/
│   │   │   │   │   └── ai-panels.module.css
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── collaboration/         # 👥 Yjs sync, presence, cursors
│   │   │   │   ├── components/
│   │   │   │   │   ├── PresenceAvatars.tsx
│   │   │   │   │   ├── RemoteCursor.tsx
│   │   │   │   │   └── ConnectionStatus.tsx
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useYjsSync.ts
│   │   │   │   │   └── usePresence.ts
│   │   │   │   ├── styles/
│   │   │   │   │   └── presence.module.css
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── templates/             # 📦 Search, list, view, remix
│   │   │   │   ├── components/
│   │   │   │   │   ├── TemplateList.tsx
│   │   │   │   │   ├── TemplateCard.tsx
│   │   │   │   │   ├── TemplateViewer.tsx
│   │   │   │   │   └── TemplateSearch.tsx
│   │   │   │   ├── services/
│   │   │   │   │   └── template-service.ts
│   │   │   │   ├── styles/
│   │   │   │   │   └── templates.module.css
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── gallery/               # 🖼️ Community gallery, likes
│   │   │   │   ├── components/
│   │   │   │   │   ├── GalleryGrid.tsx
│   │   │   │   │   ├── FlowCard.tsx
│   │   │   │   │   └── LikeButton.tsx
│   │   │   │   ├── styles/
│   │   │   │   │   └── gallery.module.css
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── sharing/               # 🔗 Public view, embed, share modal
│   │   │   │   ├── components/
│   │   │   │   │   ├── PublicFlowView.tsx
│   │   │   │   │   ├── EmbedView.tsx
│   │   │   │   │   └── ShareModal.tsx
│   │   │   │   ├── styles/
│   │   │   │   │   └── sharing.module.css
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── export/                # 📤 PNG, SVG, PDF, Mermaid, JSON
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useExport.ts
│   │   │   │   ├── services/
│   │   │   │   │   └── export-service.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── auth/                  # 🔐 Login, signup, guards
│   │   │   │   ├── components/
│   │   │   │   │   ├── LoginForm.tsx
│   │   │   │   │   ├── SignupForm.tsx
│   │   │   │   │   └── AuthGuard.tsx
│   │   │   │   ├── stores/
│   │   │   │   │   └── authStore.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── dashboard/             # 📊 Flow list, create, import
│   │   │       ├── components/
│   │   │       │   ├── FlowList.tsx
│   │   │       │   ├── FlowCard.tsx
│   │   │       │   └── ImportModal.tsx
│   │   │       ├── services/
│   │   │       │   └── flow-service.ts
│   │   │       ├── styles/
│   │   │       │   └── dashboard.module.css
│   │   │       └── index.ts
│   │   │
│   │   ├── shared/                    # ── SHARED LAYER (cross-cutting) ──
│   │   │   ├── ui/                    # Design system primitives
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Dropdown.tsx
│   │   │   │   └── ui.module.css
│   │   │   ├── hooks/                 # Generic, feature-agnostic
│   │   │   │   ├── useDebounce.ts
│   │   │   │   ├── useMediaQuery.ts
│   │   │   │   └── useLocalStorage.ts
│   │   │   ├── lib/                   # Infrastructure
│   │   │   │   ├── api-client.ts
│   │   │   │   ├── auth.ts            # Better Auth server instance
│   │   │   │   ├── auth-client.ts     # Better Auth client instance
│   │   │   │   ├── db.ts
│   │   │   │   ├── redis.ts           # ioredis connection
│   │   │   │   ├── queue.ts           # BullMQ queue definitions
│   │   │   │   └── rate-limit.ts
│   │   │   └── stores/                # Global-only
│   │   │       └── uiStore.ts
│   │   │
│   │   ├── Dockerfile
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── realtime/                      # Standalone Yjs WebSocket Server
│       ├── src/
│       │   ├── server.ts
│       │   ├── auth.ts
│       │   ├── persistence-worker.ts
│       │   └── handlers/
│       │       ├── connection.ts
│       │       ├── awareness.ts
│       │       └── sync.ts
│       ├── Dockerfile
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── core/                          # FlowGraph schema, validation, transforms, rules
│   │   ├── src/
│   │   │   ├── schema.ts
│   │   │   ├── validation.ts
│   │   │   ├── transforms.ts
│   │   │   ├── rules-engine.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── ai/                            # AI multi-provider pipeline
│   │   ├── src/
│   │   │   ├── providers/             # Provider adapters
│   │   │   │   ├── base.ts            # ProviderConfig interface
│   │   │   │   ├── openrouter.ts      # OpenRouter (multi-model fallback)
│   │   │   │   ├── openai.ts          # Direct OpenAI
│   │   │   │   ├── anthropic.ts       # Direct Claude
│   │   │   │   └── xai.ts             # Direct Grok
│   │   │   ├── router.ts             # Priority-based provider routing + fallback
│   │   │   ├── prompts/{generate,analyze,improve,explain}.ts
│   │   │   ├── pipeline.ts
│   │   │   ├── confidence.ts
│   │   │   ├── embeddings.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── db/                            # Drizzle schema, migrations, seed
│   │   ├── src/
│   │   │   ├── schema.ts
│   │   │   ├── migrations/
│   │   │   ├── seed.ts
│   │   │   └── index.ts
│   │   ├── drizzle.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── tsconfig/                      # Shared TS configs
│       ├── base.json
│       ├── nextjs.json
│       └── node.json
│
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .env.example
├── docs/
│   ├── prd.md
│   └── plan.md                        # THIS FILE
├── LICENSE
└── README.md
```

---

## Phase 0 — Project Scaffolding & Tooling

**Goal**: Monorepo setup, all apps and packages scaffolded, local dev running.

### Tasks

- [ ] **0.1** Init pnpm workspace (`pnpm-workspace.yaml`: `apps/*`, `packages/*`)
- [ ] **0.2** Create `turbo.json` — build pipeline: `packages/core → packages/ai → packages/db → apps/*`
- [ ] **0.3** Root `package.json` scripts: `dev` (parallel web+realtime), `build`, `lint`, `test`
- [ ] **0.4** Scaffold Next.js: `npx -y create-next-app@latest ./apps/web` (App Router, TS, ESLint, no Tailwind)
  - Pin Next.js 16.2.1, configure `next.config.ts` (standalone output, transpilePackages)
  - Create `features/`, `shared/` directories
- [ ] **0.5** Scaffold `apps/realtime`: package.json with `ws`, `yjs`, `y-protocols`, `jsonwebtoken`
- [ ] **0.6** Scaffold `packages/core` (Zod), `packages/ai` (OpenAI SDK), `packages/db` (Drizzle + pg), `packages/tsconfig`
- [ ] **0.7** `docker-compose.yml` for local Postgres 16 (pgvector) + Redis
- [ ] **0.8** Design tokens in `globals.css` (PRD §11): `--color-primary: #3A86FF`, `--color-bg: #0F1117`, `--color-surface: #1E222D`, etc.
- [ ] **0.9** ESLint 9 flat config + Prettier across workspaces
- [ ] **0.10** `.env.example` with all required vars
- [ ] **0.11** Verify `pnpm dev` starts web (3000) + realtime (4000)

### Wiring
```
turbo.json orchestrates: packages/* build first → apps/* build second
pnpm-workspace.yaml links: @createflowchart/core, @createflowchart/ai, @createflowchart/db
next.config.ts: transpilePackages: ["@createflowchart/core", "@createflowchart/ai", "@createflowchart/db"]
```

---

## Phase 1 — Core Engine (`packages/core`)

**Goal**: Build the FlowGraph — single source of truth for everything.

### Tasks

- [ ] **1.1** `schema.ts` — Zod schemas:
  - `NodeTypeEnum`: start | process | decision | action | end
  - `ActionConfigSchema`: webhook_url, method, headers, payload_template
  - `NodeDataSchema`: label, confidence (0-1), meta, action (optional)
  - `NodeSchema`: id, type, position {x,y}, data
  - `EdgeSchema`: id, source, target, label?, confidence?
  - `FlowMetaSchema`: version, createdBy, isSandbox
  - `FlowGraphSchema`: nodes[], edges[], meta
  - Export inferred TypeScript types
- [ ] **1.2** `validation.ts` — `validateFlowGraph()`, `isValidFlowGraph()`, `validatePartial()`
- [ ] **1.3** `transforms.ts` — `toReactFlowFormat()`, `fromReactFlowFormat()`, `toMermaid()`, `toJSON()`
- [ ] **1.4** `rules-engine.ts`:
  - `detectDeadEnds()` — nodes with no outgoing edges (except end)
  - `detectLoops()` — DFS cycle detection
  - `validateDecisionNodes()` — must have ≥2 outgoing edges
  - `validateStartNode()` — exactly 1 start, exactly 1 outgoing edge
  - `validateMaxDepth(max=20)` — prevent infinite if-else
  - `runAllRules()` — aggregate
- [ ] **1.5** Unit tests: 100% coverage on schema, transforms (round-trip lossless), every rule

### How It Wires
Every module in the system imports `FlowGraphSchema` from `@createflowchart/core`. Editor serializes to it. API validates against it. AI outputs parse into it. Realtime server snapshots it. Exports render from it.

---

## Phase 2 — Professional-Grade Editor

**Goal**: Full editor with sandbox/cloud modes, canvas, custom nodes, toolbar, "/" commands, auto-layout.

### 2A — Database, Auth & Infrastructure

- [ ] **2.1** `packages/db/src/schema.ts`: Drizzle tables for `users`, `sessions`, `accounts`, `flows`, `flow_versions` (Better Auth manages user/session/account tables via its Drizzle adapter)
- [ ] **2.2** Run initial migration via Drizzle Kit
- [ ] **2.3** `shared/lib/auth.ts`: Better Auth server instance with Drizzle adapter, GitHub + Google OAuth + email/password. `shared/lib/auth-client.ts`: client-side auth hooks (`useSession`, `signIn`, `signOut`)
- [ ] **2.4** `app/api/auth/[...all]/route.ts`: catch-all route using `toNextJsHandler(auth)`
- [ ] **2.5** `features/auth/`: LoginForm, SignupForm, AuthGuard (uses `useSession` from Better Auth client)
- [ ] **2.6** Auth middleware (`middleware.ts`): protect `/dashboard`, `/editor/[flowId]` routes
- [ ] **2.7** `shared/lib/redis.ts`: ioredis connection (self-hosted Redis via Coolify, `maxRetriesPerRequest: null`)
- [ ] **2.8** `shared/lib/queue.ts`: BullMQ queue definitions (`ai-generation`, `export-render`, `embedding-generation`)
- [ ] **2.9** `shared/lib/rate-limit.ts`: Redis-based rate limiter using `INCR` + `EXPIRE` (10 AI req/min/user)

### 2C — Editor Feature (`features/editor/`)

- [ ] **2.7** `editorStore.ts`: flowGraph, selectedNode/Edge, mode (sandbox|cloud), isDirty, undo/redo stacks. Atomic selectors: `useNodes()`, `useEdges()`, `useSelectedNode()`
- [ ] **2.8** `Canvas.tsx`: React Flow wrapper with custom node types, snap-to-grid (20px), minimap, controls, dark mode
- [ ] **2.9** Custom nodes (`nodes/`): StartNode (green pill), ProcessNode (blue rect), DecisionNode (diamond), ActionNode (orange rect + webhook icon), EndNode (red pill). Low-confidence (<0.7) → yellow glow
- [ ] **2.10** `EditorShell.tsx`: layout with Toolbar (top), Sidebar-left (node palette), Sidebar-right (inspector), Canvas (center)
- [ ] **2.11** `Toolbar.tsx`: undo, redo, zoom, fit, auto-layout, export, share, AI buttons
- [ ] **2.12** `Sidebar.tsx`: drag-to-add node palette (left), selected node inspector (right)
- [ ] **2.13** `CommandMenu.tsx` + `useCommandMenu.ts`: "/" keypress → floating palette with fuzzy search. Commands: add node types, auto-layout, generate, analyze, export
- [ ] **2.14** `useAutoLayout.ts` + `elk-worker.ts`: Web Worker running ELK.js. Toolbar button + auto-run on AI flows
- [ ] **2.15** `SandboxEditor.tsx` + `useSandboxStorage.ts`: no auth, localStorage persistence (debounced 2s), `meta.isSandbox=true`, banner with sign-in CTA
- [ ] **2.16** `CloudEditor.tsx`: auth required, loads from DB, auto-saves (debounced 2s) via API
- [ ] **2.17** Keyboard shortcuts: Ctrl+Z undo, Ctrl+Y redo, Delete remove, / command menu

### 2D — Dashboard Feature (`features/dashboard/`)

- [ ] **2.18** `flow-service.ts`: CRUD calls to `/api/flows`
- [ ] **2.19** `FlowList.tsx`: card grid (title, last edited, node count), "New Flow" + "Import JSON" buttons
- [ ] **2.20** API routes: `POST/GET /api/flows`, `GET/PUT/DELETE /api/flows/[id]` — thin handlers calling flow-service, Zod validation, Drizzle queries

### Wiring: Editor ↔ FlowGraph
```
User drags node → React Flow onChange → fromReactFlowFormat() → validateFlowGraph()
  → editorStore.setFlowGraph() → toReactFlowFormat() → React Flow re-renders
  → (sandbox) useSandboxStorage saves to localStorage
  → (cloud) auto-save PUT /api/flows/[id]
```

---

## Phase 3 — AI System

**Goal**: Prompt→FlowGraph, analysis, improvements, explanations — all with confidence scoring.

### 3A — Multi-Provider AI System (`packages/ai/`)

- [ ] **3.1** `providers/base.ts`: `AIProviderConfig` interface — `{ name, type (openrouter|openai|anthropic|xai), apiKey, baseUrl, models[] }`
- [ ] **3.2** `providers/openrouter.ts`: OpenRouter adapter — supports `models[]` array for built-in fallback within OpenRouter
- [ ] **3.3** `providers/openai.ts`: Direct OpenAI adapter (GPT-4o, o1, etc.)
- [ ] **3.4** `providers/anthropic.ts`: Direct Anthropic adapter (Claude 3.5/4)
- [ ] **3.5** `providers/xai.ts`: Direct xAI adapter (Grok)
- [ ] **3.6** `router.ts`: Priority-based provider routing engine:
  ```
  Config: [
    { provider: "openrouter", models: ["anthropic/claude-4", "openai/gpt-4o"], priority: 1 },
    { provider: "openai", models: ["gpt-4o"], priority: 2 },
    { provider: "anthropic", models: ["claude-sonnet-4"], priority: 3 },
  ]
  Flow: Try priority 1 → on failure, try priority 2 → on failure, try priority 3 → throw
  ```
- [ ] **3.7** `pipeline.ts`: `callLLM()` → router selects provider → JSON response → Zod validate → auto-repair → `Result<FlowGraph, AIError>` (includes `usedProvider` + `usedModel` in response metadata)
- [ ] **3.8** `prompts/generate.ts`: system prompt with FlowGraph schema + examples + constraints
- [ ] **3.9** `prompts/analyze.ts`: outputs structured report (dead ends, loops, missing branches)
- [ ] **3.10** `prompts/improve.ts`: outputs modified FlowGraph + change list
- [ ] **3.11** `prompts/explain.ts`: outputs markdown walkthrough
- [ ] **3.12** `confidence.ts`: score per node. AI nodes get LLM score, user nodes = 1.0. <0.7 = yellow glow

### 3B — BullMQ Jobs & Rate Limiting

- [ ] **3.13** `shared/lib/rate-limit.ts`: Redis INCR+EXPIRE, 10/min/user, 429 with Retry-After header
- [ ] **3.14** BullMQ `ai-generation` queue: long-running AI calls run as background jobs, results pushed via Server-Sent Events (SSE) to client for real-time progress
- [ ] **3.15** BullMQ `embedding-generation` queue: batch-generate embeddings for new templates asynchronously
- [ ] **3.16** Input sanitization: strip HTML, 2000 char limit, XSS prevention on labels

### 3C — AI Feature (`features/ai/`)

- [ ] **3.17** `ai-service.ts`: client-side fetch calls to `/api/ai/*`, SSE listener for job progress
- [ ] **3.18** `GenerateModal.tsx`: prompt input → generate → progress indicator → load into editor
- [ ] **3.19** `AnalysisPanel.tsx`: dead ends (red), loops (orange), suggestions list in right sidebar
- [ ] **3.20** `ImproveDiff.tsx`: shows proposed changes — approve/reject
- [ ] **3.21** `ExplainPanel.tsx`: markdown explanation in slide-out panel
- [ ] **3.22** `ProviderSettings.tsx`: user can configure provider priority, API keys (stored encrypted)
- [ ] **3.23** API routes: `POST /api/ai/{generate,analyze,improve,explain}` — auth + rate limit + enqueue BullMQ job

### Wiring: AI ↔ Editor
```
features/ai GenerateModal → /api/ai/generate → @createflowchart/ai pipeline → FlowGraph
  → features/editor editorStore.setFlowGraph() → Canvas renders → useAutoLayout() positions nodes
  → Low-confidence nodes get .low-confidence CSS class → yellow glow via --color-node-low-confidence
```

---

## Phase 4 — Real-Time Collaboration

**Goal**: Standalone Yjs server with JWT auth, live cursors, persistence to Postgres.

### 4A — Realtime Server (`apps/realtime/`)

- [ ] **4.1** `server.ts`: HTTP + WSS on PORT 4000, `GET /health`, connection upgrade with JWT validation
- [ ] **4.2** `handlers/sync.ts`: room = flow ID, load FlowGraph from Postgres on first connect, Yjs doc mirrors FlowGraph
- [ ] **4.3** `handlers/awareness.ts`: presence data (user, cursor {x,y}, selectedNodeId, status active|idle)
- [ ] **4.4** `persistence-worker.ts`: BullMQ repeatable job — snapshot changed rooms every 5s → validate → UPDATE Postgres. Final snapshot on room close. Uses `yjs-snapshot` queue
- [ ] **4.5** Per-socket rate limit via Redis: 100 msg/sec, disconnect + 60s ban (Redis sorted set with TTL)

### 4B — Collaboration Feature (`features/collaboration/`)

- [ ] **4.6** `useYjsSync.ts`: connect WebsocketProvider to `wss://realtime.../[flowId]?token=jwt`, bind Yjs↔Zustand↔React Flow, cleanup on unmount
- [ ] **4.7** `usePresence.ts`: awareness listener, broadcast local cursor/selection
- [ ] **4.8** `PresenceAvatars.tsx`: avatar row in toolbar with tooltips
- [ ] **4.9** `RemoteCursor.tsx`: colored dots + name labels on canvas
- [ ] **4.10** `ConnectionStatus.tsx`: 🟢 Connected / 🟡 Reconnecting / 🔴 Disconnected

### Wiring: Multiplayer
```
Browser A: React Flow ↔ Zustand ↔ Yjs Doc (local) ↔ WSS ──┐
                                                            ├─→ Realtime Server (Yjs authority)
Browser B: React Flow ↔ Zustand ↔ Yjs Doc (local) ↔ WSS ──┘        ↓
                                                        Persistence Worker → Postgres (snapshot every 5s)
```

---

## Phase 5 — Templates, Sharing & Gallery

**Goal**: SEO template pages with semantic search, public sharing, community gallery.

### 5A — Database

- [ ] **5.1** `templates` table: id, slug, title, description, data (jsonb), category, tags, seo_content, embedding (vector 1536), use_count, timestamps
- [ ] **5.2** Enable pgvector: `CREATE EXTENSION vector`, HNSW index on embedding column
- [ ] **5.3** `flow_likes` table: user_id + flow_id (unique pair). `like_count` cached on flows

### 5B — Templates Feature (`features/templates/`)

- [ ] **5.4** `template-service.ts`: list (paginated, by category), semantic search (embed query → cosine distance), get by slug
- [ ] **5.5** `TemplateList.tsx` (SSR): category sidebar, search bar, card grid, SEO meta + JSON-LD
- [ ] **5.6** `TemplateViewer.tsx` (SSR): read-only React Flow canvas, SEO content block, "Remix" button
- [ ] **5.7** `TemplateSearch.tsx`: real-time semantic search input
- [ ] **5.8** Seed script: 20+ templates with AI-generated FlowGraphs + embeddings

### 5C — Sharing Feature (`features/sharing/`)

- [ ] **5.9** `PublicFlowView.tsx`: read-only canvas, author attribution, "Remix" button, embed code snippet
- [ ] **5.10** `EmbedView.tsx`: chromeless iframe view + "Made with CreateFlowchart.com" watermark
- [ ] **5.11** `ShareModal.tsx`: toggle public/private, copy link, copy embed code
- [ ] **5.12** OG meta tags for rich link previews

### 5D — Gallery Feature (`features/gallery/`)

- [ ] **5.13** `GalleryGrid.tsx` (SSR): Pinterest masonry grid, sort (popular/recent/category), infinite scroll
- [ ] **5.14** `FlowCard.tsx`: title, author, node count, like count, preview image
- [ ] **5.15** `LikeButton.tsx`: optimistic like/unlike

---

## Phase 6 — Automation, Exports & DevOps

**Goal**: Action Nodes, high-fidelity exports, Docker, CI/CD, Coolify deployment.

### 6A — Action Nodes (in `features/editor/`)

- [ ] **6.1** `ActionNode.tsx` enhanced: webhook URL, method selector, encrypted headers editor, payload template, "Test" button
- [ ] **6.2** API: `POST /api/actions/test` — proxied webhook test with timeout
- [ ] **6.3** AES-256-GCM encryption for stored webhook headers

### 6B — Export Feature (`features/export/`)

- [ ] **6.4** `export-service.ts` + `useExport.ts`: PNG (html-to-image 2x), SVG (transparent), PDF (diagram + AI explanation + metadata), Mermaid (core transform), JSON (raw FlowGraph)
- [ ] **6.5** BullMQ `export-render` queue: heavy PDF/PNG exports run as background jobs, download link pushed via SSE
- [ ] **6.6** API: `POST /api/export` with format param → enqueue job → return job ID
- [ ] **6.7** Toolbar dropdown with format options + progress indicator

### 6C — Docker & Deployment

- [ ] **6.8** `apps/web/Dockerfile`: multi-stage (deps → build → standalone runner), target <200MB
- [ ] **6.9** `apps/realtime/Dockerfile`: multi-stage, target <100MB
- [ ] **6.10** Production `docker-compose.yml`: web (3000), realtime (4000), postgres (5432), redis (6379)
- [ ] **6.11** Coolify config: domains, SSL, health checks, env vars — Postgres + Redis self-hosted via Coolify
- [ ] **6.12** BullMQ Bull Board dashboard at `/admin/queues` for monitoring job status
- [ ] **6.13** CI: `.github/workflows/ci.yml` — lint → test → build on PR to dev
- [ ] **6.14** CD: `.github/workflows/deploy.yml` — build images → push → Coolify webhook on merge to dev
- [ ] **6.15** Sentry in web + realtime, source maps, error alerts
- [ ] **6.16** Postgres monitoring (`pg_stat_statements`), Redis monitoring (`INFO`, memory alerts), realtime server metrics

---

## Database Schema Summary

| Table | Phase | Columns |
|---|---|---|
| `users` | 2 | id (uuid), email, name, avatar_url, created_at |
| `flows` | 2 | id, user_id (FK), title, data (jsonb), is_public, is_featured, like_count, created_at, updated_at |
| `flow_versions` | 2 | id, flow_id (FK), data (jsonb), change_summary, version_number, created_at |
| `templates` | 5 | id, slug (unique), title, description, data (jsonb), category, tags, seo_content, embedding (vector), use_count, timestamps |
| `flow_likes` | 5 | user_id (FK), flow_id (FK), created_at — unique(user_id, flow_id) |

---

## Non-Negotiable Rules

1. **FlowGraph JSON is the ONLY truth** — every feature reads/writes same schema
2. **Yjs is the ONLY truth for live editing** — no direct DB writes during collab
3. **NEVER run WebSockets inside Next.js** — Realtime Server is separate
4. **No breaking schema changes without versioning** — `meta.version` field
5. **AI MUST include confidence scores** — every AI node/edge gets a score
6. **Sanitize ALL user text** — prompts, labels, descriptions
7. **Rate limit: 10 AI gen/min/user** — Redis INCR+EXPIRE
8. **BullMQ for heavy operations** — AI generation, export rendering, embedding generation
9. **Sandbox flows are private** — localStorage until explicit "Save to Cloud"
9. **All changes via `dev` branch** — no direct pushes to `main`
10. **Zustand is client-only** — never in Server Components
11. **`app/` pages are thin** — max 15 lines, import from `features/`
12. **`shared/` never imports `features/`** — dependency flows downward only

---

## Resolved Decisions

| Decision | Choice |
|---|---|
| **AI Provider** | Multi-provider with priority-based fallback: OpenRouter, OpenAI, Anthropic, xAI. User-configurable. |
| **Auth** | Better Auth with Drizzle adapter. GitHub + Google OAuth + email/password. |
| **Postgres/Redis** | Self-hosted via Coolify. Docker Compose for local dev. |
| **Job Queue** | BullMQ backed by Redis for AI generation, export rendering, embedding batch jobs. |
| **Rate Limiting** | Custom Redis-based (`INCR` + `EXPIRE`), no Upstash dependency. |

## Remaining Open Questions

> [!IMPORTANT]
> Need your input:

1. **Domain**: Is `createflowchart.com` ready on Coolify, or defer deployment?
2. **Template Content**: AI-generate seed templates, or hand-curate?
3. **Phase Order**: Current is 0→6 sequential. Skip or reorder any phase?
