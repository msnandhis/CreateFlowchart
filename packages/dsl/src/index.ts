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
  return printFlowDsl(documentToAst(document));
}

export function flowDslToDocument(
  source: string,
  base?: Partial<DiagramDocument>,
): DiagramDocument {
  return astToDocument(parseFlowDsl(source), base);
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

  for (const line of lines) {
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
    }
  }

  const resolvedNodes = nodes.map((node) => ({
    ...node,
    automation: automationByNodeId.get(node.id) ?? node.automation,
  }));

  return {
    family,
    kit,
    title,
    description,
    nodes: resolvedNodes,
    edges,
    containers,
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
