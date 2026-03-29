# Master Implementation Map

This document locks the remaining platform work into batch-sized subsystems. Each batch is executed as a single integration unit with fixed file targets, acceptance criteria, and no opportunistic redesign during implementation.

## Batch Order

### Batch A: Collaboration Hardening
- Goal: make realtime collaboration deterministic, authenticated, and visible in the editor.
- Scope:
  - strict canonical document room contract
  - authenticated websocket bootstrap
  - shared presence UI in editor chrome and canvas
  - local checkpoint base for named restore points
- File targets:
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/realtime/src/auth.ts`
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/realtime/src/handlers/sync.ts`
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/realtime/src/persistence.ts`
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/realtime/src/server.ts`
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/web/app/api/realtime/token/route.ts`
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/web/features/editor/hooks/use-yjs.ts`
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/web/features/editor/hooks/use-presence.ts`
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/web/features/editor/components/EditorShell.tsx`
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/web/features/editor/components/Toolbar.tsx`
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/web/features/editor/components/Canvas.tsx`
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/web/features/editor/components/PresenceLayer.tsx`
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/web/features/editor/components/PresenceAvatars.tsx`
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/web/features/editor/components/RemoteCursor.tsx`
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/web/features/editor/stores/editorStore.ts`
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/web/features/editor/styles/toolbar.module.css`
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/apps/web/features/editor/styles/presence.module.css`
- Acceptance:
  - cloud editor websocket connections authenticate with a minted user token
  - presence avatars and cursors are driven by one awareness path
  - checkpoints can be created and restored from the toolbar
  - `@createflowchart/realtime` and `@createflowchart/web` type-check cleanly

### Batch B: Diagram Semantics
- Goal: complete core diagram behavior beyond the current migration base.
- Scope:
  - edge routing and marker editing
  - richer port rules and connection constraints
  - container nesting and lane semantics
  - inspector sections for style, behavior, and data
  - broader flowchart and BPMN semantics
- File targets:
  - schema presets, registry, engine commands/validators, editor inspector, renderer definitions
- Acceptance:
  - diagram kits define behavior instead of editor-local assumptions
  - flowchart and BPMN canvas authoring are materially broader than the current starter set

### Batch C: Interop and Code
- Goal: make native code mode and external interop library-grade.
- Scope:
  - freeze native DSL surface
  - better parse diagnostics and structured code diffs
  - Mermaid compatibility matrix and deterministic degradation rules
  - round-trip validation across document, DSL, and Mermaid
- File targets:
  - `/Users/nandhis/Documents/Projects/WebApp.js/OpenSource/CreateFlowChart/packages/dsl/src/index.ts`
  - document codec/import/export consumers
- Acceptance:
  - supported Mermaid and native DSL constructs round-trip predictably
  - unsupported constructs degrade explicitly

### Batch D: AI and Conversion
- Goal: move AI and conversion flows fully onto the canonical document model.
- Scope:
  - structured AI patch/apply workflows
  - image-to-diagram conversion
  - confidence and provenance UX
  - document-first improve/analyze/explain contracts
- File targets:
  - AI workers, services, routes, editor AI surfaces
- Acceptance:
  - AI produces document-first outputs and structured patches instead of ad hoc text blobs

### Batch E: Product System and Library Release
- Goal: finish the platform as a reusable product and distributable library.
- Scope:
  - shared diagram-native design system across editor, gallery, templates, public views
  - package API cleanup and documentation
  - npm distribution readiness for schema, engine, dsl, render, and adapters
  - end-to-end verification and examples
- File targets:
  - shared UI layer, package exports, docs, examples, release metadata
- Acceptance:
  - packages are publish-ready
  - product surfaces read as one system

## Execution Rules

- Lock the batch scope before editing.
- Touch each integration file once per batch whenever possible.
- Do not reopen files for opportunistic follow-up cleanup unless verification exposes a defect.
- Verify at package boundaries, not after every micro-change.
