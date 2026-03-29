# Library Distribution

CreateFlowchart is now structured so the reusable diagram engine can be released as npm packages independently of the web app.

## Publishable Packages

- `@createflowchart/core`
- `@createflowchart/schema`
- `@createflowchart/engine`
- `@createflowchart/dsl`
- `@createflowchart/render`
- `@createflowchart/ai`

`@createflowchart/db` remains internal.

## Release Workflow

1. Run `pnpm --filter @createflowchart/schema build` and the corresponding build for every publishable package.
2. Run focused checks:
   - `pnpm --filter @createflowchart/schema type-check`
   - `pnpm --filter @createflowchart/engine type-check`
   - `pnpm --filter @createflowchart/dsl type-check`
   - `pnpm --filter @createflowchart/render type-check`
   - `pnpm --filter @createflowchart/ai type-check`
3. Review the generated `dist/` outputs.
4. Publish the packages in dependency order:
   - `core`
   - `schema`
   - `engine`
   - `dsl`
   - `render`
   - `ai`

## Public API Boundaries

- `schema` owns the canonical document and registry contracts.
- `engine` owns command execution, selection, history, and validation.
- `dsl` owns native DSL and Mermaid interop.
- `render` owns static SVG rendering.
- `ai` owns provider integration and structured AI contracts.
- `core` is the legacy FlowGraph bridge for compatibility.

## Guidance

- New reusable platform capabilities should land in packages first, then be consumed by `apps/web`.
- Avoid importing web editor internals into packages.
- Keep publishable package APIs explicit through package root exports only.
