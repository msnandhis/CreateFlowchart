# CreateFlowchart

CreateFlowchart is a document-first diagram platform built around three equal authoring modes:

- canvas editing
- native code editing
- AI generation and improvement

The product target is “Figma + GitHub + ChatGPT for flowcharts and process automation”, with first-class support for flowchart, BPMN-lite, templates, collaboration, export, and interoperability.

## Platform Shape

The monorepo is split into:

- `apps/web`: the Next.js product surface
- `apps/realtime`: the collaboration server
- `packages/schema`: canonical `DiagramDocument` model
- `packages/engine`: headless editor command engine
- `packages/dsl`: native DSL and Mermaid interoperability
- `packages/render`: document-first SVG rendering
- `packages/ai`: provider pipelines and structured AI contracts
- `packages/core`: legacy FlowGraph compatibility

## Current Architecture

The canonical model is `DiagramDocument`, not the legacy `FlowGraph`.

All major flows now normalize into the same document path:

- direct canvas creation
- template remix
- AI generate / improve / explain / analyze
- native DSL round-trip
- Mermaid import/export
- collaboration state and public preview rendering

## Development

```bash
pnpm install
pnpm dev
```

Useful checks:

```bash
pnpm --filter @createflowchart/schema type-check
pnpm --filter @createflowchart/engine type-check
pnpm --filter @createflowchart/dsl type-check
pnpm --filter @createflowchart/render type-check
pnpm --filter @createflowchart/ai type-check
pnpm --filter @createflowchart/web type-check
```

## Docs

- [Product Requirements](./docs/prd.md)
- [Architecture Plan](./docs/plan.md)
- [Platform Strategy](./docs/platform-strategy.md)
- [Master Implementation Map](./docs/master-implementation-map.md)
- [Interop Compatibility](./docs/interop-compatibility.md)
- [Library Distribution](./docs/library-distribution.md)
