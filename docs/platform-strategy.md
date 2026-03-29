# CreateFlowchart Platform Strategy

Last updated: 2026-03-29

## 1. Positioning

CreateFlowchart should not be planned as a lightweight flowchart editor or an MVP-grade builder. It should be planned as:

- a direct visual editor competitive with GoJS-powered products
- a text-and-code-driven diagram system competitive with Mermaid
- a collaboration and versioning product inspired by GitHub
- an AI-native workflow design system inspired by ChatGPT
- a future npm/JS diagram platform and SDK

Target positioning:

> Figma + GitHub + ChatGPT for Flowcharts, Process Design, and Automation

This implies four non-negotiable product pillars:

- direct canvas authoring
- live code authoring
- AI-assisted creation, analysis, improvement, and conversion
- portable platform architecture that can become an embeddable library and npm package

## 2. External Benchmark Summary

### GoJS benchmark

GoJS is not just a diagram renderer. Its sample surface area shows a full platform for diagram products:

- broad diagram families: flowchart, org chart, state chart, genogram, network, process flow, sankey, kanban, BPMN, data flow, circuit, concept map, seating chart, warehouse, SCADA, logic circuit, record mapper, tree mapper, grouping tools, accessibility, path finding
- editor capabilities: palettes, inspectors, context menus, tooltips, drag-and-drop, relinking, reshaping, regrouping, custom tools, custom panels, custom text editors, hover adornments, overview/minimap
- advanced routing: orthogonal, avoid-nodes, parallel routing, multi-node paths, dimension links, draggable/disconnectable links
- advanced shape system: predefined figures, custom SVG path shapes, custom arrowheads, dynamic ports, labeled ports
- groups and containers: swimlanes, subnetworks, dynamic grouping, collapsible groups, re-orderable lanes
- application-grade tools: rulers, absolute positioning constraints, custom animations, accessibility hooks, chart-in-node rendering, custom HTML menus

Reference pages:

- https://gojs.net/latest/samples/
- https://gojs.net/latest/samples/flowchart.html
- https://gojs.net/latest/samples/shapes.html

### Mermaid benchmark

Mermaid is not just a flowchart syntax. Its open-source docs show a broad code-first diagram platform:

- many diagram families: flowchart, sequence, class, state, ER, user journey, gantt, pie, quadrant, requirement, git graph, C4, mindmap, timeline, sankey, XY, block, packet, kanban, architecture, radar, treemap, venn
- syntax is based on a diagram declaration plus diagram-specific content
- theming and configuration are first-class
- layout algorithms are configurable, including ELK and Dagre
- live editor and CLI are part of the ecosystem

Reference pages:

- https://mermaid.ai/open-source/intro/syntax-reference.html
- https://mermaid.js.org/intro/syntax-reference
- https://mermaid.js.org/config/layouts
- https://mermaid.js.org/config/theming.html

## 3. Strategic Conclusion

CreateFlowchart should become a diagram platform with three authoring modes that all operate on one canonical platform AST:

- Canvas Mode: direct manipulation visual authoring
- Code Mode: first-party DSL and structured code editing
- AI Mode: prompt-driven generation, transformation, explanation, and repair

Everything else should sit on top of that:

- templates
- collaboration
- version history
- comments and review
- import/export
- embed
- npm SDK

## 4. Core Product Requirements

### 4.1 Authoring modes

The platform must support all of the following as first-class entry points:

- direct canvas create
- template -> edit
- AI -> create
- code -> render
- canvas <-> code sync
- Mermaid import -> mapped platform graph/code
- image/PDF/SVG import -> AI-assisted reconstruction

### 4.2 Product expectation

The product should support:

- a premium visual editor
- a programmable diagram language
- collaboration and versioning
- import/export and migration
- AI-native operations
- packaging for SDK/npm use

## 5. Diagram Platform Model

CreateFlowchart should not use a fixed 5-node schema long-term. The current `FlowGraph` model is too small for the target product.

The platform should evolve to a versioned registry-driven graph model:

- `diagramType`
- `kit`
- `version`
- `nodes`
- `edges`
- `groups`
- `annotations`
- `metadata`
- `layout`
- `theme`

Each node should include:

- semantic kind
- visual shape id
- ports
- size
- style
- content blocks
- data bindings
- behavior rules
- automation config
- AI confidence and provenance

Each edge should include:

- semantic kind
- route style
- markers
- labels
- waypoints
- constraints
- confidence

