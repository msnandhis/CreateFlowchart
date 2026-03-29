# CreateFlowchart Implementation Plan

Last updated: 2026-03-29

## 1. Delivery Principles

- Build this as a platform, not a feature branch.
- Keep the current editor working while the new platform foundation is introduced in parallel.
- Make every new layer reusable for future npm/JS distribution.
- Preserve one canonical document model across canvas, code, AI, import/export, and collaboration.
- Do not expand the old 5-node `FlowGraph` model further except for compatibility bridges.

## 2. Target Working Workflow

The platform must support one end-to-end lifecycle:

1. User creates a diagram from one of four entry points:
   - direct canvas
   - template remix
   - AI prompt
   - code import / Mermaid import / image import
2. Input is normalized into the canonical CreateFlowchart document model.
3. The document is edited through:
   - Canvas Mode
   - Code Mode
   - Split Mode
4. Collaboration runs on the canonical document through Yjs adapters.
5. Validation, AI confidence, and diagnostics update continuously.
6. User exports or publishes as:
   - SVG
   - PNG
   - PDF
   - Mermaid
   - CreateFlow DSL
   - JSON document
   - embed viewer
7. The same document can later be consumed by public npm packages.

## 3. Program Structure

## Phase 0: Stabilize Planning and Compatibility

Goal:
- Define the platform contract before replacing the editor internals.

Deliverables:
- platform strategy
- implementation plan
- canonical schema package
- migration helpers from legacy `FlowGraph`
- package split roadmap

Acceptance criteria:
- architecture is documented
- schema is versioned
- legacy editor can coexist with new platform packages

## Phase 1: Platform Core

Goal:
- Introduce the new canonical document model and registry-driven platform interfaces.

Deliverables:
- `@createflowchart/schema`
- document versioning
- diagram family definitions
- node/edge/container contracts
- shape and kit registry contracts
- legacy import bridge

Acceptance criteria:
- new documents can be created and validated independently of the current editor
- legacy `FlowGraph` can be migrated into the new document model

## Phase 2: Engine and Command System

Goal:
- Replace ad hoc editor state mutations with reusable commands.

Deliverables:
- `@createflowchart/engine`
- selection model
- node/edge/container commands
- undo/redo transaction system
- validation pipeline
- document patch utilities

Acceptance criteria:
- editor mutations can be executed without direct React Flow coupling
- commands are testable headlessly

## Phase 3: Shape Registry and Diagram Kits

Goal:
- Move from hardcoded node templates to scalable kits and shape packs.

Deliverables:
- `@createflowchart/shapes-core`
- `@createflowchart/shapes-bpmn`
- flowchart kit
- BPMN-lite kit
- swimlane/container kit
- edge routing definitions
- shape metadata for ports, label zones, and resize policies

Acceptance criteria:
- shape rendering is registry-driven
- adding a shape does not require editing a hardcoded switchboard

## Phase 4: Editor Kernel Rewrite

Goal:
- Upgrade the web editor from a basic canvas into a tool-grade editor.

Deliverables:
- registry-driven canvas renderer
- left palette rail
- rich inspector
- groups / lanes / frames
- advanced edge routing editor
- keyboard-first command system
- diagnostics/status bar
- outline/minimap

Acceptance criteria:
- flowchart and BPMN-lite diagrams are fully editable in canvas mode
- no hardcoded 5-node limitation remains in the primary editor path

## Phase 5: Code Mode and Native DSL

Goal:
- Make code a first-class authoring surface.

Deliverables:
- `@createflowchart/ast`
- `@createflowchart/parser`
- `@createflowchart/compiler`
- CreateFlow DSL
- formatter
- diagnostics
- canvas/code round-tripping

Acceptance criteria:
- users can author and edit diagrams in code
- canvas and code stay synchronized through the same document model

## Phase 6: Mermaid Interop

Goal:
- Win migration users without inheriting Mermaid’s constraints as the native model.

Deliverables:
- `@createflowchart/import-mermaid`
- `@createflowchart/export-mermaid`
- mapping diagnostics
- best-effort and strict import modes
- source provenance

Acceptance criteria:
- Mermaid diagrams can be imported into editable native documents
- supported native documents can export to Mermaid subsets

## Phase 7: AI Platform

Goal:
- Make AI operate on the canonical document as a patching and generation system.

Deliverables:
- family-aware AI generation
- improvement and repair patches
- explain mode
- image-to-diagram mode
- provenance and confidence metadata

Acceptance criteria:
- AI can create, modify, explain, and repair documents without blind overwrite

## Phase 8: Export and Publish

Goal:
- Make exports production quality.

Deliverables:
- `@createflowchart/export`
- scene graph based SVG export
- high-quality PNG export
- vector-safe PDF export
- embed viewer
- presentation and print modes

Acceptance criteria:
- exported output matches editor fidelity closely

## Phase 9: Collaboration and History

Goal:
- Make the product match the “GitHub for diagrams” vision.

Deliverables:
- `@createflowchart/collab-yjs`
- authoritative collaboration adapter
- checkpoints
- diffs
- restore
- comments
- review/suggestion flow

Acceptance criteria:
- shared documents preserve history and support structured review

## Phase 10: Public SDK and npm Distribution

Goal:
- Turn the platform into a reusable ecosystem.

Deliverables:
- public package boundaries
- docs and examples
- stable APIs
- embeddable viewer/editor surfaces

Acceptance criteria:
- consumers can parse, validate, render, import, export, and embed diagrams using published packages

## 4. Package Roadmap

Foundational packages:
- `@createflowchart/schema`
- `@createflowchart/engine`
- `@createflowchart/ast`
- `@createflowchart/parser`
- `@createflowchart/compiler`

Rendering and interaction:
- `@createflowchart/shapes-core`
- `@createflowchart/shapes-bpmn`
- `@createflowchart/layout`
- `@createflowchart/renderer`
- `@createflowchart/react`

Interop and distribution:
- `@createflowchart/import-mermaid`
- `@createflowchart/export-mermaid`
- `@createflowchart/export`
- `@createflowchart/viewer`
- `@createflowchart/collab-yjs`

## 5. Immediate Implementation Order

Start here:

1. add `@createflowchart/schema`
2. define document v2 and registry contracts
3. add a legacy migration adapter from current `FlowGraph`
4. keep the current editor on legacy data temporarily
5. add a thin compatibility layer so the web app can progressively adopt v2

Then:

1. introduce `@createflowchart/engine`
2. move mutations out of the current Zustand store
3. replace hardcoded nodes with a registry-backed renderer
4. rebuild the editor shell around palette + inspector + diagnostics

## 6. Current Sprint

This sprint should deliver:

- implementation plan document
- schema package scaffolding
- canonical document v2 definitions
- registry contracts
- legacy migration helper

That is the correct first slice because it creates the future foundation without destabilizing the current app immediately.
