# `@createflowchart/schema`

Canonical document model for CreateFlowchart diagrams.

## Install

```bash
pnpm add @createflowchart/schema
```

## Use

```ts
import { createDiagramDocument, flowchartShapes } from "@createflowchart/schema";

const document = createDiagramDocument({
  family: "flowchart",
  kit: "core-flowchart",
  metadata: { title: "Order Flow", source: "native", tags: [] },
});
```

Exports include:

- document schemas and types
- registry contracts
- flowchart, BPMN, container, and edge presets
- legacy migration helpers
