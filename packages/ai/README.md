# `@createflowchart/ai`

Prompt pipelines, provider adapters, prompts, and document-first AI result contracts.

## Install

```bash
pnpm add @createflowchart/ai @createflowchart/schema
```

## Use

```ts
import { createPipeline, type AIDocumentGenerateResult } from "@createflowchart/ai";
```

Exports include:

- provider abstractions and concrete adapters
- generation, analysis, improvement, and explanation prompts
- shared structured AI contracts
- pipeline orchestration helpers
