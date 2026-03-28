import type { FlowGraph } from "./schema.js";

// ─── Rule Violation ────────────────────────────────────────────────
export interface RuleViolation {
  rule: string;
  severity: "error" | "warning";
  message: string;
  nodeIds?: string[];
}

// ─── Helper: build adjacency maps ─────────────────────────────────
function buildAdjacency(fg: FlowGraph) {
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const node of fg.nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const edge of fg.edges) {
    outgoing.get(edge.source)?.push(edge.target);
    incoming.get(edge.target)?.push(edge.source);
  }

  return { outgoing, incoming };
}

// ─── Dead End Detection ────────────────────────────────────────────
// Nodes with no outgoing edges that are NOT "end" type
export function detectDeadEnds(fg: FlowGraph): string[] {
  const { outgoing } = buildAdjacency(fg);
  const deadEnds: string[] = [];

  for (const node of fg.nodes) {
    if (node.type === "end") continue;
    const edges = outgoing.get(node.id) ?? [];
    if (edges.length === 0) {
      deadEnds.push(node.id);
    }
  }

  return deadEnds;
}

// ─── Loop/Cycle Detection (DFS-based) ──────────────────────────────
export function detectLoops(fg: FlowGraph): string[][] {
  const { outgoing } = buildAdjacency(fg);
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): void {
    if (inStack.has(nodeId)) {
      // Found a cycle — extract it from path
      const cycleStart = path.indexOf(nodeId);
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart).concat(nodeId));
      }
      return;
    }
    if (visited.has(nodeId)) return;

    visited.add(nodeId);
    inStack.add(nodeId);
    path.push(nodeId);

    for (const neighbor of outgoing.get(nodeId) ?? []) {
      dfs(neighbor);
    }

    path.pop();
    inStack.delete(nodeId);
  }

  for (const node of fg.nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }

  return cycles;
}

// ─── Decision Node Validation ──────────────────────────────────────
// Decision nodes must have ≥ 2 outgoing edges
export function validateDecisionNodes(fg: FlowGraph): RuleViolation[] {
  const { outgoing } = buildAdjacency(fg);
  const violations: RuleViolation[] = [];

  for (const node of fg.nodes) {
    if (node.type !== "decision") continue;
    const edges = outgoing.get(node.id) ?? [];
    if (edges.length < 2) {
      violations.push({
        rule: "decision-min-edges",
        severity: "error",
        message: `Decision node "${node.data.label}" (${node.id}) must have at least 2 outgoing edges, has ${edges.length}`,
        nodeIds: [node.id],
      });
    }
  }

  return violations;
}

// ─── Start Node Validation ─────────────────────────────────────────
// Exactly 1 start node with exactly 1 outgoing edge
export function validateStartNode(fg: FlowGraph): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const startNodes = fg.nodes.filter((n) => n.type === "start");

  if (startNodes.length === 0) {
    violations.push({
      rule: "start-node-required",
      severity: "error",
      message: "Flow must have exactly 1 start node, found 0",
    });
  } else if (startNodes.length > 1) {
    violations.push({
      rule: "start-node-unique",
      severity: "error",
      message: `Flow must have exactly 1 start node, found ${startNodes.length}`,
      nodeIds: startNodes.map((n) => n.id),
    });
  } else {
    const startNode = startNodes[0];
    const outEdges = fg.edges.filter((e) => e.source === startNode.id);
    if (outEdges.length !== 1) {
      violations.push({
        rule: "start-node-single-edge",
        severity: "error",
        message: `Start node must have exactly 1 outgoing edge, has ${outEdges.length}`,
        nodeIds: [startNode.id],
      });
    }
  }

  return violations;
}

// ─── Max Depth Validation ──────────────────────────────────────────
// Prevents infinite if-else depth (PRD: max 20)
export function validateMaxDepth(fg: FlowGraph, max = 20): boolean {
  const { outgoing } = buildAdjacency(fg);
  const visited = new Set<string>();

  function dfs(nodeId: string, depth: number): boolean {
    if (depth > max) return false;
    if (visited.has(nodeId)) return true; // Already visited — cycle handled elsewhere

    visited.add(nodeId);
    for (const neighbor of outgoing.get(nodeId) ?? []) {
      if (!dfs(neighbor, depth + 1)) return false;
    }
    visited.delete(nodeId); // Backtrack for accurate depth measurement
    return true;
  }

  const startNodes = fg.nodes.filter((n) => n.type === "start");
  for (const start of startNodes) {
    if (!dfs(start.id, 0)) return false;
  }
  return true;
}

// ─── Run All Rules ─────────────────────────────────────────────────
export function runAllRules(fg: FlowGraph): RuleViolation[] {
  const violations: RuleViolation[] = [];

  // Start node rules
  violations.push(...validateStartNode(fg));

  // Decision node rules
  violations.push(...validateDecisionNodes(fg));

  // Dead end detection
  const deadEnds = detectDeadEnds(fg);
  if (deadEnds.length > 0) {
    violations.push({
      rule: "dead-ends",
      severity: "warning",
      message: `Found ${deadEnds.length} dead-end node(s) with no outgoing edges`,
      nodeIds: deadEnds,
    });
  }

  // Loop detection
  const loops = detectLoops(fg);
  if (loops.length > 0) {
    violations.push({
      rule: "loops-detected",
      severity: "warning",
      message: `Found ${loops.length} cycle(s) in the flow graph`,
      nodeIds: Array.from(new Set(loops.flat())),
    });
  }

  // Max depth
  if (!validateMaxDepth(fg)) {
    violations.push({
      rule: "max-depth-exceeded",
      severity: "error",
      message: "Flow exceeds maximum depth of 20 levels",
    });
  }

  return violations;
}
