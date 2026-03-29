# `@createflowchart/engine`

Headless command engine and history layer for `DiagramDocument`.

## Install

```bash
pnpm add @createflowchart/engine @createflowchart/schema
```

## Use

```ts
import { createEngine, addNode, undo } from "@createflowchart/engine";
```

Use this package to build editor behavior without coupling to React Flow or the web app store.
