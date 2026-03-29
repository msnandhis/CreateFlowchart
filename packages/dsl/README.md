# `@createflowchart/dsl`

Native CreateFlowchart DSL parser/compiler plus Mermaid interoperability helpers.

## Install

```bash
pnpm add @createflowchart/dsl @createflowchart/schema
```

## Use

```ts
import { documentToFlowDsl, flowDslToDocument, mermaidToDocument } from "@createflowchart/dsl";
```

This package also exports diagnostics and the Mermaid compatibility matrix used by the web editor.
