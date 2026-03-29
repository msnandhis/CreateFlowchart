import {
  createDiagramDocument,
  type DiagramContainer,
  type DiagramDocument,
  type DiagramEdge,
  type DiagramNode,
} from "@createflowchart/schema";

export interface DiagramDslAst {
  family: DiagramDocument["family"];
  kit: string;
  title: string;
  description?: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  containers: DiagramContainer[];
}

export const NATIVE_DSL_VERSION = "1.0";

export interface DslDiagnostic {
  source: "dsl" | "mermaid" | "export";
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  line?: number;
  raw?: string;
}

export interface DiagramDslParseResult {
  ast: DiagramDslAst | null;
  diagnostics: DslDiagnostic[];
  degraded: boolean;
}

export interface DiagramDslDocumentResult {
  document: DiagramDocument;
  diagnostics: DslDiagnostic[];
  degraded: boolean;
}

export interface DiagramDslExportResult {
  content: string;
  diagnostics: DslDiagnostic[];
  degraded: boolean;
}

export const MERMAID_COMPATIBILITY_MATRIX = {
  flowchart: {
    supported: ["nodes", "subgraphs", "default flows", "conditional labels", "message-style connectors"],
    degraded: ["ports", "node styling", "multiple edge labels", "manual routing", "annotations"],
  },
  sequence: {
    supported: ["participants", "messages", "return messages"],
    degraded: ["activation bars", "notes", "alt/opt/par blocks"],
  },
  state: {
    supported: ["states", "nested states", "terminal transitions", "labeled transitions"],
    degraded: ["composite state internals beyond nested blocks", "styling", "parallel states"],
  },
  bpmn: {
    supported: ["tasks", "gateways", "subprocesses", "pools and lanes via subgraphs", "message flow inference"],
    degraded: ["full BPMN event taxonomy", "boundary events", "data objects", "marker fidelity"],
  },
} as const;

export function documentToAst(document: DiagramDocument): DiagramDslAst {
  return {
    family: document.family,
    kit: document.kit,
    title: document.metadata.title,
    description: document.metadata.description,
    nodes: document.nodes,
    edges: document.edges,
    containers: document.containers,
  };
}

export function astToDocument(
  ast: DiagramDslAst,
  base?: Partial<DiagramDocument>,
): DiagramDocument {
  return createDiagramDocument({
    ...base,
    family: ast.family,
    kit: ast.kit,
    metadata: {
      title: ast.title,
      description: ast.description,
      source: "native",
      tags: base?.metadata?.tags ?? [],
      authorId: base?.metadata?.authorId,
      createdAt: base?.metadata?.createdAt,
      updatedAt: base?.metadata?.updatedAt,
    },
    nodes: ast.nodes,
    edges: ast.edges,
    containers: ast.containers,
    annotations: base?.annotations ?? [],
    layout: base?.layout,
    theme: base?.theme,
  });
}

export function documentToFlowDsl(document: DiagramDocument): string {
  return documentToFlowDslWithDiagnostics(document).content;
}

export function flowDslToDocument(
  source: string,
  base?: Partial<DiagramDocument>,
): DiagramDocument {
  return flowDslToDocumentWithDiagnostics(source, base).document;
}

export function mermaidToDocument(
  source: string,
  base?: Partial<DiagramDocument>,
): DiagramDocument {
  return mermaidToDocumentWithDiagnostics(source, base).document;
}

export function documentToMermaid(document: DiagramDocument): string {
  return documentToMermaidWithDiagnostics(document).content;
}

export function documentToFlowDslWithDiagnostics(
  document: DiagramDocument,
): DiagramDslExportResult {
  const diagnostics = collectDslExportDiagnostics(document);
  return {
    content: printFlowDsl(documentToAst(document)),
    diagnostics,
    degraded: diagnostics.some((diagnostic) => diagnostic.severity !== "info"),
  };
}

export function flowDslToDocumentWithDiagnostics(
  source: string,
  base?: Partial<DiagramDocument>,
): DiagramDslDocumentResult {
  const parsed = parseFlowDslWithDiagnostics(source);
  if (!parsed.ast) {
    throw formatDiagnosticsError(parsed.diagnostics, "Native DSL parse failed");
  }

  return {
    document: astToDocument(parsed.ast, base),
    diagnostics: parsed.diagnostics,
    degraded: parsed.degraded,
  };
}

export function mermaidToDocumentWithDiagnostics(
  source: string,
  base?: Partial<DiagramDocument>,
): DiagramDslDocumentResult {
  const parsed = parseMermaidWithDiagnostics(source);
  if (!parsed.ast) {
    throw formatDiagnosticsError(parsed.diagnostics, "Mermaid parse failed");
  }

  return {
    document: astToDocument(parsed.ast, base),
    diagnostics: parsed.diagnostics,
    degraded: parsed.degraded,
  };
}

