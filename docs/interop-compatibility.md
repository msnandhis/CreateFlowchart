# Interop Compatibility

This document locks the current Batch C interoperability contract.

## Native DSL

- Version: `1.0`
- Status: canonical code surface for `DiagramDocument`
- Guarantees:
  - preserves family, kit, title, description, nodes, edges, containers
  - preserves automation endpoints and methods
  - rejects unsupported commands explicitly
  - returns line-based diagnostics for parse failures

## Mermaid Import/Export

### Flowchart
- Supported:
  - nodes
  - subgraphs
  - default flows
  - conditional labels
  - message-style connectors
- Deterministic degradation:
  - ports are omitted
  - custom node styling is omitted
  - multiple edge labels collapse to the first label
  - manual and bezier routing are normalized
  - annotations are omitted

### BPMN Through Mermaid
- Supported:
  - tasks
  - gateways
  - subprocesses
  - pools and lanes through subgraphs
  - message-flow inference
- Deterministic degradation:
  - event taxonomy is normalized to the supported subset
  - marker fidelity is approximated
  - unsupported BPMN objects are exported through flowchart-compatible forms

### Sequence
- Supported:
  - participants
  - messages
  - return messages
- Deterministic degradation:
  - activation bars are omitted
  - notes and grouped blocks are omitted

### State
- Supported:
  - states
  - nested states
  - terminal transitions
  - labeled transitions
- Deterministic degradation:
  - unsupported state constructs are skipped with diagnostics
  - styling is omitted

## Consumer Rules

- Code mode must show diagnostics instead of silently accepting degraded input.
- Import flows must surface diagnostics before apply.
- Mermaid export must include warning comments when degradation occurs.