Each group/container should include:

- group type
- membership rules
- lane/frame/boundary behavior
- resize and nesting rules

## 6. Required Diagram Kits

### 6.1 Flowchart Kit

Must support:

- terminator
- process
- decision
- subprocess
- document
- multi-document
- data / input-output
- database
- stored data
- manual input
- preparation
- delay
- display
- connector
- off-page connector
- annotation
- merge
- extract
- sort
- collate
- action / webhook / API node
- retry / loop / conditional branch helpers

### 6.2 BPMN Lite Kit

Must support:

- start event
- intermediate event
- end event
- task
- user task
- service task
- manual task
- subprocess
- call activity
- exclusive gateway
- parallel gateway
- inclusive gateway
- event-based gateway
- pool
- lane
- message
- timer
- signal
- error
- data object
- data store

### 6.3 Additional kits

Should support over time:

- state diagrams
- sequence diagrams
- entity relationship diagrams
- class diagrams
- C4 diagrams
- architecture diagrams
- mind maps
- data flow diagrams
- sankey diagrams
- kanban boards
- tree and org charts

## 7. Canvas Requirements

### 7.1 Editor shell

The editor should include:

- left palette rail
- center canvas
- top command/action bar
- right inspector
- bottom diagnostics/status bar
- minimap / overview
- optional comments/activity panel

### 7.2 Canvas interactions

Must support:

- drag/drop from palette
- quick-add from connection handles
- slash menu
- keyboard-first operation
- pan, zoom, fit, focus
- box selection
- multi-select
- align/distribute
- duplicate
- group/ungroup
- frame/lane creation
- snap and guides
- port-aware linking
- relink and edge reshape
- route style change
- inline text edit
- drag constraints by diagram kit

### 7.3 Inspector

Must support structured editing for:

- content
- shape
- style
- ports
- routing
- semantics
- automation
- AI metadata
- accessibility text
- tags and documentation

## 8. Code Mode

CreateFlowchart should have its own language and control model. Do not copy Mermaid syntax directly.

Recommended design:

- CreateFlow DSL for human-editable diagrams
- CreateFlow AST as canonical machine representation
- compiled graph format for rendering/runtime

Principles:

- readable
- strongly typed by diagram kit
- good round-tripping with canvas
- stable enough for npm consumers
- extensible for future automation/runtime

Suggested layers:

- `@createflowchart/ast`
- `@createflowchart/parser`
- `@createflowchart/compiler`
- `@createflowchart/runtime`
- `@createflowchart/react`
- `@createflowchart/export`

Code Mode should support:

- live preview
- linting and diagnostics
- formatting
- auto-complete
- semantic validation
- kit-aware snippets
- AI-assisted edits
- diff view between versions

## 9. Mermaid Compatibility Strategy

CreateFlowchart should import Mermaid, but not imitate Mermaid as the native language.

### 9.1 Mermaid import requirements

Support import for:

- flowchart
- sequence
- class
- state
- ER
- gantt
- journey
- mindmap
- timeline
- architecture
- sankey
- block
- kanban

### 9.2 Mapping approach

Pipeline:

1. parse Mermaid source
2. produce intermediate Mermaid AST
3. normalize into CreateFlow AST
4. preserve unmappable syntax as metadata
5. render on canvas using the closest kit
6. show import report with warnings and precision score

### 9.3 Migration UX

Must provide:

- paste Mermaid -> preview mapping
- warnings for unsupported constructs
- “keep source attached” option
- reversible import metadata
- AI-assisted repair of broken Mermaid

## 10. AI Platform

AI should be a full platform layer, not just prompt-to-generate.

### 10.1 AI features

- generate from prompt
- generate from structured brief
- improve an existing diagram
- explain a diagram
- detect issues and anti-patterns
- convert Mermaid to CreateFlow
- convert image/PDF/sketch to diagram
- convert free text SOP/doc/process notes to diagram
- suggest templates
- generate automation wiring
- propose layout cleanup
- generate version summaries and diffs

### 10.2 AI engineering requirements

- use canonical AST targets, not raw node strings
- preserve confidence per generated object
- include provenance and repair attempts
- support patch/diff application rather than overwrite only
- allow user approval at node, edge, or group level

## 11. Image Conversion

Image conversion should be first-class.

### 11.1 Inputs

- screenshots
- scanned flowcharts
- whiteboard photos
- exported diagrams from other tools
- PDFs

### 11.2 Output pipeline