export function documentToMermaidWithDiagnostics(
  document: DiagramDocument,
): DiagramDslExportResult {
  const diagnostics = collectMermaidExportDiagnostics(document);
  const comments = diagnostics
    .filter((diagnostic) => diagnostic.severity !== "info")
    .map((diagnostic) => `%% ${diagnostic.code}: ${diagnostic.message}`);

  if (document.family === "sequence") {
    const content = documentToMermaidSequence(document);
    return {
      content: comments.length > 0 ? `${comments.join("\n")}\n${content}` : content,
      diagnostics,
      degraded: comments.length > 0,
    };
  }

  if (document.family === "state") {
    const content = documentToMermaidState(document);
    return {
      content: comments.length > 0 ? `${comments.join("\n")}\n${content}` : content,
      diagnostics,
      degraded: comments.length > 0,
    };
  }

  const lines: string[] = ["flowchart TD"];
  const renderedNodes = new Set<string>();
  const rootContainerIds = document.containers
    .filter((container) => !container.metadata.parentContainerId)
    .map((container) => container.id);

  const renderNode = (node: DiagramNode) => {
    if (renderedNodes.has(node.id)) {
      return;
    }

    const label = formatMermaidNodeLabel(node);

    if (node.kind.includes("start") || node.kind.includes("end")) {
      lines.push(
        document.family === "bpmn" &&
          (node.kind.includes("timer") ||
            node.kind.includes("message") ||
            node.kind.includes("error"))
          ? `    ${node.id}(("${label}"))`
          : `    ${node.id}(["${label}"])`,
      );
    } else if (document.family === "bpmn" && node.kind.includes("parallel")) {
      lines.push(`    ${node.id}{{"${label}"}}`);
    } else if (node.kind.includes("gateway") || node.kind.includes("decision")) {
      lines.push(`    ${node.id}{"${label}"}`);
    } else if (node.kind.includes("automation") || node.kind.includes("service")) {
      lines.push(`    ${node.id}[/\"${label}\"/]`);
    } else if (document.family === "bpmn" && node.kind.includes("subprocess")) {
      lines.push(`    ${node.id}[[\"${label}\"]]`);
    } else if (node.shape === "document" || node.shape === "multi-document") {
      lines.push(`    ${node.id}["${label}"]`);
    } else {
      lines.push(`    ${node.id}["${label}"]`);
    }

    renderedNodes.add(node.id);
  };

  const renderContainer = (containerId: string, depth: number) => {
    const container = document.containers.find((entry) => entry.id === containerId);
    if (!container) {
      return;
    }

    const indent = "    ".repeat(depth + 1);
    lines.push(`${indent}subgraph ${container.id}["${container.label.replace(/"/g, "'")}"]`);

    for (const childContainerId of container.childContainerIds) {
      renderContainer(childContainerId, depth + 1);
    }

    for (const childNodeId of container.childNodeIds) {
      const node = document.nodes.find((entry) => entry.id === childNodeId);
      if (node) {
        renderNode(node);
      }
    }

    lines.push(`${indent}end`);
  };

  for (const containerId of rootContainerIds) {
    renderContainer(containerId, 0);
  }

  for (const node of document.nodes) {
    renderNode(node);
  }

  for (const edge of document.edges) {
    const label = edge.labels[0]?.text?.replace(/"/g, "'");
    const connector = edge.kind.includes("message")
      ? "-.->"
      : edge.kind.includes("association")
        ? "---"
        : edge.kind.includes("conditional") || edge.labels.length > 0
          ? "==>"
          : "-->";

    lines.push(
      label
        ? `    ${edge.sourceNodeId} ${connector}|\"${label}\"| ${edge.targetNodeId}`
        : `    ${edge.sourceNodeId} ${connector} ${edge.targetNodeId}`,
    );
  }

  const content = lines.join("\n");
  return {
    content: comments.length > 0 ? `${comments.join("\n")}\n${content}` : content,
    diagnostics,
    degraded: comments.length > 0,
  };
}

export function parseMermaid(source: string): DiagramDslAst {
  return requireAst(parseMermaidWithDiagnostics(source), "Mermaid parse failed");
}

export function parseMermaidWithDiagnostics(source: string): DiagramDslParseResult {
  const trimmed = source.trim();
  if (/^sequenceDiagram\b/i.test(trimmed)) {
    return parseMermaidSequence(trimmed);
  }

  if (/^stateDiagram(?:-v2)?\b/i.test(trimmed)) {
    return parseMermaidState(trimmed);
  }

  return parseMermaidFlowchart(trimmed);
}

export function printFlowDsl(ast: DiagramDslAst): string {
  const lines: string[] = [
    `diagram "${escapeString(ast.title)}" family ${ast.family} kit ${ast.kit}`,
  ];

  if (ast.description) {
    lines.push(`description "${escapeString(ast.description)}"`);
  }

  for (const container of ast.containers) {
    const parent = container.metadata.parentContainerId;
    lines.push(
      [
        "container",
        container.id,
        container.type,
        `"${escapeString(container.label)}"`,
        "at",
        formatNumber(container.position.x),
        formatNumber(container.position.y),
        "size",
        formatNumber(container.size.width),
        formatNumber(container.size.height),
        parent ? `in ${parent}` : "",
        container.childNodeIds.length
          ? `children ${container.childNodeIds.join(",")}`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  for (const node of ast.nodes) {
    lines.push(
      [
        "node",
        node.id,
        node.shape,
        `"${escapeString(node.content.title)}"`,
        "at",
        formatNumber(node.position.x),
        formatNumber(node.position.y),
        "size",
        formatNumber(node.size.width),
        formatNumber(node.size.height),
        "family",
        node.family,
        "kind",
        node.kind,
      ].join(" "),
    );

    if (node.automation?.endpoint) {
      lines.push(
        [
          "automation",
          node.id,
          node.automation.method ?? "POST",
          `"${escapeString(node.automation.endpoint)}"`,
        ].join(" "),
      );
    }
  }

  for (const edge of ast.edges) {
    lines.push(
      [
        "edge",
        edge.id,
        edge.sourceNodeId,
        edge.sourcePortId ?? "_",
        edge.targetNodeId,
        edge.targetPortId ?? "_",
        edge.labels[0]?.text ? `"${escapeString(edge.labels[0].text)}"` : '""',
      ].join(" "),
    );
  }

  return lines.join("\n");
}

export function parseFlowDsl(source: string): DiagramDslAst {
  return requireAst(parseFlowDslWithDiagnostics(source), "Native DSL parse failed");
}

export function parseFlowDslWithDiagnostics(source: string): DiagramDslParseResult {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  let family: DiagramDocument["family"] = "flowchart";
  let kit = "core-flowchart";
  let title = "Untitled Diagram";
  let description: string | undefined;
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const containers: DiagramContainer[] = [];
  const automationByNodeId = new Map<string, DiagramNode["automation"]>();
  const diagnostics: DslDiagnostic[] = [];

  for (const [index, line] of lines.entries()) {
    const tokens = tokenize(line);
    const [command, ...rest] = tokens;

    if (command === "diagram") {
      title = stripQuoted(rest[0]) || title;
      family = (rest[2] as DiagramDocument["family"]) || family;
      kit = rest[4] || kit;
      continue;
    }

    if (command === "description") {
      description = stripQuoted(rest[0]) || description;
      continue;
    }

    if (command === "container") {
      const id = rest[0];
      const type = rest[1] as DiagramContainer["type"];
      const label = stripQuoted(rest[2]) || "Container";
      const x = Number(rest[4] ?? 0);
      const y = Number(rest[5] ?? 0);
      const width = Number(rest[7] ?? 800);
      const height = Number(rest[8] ?? 160);
      const parentIndex = rest.indexOf("in");
      const childrenIndex = rest.indexOf("children");
      const parentContainerId =
        parentIndex >= 0 ? rest[parentIndex + 1] : undefined;
      const childNodeIds =
        childrenIndex >= 0 ? rest[childrenIndex + 1]?.split(",") ?? [] : [];

      containers.push({
        id,
        family: type === "lane" && family === "swimlane" ? "swimlane" : family,
        type,
        label,
        position: { x, y },
        size: { width, height },
        childNodeIds,
        childContainerIds: [],
        style: { tokens: {} },
        metadata: parentContainerId ? { parentContainerId } : {},
      });
      continue;
    }

    if (command === "node") {
      const id = rest[0];
      const shape = rest[1];
      const label = stripQuoted(rest[2]) || "Node";
      const x = Number(rest[4] ?? 0);
      const y = Number(rest[5] ?? 0);
      const width = Number(rest[7] ?? 180);
      const height = Number(rest[8] ?? 64);
      const familyIndex = rest.indexOf("family");
      const kindIndex = rest.indexOf("kind");
      const nodeFamily =
        familyIndex >= 0
          ? (rest[familyIndex + 1] as DiagramNode["family"])
          : family;
      const kind = kindIndex >= 0 ? rest[kindIndex + 1] : "process-step";

      nodes.push({
        id,
        family: nodeFamily,
        kind,
        shape,
        position: { x, y },
        size: { width, height },
        ports: [],
        content: {
          title: label,
          labels: [],
        },
        style: { tokens: {} },
        resizePolicy: "content",
        metadata: {
          family: nodeFamily,
          semanticKind: kind,
          shapeId: shape,
        },
      });
      continue;
    }

    if (command === "automation") {
      const nodeId = rest[0];
      automationByNodeId.set(nodeId, {
        actionType: "http",
        method:
          rest[1] as NonNullable<DiagramNode["automation"]>["method"],
        endpoint: stripQuoted(rest[2]),
        headers: {},
        metadata: {},
      });
      continue;
    }

    if (command === "edge") {
      const id = rest[0];
      const sourceNodeId = rest[1];
      const sourcePortId = rest[2] !== "_" ? rest[2] : undefined;
      const targetNodeId = rest[3];
      const targetPortId = rest[4] !== "_" ? rest[4] : undefined;
      const label = stripQuoted(rest[5]);

      edges.push({
        id,
        family,
        kind: label ? "conditional-flow" : "flow",
        sourceNodeId,
        sourcePortId,
        targetNodeId,
        targetPortId,
        routing: "orthogonal",
        waypoints: [],
        labels: label ? [{ text: label, position: "center" }] : [],
        startMarker: "none",
        endMarker: "arrow",
        style: { tokens: {} },
        metadata: {},
      });
      continue;
    }

    diagnostics.push({
      source: "dsl",
      severity: "error",
      code: "unsupported-dsl-command",
      message: `Unsupported DSL command "${command}"`,
      line: index + 1,
      raw: line,
    });
  }

  const resolvedNodes = nodes.map((node) => ({
    ...node,
    automation: automationByNodeId.get(node.id) ?? node.automation,
  }));

  const ast = {
    family,
    kit,
    title,
    description,
    nodes: resolvedNodes,
    edges,
    containers,
  };

  return {
    ast: diagnostics.some((diagnostic) => diagnostic.severity === "error")
      ? null
      : ast,
    diagnostics,
    degraded: diagnostics.some((diagnostic) => diagnostic.severity !== "info"),
  };
}

export function parseMermaidFlowchart(source: string): DiagramDslParseResult {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("%%"));

  const firstLine = lines[0] ?? "";
  const directionMatch = firstLine.match(/(?:flowchart|graph)\s+([A-Z]{2})/i);
  const direction = directionMatch?.[1] ?? "TD";
  const nodes = new Map<string, DiagramNode>();
  const containers = new Map<string, DiagramContainer>();
  const edges: DiagramEdge[] = [];
  const containerStack: string[] = [];
  const laneOffsets = new Map<string, number>();
  const nodeToContainer = new Map<string, string>();
  const childContainerAssignments = new Map<string, Set<string>>();
  const diagnostics: DslDiagnostic[] = [];
  let inferredFamily: DiagramDocument["family"] = "flowchart";
  let inferredKit = "core-flowchart";

  const ensureContainer = (containerId: string, label: string) => {
    if (containers.has(containerId)) {
      return containers.get(containerId)!;
    }

    const parentContainerId = containerStack.at(-1);
    const normalizedLabel = label.toLowerCase();
    const containerFamily =
      normalizedLabel.includes("pool") ||
      normalizedLabel.includes("lane") ||
      parentContainerId
        ? "bpmn"
        : inferredFamily;
    const type =
      normalizedLabel.includes("pool")
        ? ("pool" as const)
        : parentContainerId || /lane/i.test(label)
          ? ("lane" as const)
          : ("group" as const);
    if (containerFamily === "bpmn") {
      inferredFamily = "bpmn";
      inferredKit = "bpmn-lite";
    }
    const laneOffset = parentContainerId
      ? laneOffsets.get(parentContainerId) ?? 0
      : containers.size * 220;
    const container: DiagramContainer = {
      id: containerId,
      family: containerFamily,
      type,
      label,
      position: {
        x: parentContainerId ? 80 : 40,
        y: parentContainerId ? 40 + laneOffset : 40 + containers.size * 40,
      },
      size: {
        width: parentContainerId ? 920 : 1000,
        height: parentContainerId ? 180 : 240,
      },
      childNodeIds: [],
      childContainerIds: [],
      style: { tokens: {} },
      metadata: parentContainerId ? { parentContainerId } : {},
    };

    containers.set(containerId, container);

    if (parentContainerId) {
      const siblings = childContainerAssignments.get(parentContainerId) ?? new Set<string>();
      siblings.add(containerId);
      childContainerAssignments.set(parentContainerId, siblings);
      laneOffsets.set(parentContainerId, laneOffset + 180);
    }

    return container;
  };

  const ensureNode = (nodeId: string, token?: string) => {
    if (nodes.has(nodeId)) {
      const existing = nodes.get(nodeId)!;
      const activeContainerId = containerStack.at(-1);
      if (activeContainerId && !nodeToContainer.has(nodeId)) {
        nodeToContainer.set(nodeId, activeContainerId);
      }
      return existing;
    }

    const parsed = parseMermaidNodeToken(token ?? nodeId);
    if (parsed.family === "bpmn") {
      inferredFamily = "bpmn";
      inferredKit = "bpmn-lite";
    }
    const index = nodes.size;
    const activeContainerId = containerStack.at(-1);
    const container = activeContainerId ? containers.get(activeContainerId) : undefined;
    const x = direction === "LR" || direction === "RL" ? index * 260 : 120;
    const y = direction === "LR" || direction === "RL" ? 120 : index * 140;

    const node: DiagramNode = {
      id: nodeId,
      family: parsed.family ?? inferredFamily,
      kind: parsed.kind,
      shape: parsed.shape,
      position: {
        x: container ? container.position.x + 120 + ((container.childNodeIds.length % 3) * 220) : x,
        y: container
          ? container.position.y + 72 + Math.floor(container.childNodeIds.length / 3) * 120
          : y,
      },
      size: parsed.size,
      ports: [],
      content: {
        title: parsed.label,
        labels: [],
      },
      style: { tokens: {} },
      resizePolicy: "content",
      metadata: {
        family: parsed.family ?? inferredFamily,
        semanticKind: parsed.kind,
        shapeId: parsed.shape,
      },
    };

    nodes.set(nodeId, node);
    if (activeContainerId && container) {
      container.childNodeIds.push(nodeId);
      nodeToContainer.set(nodeId, activeContainerId);
    }
    return node;
  };

  for (const line of lines.slice(1)) {
    if (/^subgraph\s+/i.test(line)) {
      const subgraphMatch = line.match(/^subgraph\s+([A-Za-z0-9_-]+)?(?:\[(.+)\]|\"(.+)\"|(.+))?$/i);
      const rawId = subgraphMatch?.[1];
      const rawLabel = subgraphMatch?.[2] ?? subgraphMatch?.[3] ?? subgraphMatch?.[4];
      const label = rawLabel?.trim() || rawId || `Group ${containers.size + 1}`;
      const containerId =
        rawId && rawId.length > 0 ? rawId : `subgraph_${containers.size + 1}`;
      ensureContainer(containerId, label.replace(/^"|"$/g, ""));
      containerStack.push(containerId);
      continue;
    }

    if (/^end$/i.test(line)) {
      containerStack.pop();
      continue;
    }

    const edgeMatch = line.match(
      /^(.+?)\s*(-->|-.->|==>|---)\s*(?:\|([^|]+)\|\s*)?(.+)$/,
    );

    if (edgeMatch) {
      const [, rawSource, connector, edgeLabel, rawTarget] = edgeMatch;
      const sourceToken = rawSource.trim();
      const targetToken = rawTarget.trim();
      const sourceId = extractNodeId(sourceToken);
      const targetId = extractNodeId(targetToken);

      ensureNode(sourceId, sourceToken);
      ensureNode(targetId, targetToken);

      edges.push({
        id: `edge_${sourceId}_${targetId}_${edges.length + 1}`,
        family: "flowchart",
        kind:
          connector === "-.->"
            ? "message-flow"
            : connector === "---"
              ? "association-flow"
              : edgeLabel || connector === "==>"
                ? "conditional-flow"
                : "flow",
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        routing: "orthogonal",
        waypoints: [],
        labels: edgeLabel
          ? [{ text: edgeLabel.trim(), position: "center" }]
          : [],
        startMarker: "none",
        endMarker: "arrow",
        style: { tokens: {} },
        metadata: {},
      });
      if (connector === "==>") {
        diagnostics.push({
          source: "mermaid",
          severity: "warning",
          code: "mermaid-conditional-flow",
          message: `Conditional connector "${connector}" is normalized to edge kind "${edgeLabel ? "conditional-flow" : "flow"}"`,
          raw: line,
        });
      }
      continue;
    }

    const nodeId = extractNodeId(line);
    if (nodeId) {
      ensureNode(nodeId, line);
      continue;
    }

    diagnostics.push({
      source: "mermaid",
      severity: "warning",
      code: "unsupported-mermaid-line",
      message: "Unsupported Mermaid flowchart statement was skipped",
      raw: line,
    });
  }

  for (const [containerId, childContainerIds] of childContainerAssignments.entries()) {
    const container = containers.get(containerId);
    if (container) {
      container.childContainerIds = Array.from(childContainerIds);
    }
  }

  const normalizedNodes = Array.from(nodes.values()).map((node) => {
    if (inferredFamily !== "bpmn") {
      return node;
    }

    let kind = node.kind;
    let shape = node.shape;
    if (node.shape === "decision") {
      kind = "exclusive-gateway";
      shape = "bpmn-exclusive-gateway";
    } else if (node.shape === "terminator-start") {
      shape = "bpmn-start-event";
    } else if (node.shape === "action-task") {
      kind = "service-task";
      shape = "bpmn-service-task";
    }

    return {
      ...node,
      family: "bpmn" as const,
      kind,
      shape,
      metadata: {
        ...node.metadata,
        family: "bpmn",
        semanticKind: kind,
        shapeId: shape,
      },
    };
  });

  return {
    ast: {
      family: inferredFamily,
      kit: inferredKit,
      title: "Imported Mermaid Diagram",
      nodes: normalizedNodes,
      edges,
      containers: Array.from(containers.values()),
    },
    diagnostics,
    degraded: diagnostics.some((diagnostic) => diagnostic.severity !== "info"),
  };
}

export function parseMermaidSequence(source: string): DiagramDslParseResult {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("%%"));

  const participants = new Map<string, DiagramNode>();
  const edges: DiagramEdge[] = [];
  const diagnostics: DslDiagnostic[] = [];

  const ensureParticipant = (id: string, label?: string) => {
    if (participants.has(id)) {
      return participants.get(id)!;
    }

    const index = participants.size;
    const node: DiagramNode = {
      id,
      family: "sequence",
      kind: "participant",
      shape: "participant",
      position: { x: 120 + index * 220, y: 72 },
      size: { width: 160, height: 56 },
      ports: [],
      content: { title: label ?? id, labels: [] },
      style: { tokens: {} },
      resizePolicy: "content",
      metadata: {
        family: "sequence",
        semanticKind: "participant",
        shapeId: "participant",
      },
    };

    participants.set(id, node);
    return node;
  };

  for (const line of lines.slice(1)) {
    const participantMatch = line.match(/^(participant|actor)\s+([A-Za-z0-9_-]+)(?:\s+as\s+(.+))?$/i);
    if (participantMatch) {
      ensureParticipant(
        participantMatch[2],
        participantMatch[3]?.replace(/^"|"$/g, ""),
      );
      continue;
    }

    const messageMatch = line.match(
      /^([A-Za-z0-9_-]+)\s*(-{1,2}>{1,2}|-->>|->>|->)\s*([A-Za-z0-9_-]+)\s*:\s*(.+)$/i,
    );
    if (messageMatch) {
      const [, from, arrow, to, text] = messageMatch;
      ensureParticipant(from);
      ensureParticipant(to);

      edges.push({
        id: `seq_${from}_${to}_${edges.length + 1}`,
        family: "sequence",
        kind: arrow.includes("--") ? "return-message" : "message-flow",
        sourceNodeId: from,
        targetNodeId: to,
        routing: "straight",
        waypoints: [],
        labels: [{ text: text.trim(), position: "center" }],
        startMarker: "none",
        endMarker: "arrow",
        style: { tokens: {} },
        metadata: {},
      });
      continue;
    }

    diagnostics.push({
      source: "mermaid",
      severity: "warning",
      code: "unsupported-sequence-line",
      message: "Unsupported Mermaid sequence statement was skipped",
      raw: line,
    });
  }

  return {
    ast: {
      family: "sequence",
      kit: "sequence-core",
      title: "Imported Mermaid Sequence",
      nodes: Array.from(participants.values()),
      edges,
      containers: [],
    },
    diagnostics,
    degraded: diagnostics.some((diagnostic) => diagnostic.severity !== "info"),
  };
}

export function parseMermaidState(source: string): DiagramDslParseResult {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("%%"));

  const nodes = new Map<string, DiagramNode>();
  const edges: DiagramEdge[] = [];
  const containers = new Map<string, DiagramContainer>();
  const containerStack: string[] = [];
  const diagnostics: DslDiagnostic[] = [];

  const ensureState = (id: string) => {
    const normalizedId = id === "[*]" ? `state_${nodes.size + 1}` : id;
    if (nodes.has(normalizedId)) {
      return nodes.get(normalizedId)!;
    }

    const index = nodes.size;
    const isTerminal = id === "[*]";
    const node: DiagramNode = {
      id: normalizedId,
      family: "state",
      kind: isTerminal ? "terminal-state" : "state-node",
      shape: isTerminal ? "terminator-start" : "state",
      position: { x: 120 + (index % 3) * 240, y: 120 + Math.floor(index / 3) * 140 },
      size: isTerminal ? { width: 64, height: 64 } : { width: 180, height: 72 },
      ports: [],
      content: { title: isTerminal ? "Start / End" : id, labels: [] },
      style: { tokens: {} },
      resizePolicy: "content",
      metadata: {
        family: "state",
        semanticKind: isTerminal ? "terminal-state" : "state-node",
        shapeId: isTerminal ? "terminator-start" : "state",
        originalId: id,
      },
    };

    nodes.set(normalizedId, node);
    const parentContainerId = containerStack.at(-1);
    if (parentContainerId) {
      const container = containers.get(parentContainerId);
      if (container && !container.childNodeIds.includes(normalizedId)) {
        container.childNodeIds.push(normalizedId);
      }
    }
    return node;
  };

  for (const line of lines.slice(1)) {
    const explicitStateMatch = line.match(
      /^state\s+(?:"(.+)"\s+as\s+)?([A-Za-z0-9_-]+)$/i,
    );
    if (explicitStateMatch) {
      const [, rawLabel, rawId] = explicitStateMatch;
      const stateNode = ensureState(rawId);
      if (rawLabel) {
        stateNode.content.title = rawLabel;
      }
      continue;
    }

    const stateBlockMatch = line.match(/^state\s+([A-Za-z0-9_-]+)(?:\s+as\s+(.+))?\s*\{$/);
    if (stateBlockMatch) {
      const [, rawId, rawLabel] = stateBlockMatch;
      const label = rawLabel?.replace(/^"|"$/g, "") ?? rawId;
      const parentContainerId = containerStack.at(-1);
      const index = containers.size;
      containers.set(rawId, {
        id: rawId,
        family: "state",
        type: "group",
        label,
        position: {
          x: 72 + (index % 2) * 320,
          y: 72 + Math.floor(index / 2) * 220,
        },
        size: { width: 280, height: 180 },
        childNodeIds: [],
        childContainerIds: [],
        style: { tokens: {} },
        metadata: parentContainerId ? { parentContainerId } : {},
      });
      if (parentContainerId) {
        const parent = containers.get(parentContainerId);
        if (parent && !parent.childContainerIds.includes(rawId)) {
          parent.childContainerIds.push(rawId);
        }
      }
      containerStack.push(rawId);
      continue;
    }

    if (line === "}") {
      containerStack.pop();
      continue;
    }

    const transitionMatch = line.match(/^(.+?)\s*-->\s*(.+?)(?:\s*:\s*(.+))?$/);
    if (!transitionMatch) {
      diagnostics.push({
        source: "mermaid",
        severity: "warning",
        code: "unsupported-state-line",
        message: "Unsupported Mermaid state statement was skipped",
        raw: line,
      });
      continue;
    }

    const [, rawFrom, rawTo, rawLabel] = transitionMatch;
    const from = rawFrom.trim();
    const to = rawTo.trim();
    const sourceNode = ensureState(from);
    const targetNode = ensureState(to);

    edges.push({
      id: `state_${sourceNode.id}_${targetNode.id}_${edges.length + 1}`,
      family: "state",
      kind: "state-transition",
      sourceNodeId: sourceNode.id,
      targetNodeId: targetNode.id,
      routing: "orthogonal",
      waypoints: [],
      labels: rawLabel ? [{ text: rawLabel.trim(), position: "center" }] : [],
      startMarker: "none",
      endMarker: "arrow",
      style: { tokens: {} },
      metadata: {},
    });
  }

  return {
    ast: {
      family: "state",
      kit: "state-core",
      title: "Imported Mermaid State Diagram",
      nodes: Array.from(nodes.values()),
      edges,
      containers: Array.from(containers.values()),
    },
    diagnostics,
    degraded: diagnostics.some((diagnostic) => diagnostic.severity !== "info"),
  };
}

function tokenize(line: string): string[] {
  const matches = line.match(/"([^"\\]*(?:\\.[^"\\]*)*)"|[^\s]+/g) ?? [];
  return matches.map((token) => token.trim());
}

function stripQuoted(token: string | undefined): string | undefined {
  if (!token) return undefined;
  if (token.startsWith('"') && token.endsWith('"')) {
    return token.slice(1, -1).replace(/\\"/g, '"');
  }
  return token;
}

function escapeString(value: string): string {
  return value.replace(/"/g, '\\"');
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function extractNodeId(token: string): string {
  const match = token.match(/^([A-Za-z0-9_-]+)/);
  return match?.[1] ?? token.replace(/[^\w-]/g, "");
}

function parseMermaidNodeToken(token: string): {
  label: string;
  kind: string;
  shape: string;
  size: { width: number; height: number };
  family?: DiagramDocument["family"];
} {
  const id = extractNodeId(token);
  const body = token.slice(id.length);

  if (body.startsWith("{{") && body.endsWith("}}")) {
    return {
      label: body.slice(2, -2).replace(/^"|"$/g, ""),
      kind: "parallel-gateway",
      shape: "bpmn-parallel-gateway",
      size: { width: 180, height: 120 },
      family: "bpmn",
    };
  }

  if (body.startsWith("{") && body.endsWith("}")) {
    return {
      label: body.slice(1, -1).replace(/^"|"$/g, ""),
      kind: "decision-gateway",
      shape: "decision",
      size: { width: 180, height: 120 },
    };
  }

  if (body.startsWith("([") && body.endsWith("])")) {
    const rawLabel = body.slice(2, -2).replace(/^"|"$/g, "");
    const event = parseBpmnEventLabel(rawLabel);
    return {
      label: event.label,
      kind: event.kind ?? "start-event",
      shape: "terminator-start",
      size: { width: 180, height: 64 },
      family: event.family,
    };
  }

  if (body.startsWith("((") && body.endsWith("))")) {
    const rawLabel = body.slice(2, -2).replace(/^"|"$/g, "");
    const event = parseBpmnEventLabel(rawLabel);
    return {
      label: event.label,
      kind: event.kind ?? "intermediate-event",
      shape: event.shape ?? "bpmn-intermediate-event",
      size: { width: 180, height: 64 },
      family: "bpmn",
    };
  }

  if (body.startsWith("[/") && body.endsWith("/]")) {
    return {
      label: body.slice(2, -2).replace(/^"|"$/g, ""),
      kind: "service-task",
      shape: "bpmn-service-task",
      size: { width: 180, height: 64 },
      family: "bpmn",
    };
  }

  if (body.startsWith("[[") && body.endsWith("]]")) {
    return {
      label: body.slice(2, -2).replace(/^"|"$/g, ""),
      kind: "subprocess",
      shape: "subprocess",
      size: { width: 220, height: 80 },
      family: "bpmn",
    };
  }

  if (body.startsWith("[") && body.endsWith("]")) {
    return {
      label: body.slice(1, -1).replace(/^"|"$/g, ""),
      kind: "process-step",
      shape: "process",
      size: { width: 180, height: 64 },
    };
  }

  return {
    label: id,
    kind: "process-step",
    shape: "process",
    size: { width: 180, height: 64 },
  };
}

function parseBpmnEventLabel(label: string): {
  label: string;
  kind?: string;
  shape?: string;
  family?: DiagramDocument["family"];
} {
  const trimmed = label.trim();

  if (/^timer:/i.test(trimmed)) {
    return {
      label: trimmed.replace(/^timer:\s*/i, ""),
      kind: "timer-event",
      shape: "bpmn-timer-event",
      family: "bpmn",
    };
  }

  if (/^message:/i.test(trimmed)) {
    return {
      label: trimmed.replace(/^message:\s*/i, ""),
      kind: "message-event",
      shape: "bpmn-message-event",
      family: "bpmn",
    };
  }

  if (/^error:/i.test(trimmed)) {
    return {
      label: trimmed.replace(/^error:\s*/i, ""),
      kind: "error-event",
      shape: "bpmn-error-event",
      family: "bpmn",
    };
  }

  return { label: trimmed };
}

function formatMermaidNodeLabel(node: DiagramNode): string {
  const base = node.content.title.replace(/"/g, "'");
  if (node.kind.includes("timer")) {
    return `Timer: ${base}`;
  }
  if (node.kind.includes("message")) {
    return `Message: ${base}`;
  }
  if (node.kind.includes("error")) {
    return `Error: ${base}`;
  }
  return base;
}

function documentToMermaidSequence(document: DiagramDocument): string {
  const lines: string[] = ["sequenceDiagram"];

  for (const node of document.nodes) {
    lines.push(`    participant ${node.id} as ${escapeMermaidText(node.content.title)}`);
  }

  for (const edge of document.edges) {
    const label = edge.labels[0]?.text ?? edge.kind;
    const arrow = edge.kind.includes("return") ? "-->>" : "->>";
    lines.push(
      `    ${edge.sourceNodeId}${arrow}${edge.targetNodeId}: ${escapeMermaidText(label)}`,
    );
  }

  return lines.join("\n");
}

function documentToMermaidState(document: DiagramDocument): string {
  const lines: string[] = ["stateDiagram-v2"];
  const renderedNodes = new Set<string>();

  const renderStateNode = (nodeId: string, depth = 1) => {
    const node = document.nodes.find((entry) => entry.id === nodeId);
    if (!node || renderedNodes.has(node.id)) {
      return;
    }

    const indent = "    ".repeat(depth);
    if (node.kind !== "terminal-state") {
      lines.push(
        `${indent}${
          node.content.title !== node.id
            ? `state "${escapeMermaidText(node.content.title)}" as ${node.id}`
            : `state ${node.id}`
        }`,
      );
    }
    renderedNodes.add(node.id);
  };

  const renderContainer = (containerId: string, depth = 1) => {
    const container = document.containers.find((entry) => entry.id === containerId);
    if (!container) {
      return;
    }

    const indent = "    ".repeat(depth);
    lines.push(
      `${indent}${
        container.label !== container.id
          ? `state "${escapeMermaidText(container.label)}" as ${container.id} {`
          : `state ${container.id} {`
      }`,
    );
    for (const childContainerId of container.childContainerIds) {
      renderContainer(childContainerId, depth + 1);
    }
    for (const childNodeId of container.childNodeIds) {
      renderStateNode(childNodeId, depth + 1);
    }
    lines.push(`${indent}}`);
  };

  for (const container of document.containers.filter((entry) => !entry.metadata.parentContainerId)) {
    renderContainer(container.id);
  }

  for (const node of document.nodes) {
    renderStateNode(node.id);
  }

  for (const edge of document.edges) {
    const from = document.nodes.find((node) => node.id === edge.sourceNodeId);
    const to = document.nodes.find((node) => node.id === edge.targetNodeId);
    const fromId = from?.kind === "terminal-state" ? "[*]" : edge.sourceNodeId;
    const toId = to?.kind === "terminal-state" ? "[*]" : edge.targetNodeId;
    const label = edge.labels[0]?.text;

    lines.push(
      label
        ? `    ${fromId} --> ${toId}: ${escapeMermaidText(label)}`
        : `    ${fromId} --> ${toId}`,
    );
  }

  return lines.join("\n");
}

function escapeMermaidText(value: string): string {
  return value.replace(/"/g, "'").trim();
}

function requireAst(
  result: DiagramDslParseResult,
  fallbackMessage: string,
): DiagramDslAst {
  if (result.ast) {
    return result.ast;
  }

  throw formatDiagnosticsError(result.diagnostics, fallbackMessage);
}

function formatDiagnosticsError(
  diagnostics: DslDiagnostic[],
  fallbackMessage: string,
): Error {
  const first = diagnostics.find((diagnostic) => diagnostic.severity === "error");
  if (!first) {
    return new Error(fallbackMessage);
  }

  const prefix = first.line ? `line ${first.line}: ` : "";
  return new Error(`${prefix}${first.message}`);
}

function collectDslExportDiagnostics(document: DiagramDocument): DslDiagnostic[] {
  const diagnostics: DslDiagnostic[] = [];

  if (document.annotations.length > 0) {
    diagnostics.push({
      source: "export",
      severity: "warning",
      code: "dsl-annotations-omitted",
      message: "Annotations are not emitted in native DSL v1 and remain document-only metadata.",
    });
  }

  return diagnostics;
}

function collectMermaidExportDiagnostics(document: DiagramDocument): DslDiagnostic[] {
  const diagnostics: DslDiagnostic[] = [];

  if (!["flowchart", "bpmn", "sequence", "state"].includes(document.family)) {
    diagnostics.push({
      source: "export",
      severity: "warning",
      code: "mermaid-family-fallback",
      message: `Diagram family "${document.family}" is exported through the flowchart compatibility view.`,
    });
  }

  if (document.annotations.length > 0) {
    diagnostics.push({
      source: "export",
      severity: "warning",
      code: "mermaid-annotations-omitted",
      message: "Annotations are omitted because Mermaid does not map them directly in this export path.",
    });
  }

  for (const node of document.nodes) {
    if (node.ports.length > 0) {
      diagnostics.push({
        source: "export",
        severity: "info",
        code: "mermaid-ports-omitted",
        message: `Ports on node "${node.id}" are not emitted explicitly in Mermaid.`,
      });
      break;
    }
  }

  for (const edge of document.edges) {
    if (edge.labels.length > 1) {
      diagnostics.push({
        source: "export",
        severity: "warning",
        code: "mermaid-multi-label-edge",
        message: `Edge "${edge.id}" has multiple labels; only the first Mermaid-compatible label is exported.`,
      });
      break;
    }

    if (edge.routing === "manual" || edge.routing === "bezier") {
      diagnostics.push({
        source: "export",
        severity: "warning",
        code: "mermaid-routing-normalized",
        message: `Edge "${edge.id}" uses "${edge.routing}" routing; Mermaid export normalizes it to a supported connector.`,
      });
      break;
    }
  }

  for (const container of document.containers) {
    if (!["group", "pool", "lane"].includes(container.type)) {
      diagnostics.push({
        source: "export",
        severity: "warning",
        code: "mermaid-container-normalized",
        message: `Container "${container.id}" of type "${container.type}" is exported as a Mermaid subgraph.`,
      });
      break;
    }
  }

  for (const node of document.nodes) {
    if (node.style.fill || node.style.stroke || node.style.textColor) {
      diagnostics.push({
        source: "export",
        severity: "info",
        code: "mermaid-style-omitted",
        message: `Custom styling on node "${node.id}" is not preserved in Mermaid export.`,
      });
      break;
    }
  }

  return diagnostics;
}
