import { describe, it, expect } from "vitest";
import {
  FlowGraphSchema,
  NodeSchema,
  EdgeSchema,
  validateFlowGraph,
  isValidFlowGraph,
  createEmptyFlowGraph,
  createStarterFlowGraph,
  toReactFlowFormat,
  fromReactFlowFormat,
  toMermaid,
  toJSON,
  detectDeadEnds,
  detectLoops,
  validateDecisionNodes,
  validateStartNode,
  validateMaxDepth,
  runAllRules,
  type FlowGraph,
} from "../src/index.js";

// ═══════════════════════════════════════════════════════════════════
// SCHEMA TESTS
// ═══════════════════════════════════════════════════════════════════
describe("FlowGraph Schema", () => {
  const validGraph: FlowGraph = {
    nodes: [
      { id: "n1", type: "start", position: { x: 0, y: 0 }, data: { label: "Start", confidence: 1.0, meta: {} } },
      { id: "n2", type: "process", position: { x: 0, y: 100 }, data: { label: "Process", confidence: 0.9, meta: {} } },
      { id: "n3", type: "end", position: { x: 0, y: 200 }, data: { label: "End", confidence: 1.0, meta: {} } },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
    ],
    meta: { version: 1, isSandbox: false },
  };

  it("validates a correct FlowGraph", () => {
    const result = FlowGraphSchema.safeParse(validGraph);
    expect(result.success).toBe(true);
  });

  it("rejects empty node id", () => {
    const result = NodeSchema.safeParse({ id: "", type: "start", position: { x: 0, y: 0 }, data: { label: "X", confidence: 1, meta: {} } });
    expect(result.success).toBe(false);
  });

  it("rejects invalid node type", () => {
    const result = NodeSchema.safeParse({ id: "n1", type: "invalid", position: { x: 0, y: 0 }, data: { label: "X", confidence: 1, meta: {} } });
    expect(result.success).toBe(false);
  });

  it("rejects confidence out of range", () => {
    const result = NodeSchema.safeParse({ id: "n1", type: "start", position: { x: 0, y: 0 }, data: { label: "X", confidence: 1.5, meta: {} } });
    expect(result.success).toBe(false);
  });

  it("rejects empty edge source", () => {
    const result = EdgeSchema.safeParse({ id: "e1", source: "", target: "n2" });
    expect(result.success).toBe(false);
  });

  it("defaults confidence to 1.0", () => {
    const result = NodeSchema.safeParse({ id: "n1", type: "start", position: { x: 0, y: 0 }, data: { label: "X", meta: {} } });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.data.confidence).toBe(1.0);
  });

  it("validates action config on action nodes", () => {
    const actionNode = {
      id: "a1", type: "action", position: { x: 0, y: 0 },
      data: {
        label: "Webhook", confidence: 1.0, meta: {},
        action: { webhook_url: "https://api.example.com", method: "POST", headers: {} },
      },
    };
    const result = NodeSchema.safeParse(actionNode);
    expect(result.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════
describe("Validation", () => {
  it("validateFlowGraph returns success for valid data", () => {
    const fg = createStarterFlowGraph("user1");
    const result = validateFlowGraph(fg);
    expect(result.success).toBe(true);
  });

  it("validateFlowGraph returns error for invalid data", () => {
    const result = validateFlowGraph({ nodes: "bad" });
    expect(result.success).toBe(false);
  });

  it("isValidFlowGraph type guard works", () => {
    const fg = createEmptyFlowGraph();
    expect(isValidFlowGraph(fg)).toBe(true);
    expect(isValidFlowGraph({})).toBe(false);
  });

  it("createEmptyFlowGraph has no nodes", () => {
    const fg = createEmptyFlowGraph();
    expect(fg.nodes).toHaveLength(0);
    expect(fg.edges).toHaveLength(0);
  });

  it("createStarterFlowGraph has 3 nodes and 2 edges", () => {
    const fg = createStarterFlowGraph("user1", true);
    expect(fg.nodes).toHaveLength(3);
    expect(fg.edges).toHaveLength(2);
    expect(fg.meta.isSandbox).toBe(true);
    expect(fg.meta.createdBy).toBe("user1");
  });
});

// ═══════════════════════════════════════════════════════════════════
// TRANSFORM TESTS
// ═══════════════════════════════════════════════════════════════════
describe("Transforms", () => {
  const fg = createStarterFlowGraph("user1");

  it("toReactFlowFormat produces correct structure", () => {
    const { nodes, edges } = toReactFlowFormat(fg);
    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);
    expect(nodes[0].id).toBe("node_start");
    expect(nodes[0].type).toBe("start");
    expect(nodes[0].data.label).toBe("Start");
  });

  it("round-trip FlowGraph → ReactFlow → FlowGraph is lossless", () => {
    const { nodes, edges } = toReactFlowFormat(fg);
    const roundTripped = fromReactFlowFormat(nodes, edges, fg.meta);
    expect(roundTripped.nodes).toHaveLength(fg.nodes.length);
    expect(roundTripped.edges).toHaveLength(fg.edges.length);
    expect(roundTripped.nodes[0].data.label).toBe(fg.nodes[0].data.label);
    expect(roundTripped.nodes[0].data.confidence).toBe(fg.nodes[0].data.confidence);
    expect(roundTripped.meta.version).toBe(fg.meta.version);
  });

  it("toMermaid produces valid syntax", () => {
    const mermaid = toMermaid(fg);
    expect(mermaid).toContain("graph TD");
    expect(mermaid).toContain("node_start");
    expect(mermaid).toContain("-->");
  });

  it("toJSON produces parseable string", () => {
    const json = toJSON(fg);
    const parsed = JSON.parse(json);
    expect(parsed.nodes).toHaveLength(3);
  });

  it("low-confidence edges get warning style", () => {
    const lowConfFg: FlowGraph = {
      ...fg,
      edges: [{ id: "e1", source: "node_start", target: "node_process", confidence: 0.3 }],
    };
    const { edges } = toReactFlowFormat(lowConfFg);
    expect(edges[0].style).toBeDefined();
    expect((edges[0].style as Record<string, unknown>).stroke).toContain("#FFD60A");
  });
});

// ═══════════════════════════════════════════════════════════════════
// RULES ENGINE TESTS
// ═══════════════════════════════════════════════════════════════════
describe("Rules Engine", () => {
  it("detects dead ends", () => {
    const fg: FlowGraph = {
      nodes: [
        { id: "n1", type: "start", position: { x: 0, y: 0 }, data: { label: "Start", confidence: 1, meta: {} } },
        { id: "n2", type: "process", position: { x: 0, y: 100 }, data: { label: "Orphan", confidence: 1, meta: {} } },
      ],
      edges: [],
      meta: { version: 1, isSandbox: false },
    };
    const deadEnds = detectDeadEnds(fg);
    expect(deadEnds).toContain("n1");
    expect(deadEnds).toContain("n2");
  });

  it("does not flag end nodes as dead ends", () => {
    const fg: FlowGraph = {
      nodes: [
        { id: "n1", type: "end", position: { x: 0, y: 0 }, data: { label: "End", confidence: 1, meta: {} } },
      ],
      edges: [],
      meta: { version: 1, isSandbox: false },
    };
    const deadEnds = detectDeadEnds(fg);
    expect(deadEnds).toHaveLength(0);
  });

  it("detects loops", () => {
    const fg: FlowGraph = {
      nodes: [
        { id: "a", type: "process", position: { x: 0, y: 0 }, data: { label: "A", confidence: 1, meta: {} } },
        { id: "b", type: "process", position: { x: 0, y: 100 }, data: { label: "B", confidence: 1, meta: {} } },
      ],
      edges: [
        { id: "e1", source: "a", target: "b" },
        { id: "e2", source: "b", target: "a" },
      ],
      meta: { version: 1, isSandbox: false },
    };
    const loops = detectLoops(fg);
    expect(loops.length).toBeGreaterThan(0);
  });

  it("validates decision nodes need ≥2 edges", () => {
    const fg: FlowGraph = {
      nodes: [
        { id: "d1", type: "decision", position: { x: 0, y: 0 }, data: { label: "Check?", confidence: 1, meta: {} } },
        { id: "n1", type: "process", position: { x: 0, y: 100 }, data: { label: "Yes", confidence: 1, meta: {} } },
      ],
      edges: [{ id: "e1", source: "d1", target: "n1" }],
      meta: { version: 1, isSandbox: false },
    };
    const violations = validateDecisionNodes(fg);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("decision-min-edges");
  });

  it("validates start node exists and is unique", () => {
    const noStart: FlowGraph = { nodes: [], edges: [], meta: { version: 1, isSandbox: false } };
    expect(validateStartNode(noStart)).toHaveLength(1);

    const twoStarts: FlowGraph = {
      nodes: [
        { id: "s1", type: "start", position: { x: 0, y: 0 }, data: { label: "S1", confidence: 1, meta: {} } },
        { id: "s2", type: "start", position: { x: 100, y: 0 }, data: { label: "S2", confidence: 1, meta: {} } },
      ],
      edges: [],
      meta: { version: 1, isSandbox: false },
    };
    expect(validateStartNode(twoStarts)).toHaveLength(1);
  });

  it("validates max depth", () => {
    const fg = createStarterFlowGraph();
    expect(validateMaxDepth(fg, 20)).toBe(true);
    expect(validateMaxDepth(fg, 1)).toBe(false); // 3 levels exceeds max=1
  });

  it("runAllRules returns all violations", () => {
    const fg: FlowGraph = {
      nodes: [
        { id: "d1", type: "decision", position: { x: 0, y: 0 }, data: { label: "Check?", confidence: 1, meta: {} } },
      ],
      edges: [],
      meta: { version: 1, isSandbox: false },
    };
    const violations = runAllRules(fg);
    expect(violations.length).toBeGreaterThan(0);
    const rules = violations.map((v) => v.rule);
    expect(rules).toContain("start-node-required");
    expect(rules).toContain("decision-min-edges");
    expect(rules).toContain("dead-ends");
  });

  it("starter flow has minimal violations", () => {
    const fg = createStarterFlowGraph();
    const violations = runAllRules(fg);
    const errors = violations.filter((v) => v.severity === "error");
    expect(errors).toHaveLength(0);
  });
});