1. detect diagram family
2. OCR text
3. detect shapes/connectors/containers
4. reconstruct graph
5. infer semantic types
6. route edges
7. produce confidence report
8. open editable result in canvas

## 12. Export Requirements

Exports must be professional-grade, not placeholder conversions.

Must support:

- SVG
- PNG
- PDF
- CreateFlow DSL
- JSON AST
- Mermaid export where representable
- embed mode
- image slices / poster export for large diagrams

Export quality requirements:

- consistent typography
- vector fidelity
- custom fonts and theme support
- transparent backgrounds
- dark/light aware export
- deterministic sizing
- large-canvas safe export

## 13. Collaboration and Versioning

The product should combine canvas collaboration with Git-style history.

Must support:

- realtime collaboration
- presence
- cursor and selection sync
- diagram comments
- named versions
- restore points
- visual diff
- code diff
- AI-generated change summary
- branch/fork model for templates and public diagrams later

## 14. npm/JS Library Strategy

This product should be designed from the start to become a library platform.

### 14.1 Package strategy

- `@createflowchart/core`
- `@createflowchart/ast`
- `@createflowchart/parser`
- `@createflowchart/compiler`
- `@createflowchart/react`
- `@createflowchart/canvas`
- `@createflowchart/ui`
- `@createflowchart/export`
- `@createflowchart/import-mermaid`
- `@createflowchart/import-image`
- `@createflowchart/ai`

### 14.2 Library goals

- embeddable viewer
- embeddable editor
- schema and AST utilities
- parser/compiler APIs
- export APIs
- theming APIs
- controlled vs uncontrolled React components
- framework-agnostic core packages

## 15. Current Repo Gap Summary

Current repo strengths:

- monorepo structure exists
- shared core package exists
- basic AI pipeline exists
- basic realtime service exists
- template API exists
- export worker exists

Current repo gaps:

- graph schema only models 5 node types
- rendering is hardcoded to a tiny node set
- palette and inspector are minimal
- export implementation is placeholder-grade
- Mermaid support is export-only and basic
- no parser/AST/DSL layer
- no rich group/lane/container model
- no serious port model
- no route model beyond simple edges
- no version diff model
- no image conversion system
- no SDK package strategy in code
- no shape registry
- no diagram kits
- no library boundary between app/editor/runtime/parser

## 16. Recommended Program Structure

### Workstream A: Platform model

- schema v2
- AST
- node/edge/group registry
- diagram kits

### Workstream B: Canvas platform

- editor shell
- palette
- inspector
- tools
- interactions
- shape rendering

### Workstream C: Code platform

- CreateFlow DSL
- parser
- compiler
- formatter
- diagnostics

### Workstream D: Compatibility

- Mermaid import/export
- format mappings
- migration UX

### Workstream E: AI platform

- prompt generation
- conversion pipelines
- diff/patch workflow
- image conversion

### Workstream F: Collaboration and history

- Yjs alignment
- presence
- versions
- diffs
- comments

### Workstream G: Export/runtime/SDK

- high-fidelity export
- embeddable viewer/editor
- npm packages
- public API contracts

## 17. Delivery Phases

### Phase 1

- schema v2
- shape registry
- flowchart kit
- BPMN-lite kit
- premium canvas shell
- proper inspector
- route/port system

### Phase 2

- CreateFlow DSL
- live code editor
- canvas/code round-trip
- Mermaid import
- better export stack

### Phase 3

- AI patch mode
- image conversion
- comments
- version diff
- advanced collaboration

### Phase 4

- additional kits: state, sequence, ER, C4, architecture, mindmap
- embeddable SDK and npm release track

## 18. Unique Differentiators

CreateFlowchart should beat the combined category by doing what neither GoJS nor Mermaid fully solve together:

- direct canvas + live code in one platform
- AI-native authoring and repair
- Mermaid migration with quality mapping
- image-to-editable-diagram conversion
- Git-style versioning for diagrams
- automation-aware nodes and runtime metadata
- a publishable npm platform, not only a SaaS app

## 19. Immediate Next Actions

1. define schema v2 and registry interfaces
2. define CreateFlow DSL and AST contracts
3. freeze initial diagram kits and shape coverage
4. redesign the editor shell and inspector
5. split app code from reusable platform packages
6. specify Mermaid import mapping table
7. replace placeholder export path with true renderer/export pipeline
8. align realtime/persistence/versioning with canonical graph model
