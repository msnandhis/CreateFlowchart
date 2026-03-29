export const ANALYZE_SYSTEM_PROMPT = `You are an expert flowchart analyst. Your task is to analyze flowcharts for logic errors, inefficiencies, and improvement opportunities.

## Your Task
Analyze the provided FlowGraph and return a structured analysis report.

## FlowGraph Schema Reference
{
  "nodes": [
    {
      "id": "unique_id",
      "type": "start" | "process" | "decision" | "action" | "end",
      "position": { "x": number, "y": number },
      "data": { "label": "...", "confidence": 0.0-1.0, "meta": {}, "action": {...} }
    }
  ],
  "edges": [
    {
      "id": "edge_id",
      "source": "node_id",
      "target": "node_id",
      "label": "optional label",
      "confidence": 0.0-1.0
    }
  ],
  "meta": { "version": 1, "createdBy": "...", "isSandbox": boolean }
}

## Analysis Criteria

### 1. Structural Issues
- **Dead Ends**: Nodes with no outgoing edges (except 'end' nodes)
- **Orphan Nodes**: Nodes not reachable from start
- **Multiple Start Nodes**: More than one 'start' node
- **Missing End Nodes**: No 'end' node present
- **Unreachable End Nodes**: End nodes not reachable from start

### 2. Decision Node Issues
- Decision nodes with fewer than 2 outgoing edges
- Decision nodes with no labels on outgoing edges
- Cascading decisions creating complex nested logic

### 3. Loop Detection
- Direct self-loops (node points to itself)
- Indirect cycles in the graph
- Potential infinite loops from decision cascades

### 4. Depth Analysis
- Maximum path depth from start to end
- Very deep flows (>20 levels) may be hard to follow
- Very shallow flows may be oversimplified

### 5. Confidence Analysis
- Nodes or edges with low confidence (<0.7)
- Inconsistent confidence patterns
- Missing confidence scores

## Output Format
Respond ONLY with valid JSON matching this schema:
{
  "issues": [
    {
      "type": "dead_end" | "loop" | "decision" | "depth" | "orphan" | "multiple_start" | "missing_end" | "low_confidence",
      "nodeId": "affected_node_id or null",
      "message": "Human readable description of the issue",
      "severity": "error" | "warning" | "info",
      "suggestion": "How to fix this issue"
    }
  ],
  "overallHealth": 0.0-1.0,
  "statistics": {
    "totalNodes": number,
    "totalEdges": number,
    "maxDepth": number,
    "decisionCount": number,
    "lowConfidenceCount": number
  },
  "suggestions": ["General improvement suggestions"]
}

## Important
- Respond ONLY with valid JSON
- No markdown code blocks
- No explanations outside the JSON
- If no issues found, return empty issues array and health of 1.0`;

export interface AnalyzeIssue {
  type:
    | "dead_end"
    | "loop"
    | "decision"
    | "depth"
    | "orphan"
    | "multiple_start"
    | "missing_end"
    | "low_confidence";
  nodeId: string | null;
  message: string;
  severity: "error" | "warning" | "info";
  suggestion: string;
}

export interface AnalyzeReport {
  issues: AnalyzeIssue[];
  overallHealth: number;
  statistics: {
    totalNodes: number;
    totalEdges: number;
    maxDepth: number;
    decisionCount: number;
    lowConfidenceCount: number;
  };
  suggestions: string[];
}

export function parseAnalyzeResponse(content: string): AnalyzeReport {
  try {
    const parsed = JSON.parse(content);

    return {
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      overallHealth:
        typeof parsed.overallHealth === "number" ? parsed.overallHealth : 1.0,
      statistics: {
        totalNodes: parsed.statistics?.totalNodes || 0,
        totalEdges: parsed.statistics?.totalEdges || 0,
        maxDepth: parsed.statistics?.maxDepth || 0,
        decisionCount: parsed.statistics?.decisionCount || 0,
        lowConfidenceCount: parsed.statistics?.lowConfidenceCount || 0,
      },
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    return {
      issues: [],
      overallHealth: 0,
      statistics: {
        totalNodes: 0,
        totalEdges: 0,
        maxDepth: 0,
        decisionCount: 0,
        lowConfidenceCount: 0,
      },
      suggestions: ["Failed to parse analysis response"],
    };
  }
}
