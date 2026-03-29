import type { FlowGraph } from "@createflowchart/core";
import { FlowGraphSchema } from "@createflowchart/core";
import type { AIProvider, GenerateOptions } from "./providers/base";
import { AIError } from "./providers/base";

export interface PipelineResult<T> {
  success: boolean;
  data?: T;
  error?: AIError;
  metadata: {
    provider: string;
    model: string;
    duration: number;
    confidence: number;
    nodeConfidences: Record<string, number>;
    edgeConfidences: Record<string, number>;
    repairAttempts: number;
  };
}

export interface GenerateResult extends PipelineResult<FlowGraph> {}
export interface TextResult extends PipelineResult<string> {}

const MAX_REPAIR_ATTEMPTS = 2;

export class AIPipeline {
  constructor(private providers: AIProvider[]) {
    if (providers.length === 0) {
      throw new Error("At least one AI provider must be configured");
    }
  }

  async generate(
    options: GenerateOptions,
    onProgress?: (stage: string) => void,
  ): Promise<GenerateResult> {
    const startTime = Date.now();
    let lastError: AIError | undefined;
    let repairAttempts = 0;

    for (const provider of this.providers) {
      try {
        if (options.attachments?.length && provider.supportsAttachments === false) {
          throw new AIError(provider.name, "Provider does not support attachments");
        }

        onProgress?.(`Calling ${provider.name}...`);

        const response = await provider.generate(options);
        onProgress?.(`Validating response from ${provider.name}...`);

        const parsed = this.parseAndValidate(response.content, repairAttempts);

        if (parsed) {
          const duration = Date.now() - startTime;
          const { nodeConfidences, edgeConfidences, overall } =
            this.calculateConfidence(parsed);

          return {
            success: true,
            data: parsed,
            metadata: {
              provider: provider.name,
              model: provider.model,
              duration,
              confidence: overall,
              nodeConfidences,
              edgeConfidences,
              repairAttempts,
            },
          };
        }

        throw new Error("Failed to parse valid FlowGraph from response");
      } catch (err) {
        if (err instanceof AIError) {
          lastError = err;
          console.warn(
            `[Pipeline] Provider ${provider.name} failed:`,
            err.message,
          );
        } else {
          lastError = new AIError(
            this.providers[0]?.name || "Unknown",
            `Generation failed: ${(err as Error).message}`,
            err,
          );
          console.warn(`[Pipeline] Generation failed:`, err);
        }

        if (repairAttempts < MAX_REPAIR_ATTEMPTS) {
          repairAttempts++;
          console.log(
            `[Pipeline] Attempting auto-repair (attempt ${repairAttempts})...`,
          );
          options.systemPrompt = this.getRepairPrompt(options.systemPrompt);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      metadata: {
        provider: this.providers[0]?.name || "None",
        model: this.providers[0]?.model || "None",
        duration: Date.now() - startTime,
        confidence: 0,
        nodeConfidences: {},
        edgeConfidences: {},
        repairAttempts,
      },
    };
  }

  async generateText(
    options: GenerateOptions,
    onProgress?: (stage: string) => void,
  ): Promise<TextResult> {
    const startTime = Date.now();
    let lastError: AIError | undefined;

    for (const provider of this.providers) {
      try {
        if (options.attachments?.length && provider.supportsAttachments === false) {
          throw new AIError(provider.name, "Provider does not support attachments");
        }

        onProgress?.(`Calling ${provider.name}...`);
        const response = await provider.generate(options);
        const duration = Date.now() - startTime;

        return {
          success: true,
          data: response.content,
          metadata: {
            provider: provider.name,
            model: provider.model,
            duration,
            confidence: 0.75,
            nodeConfidences: {},
            edgeConfidences: {},
            repairAttempts: 0,
          },
        };
      } catch (err) {
        if (err instanceof AIError) {
          lastError = err;
        } else {
          lastError = new AIError(
            this.providers[0]?.name || "Unknown",
            `Generation failed: ${(err as Error).message}`,
            err,
          );
        }
      }
    }

    return {
      success: false,
      error: lastError,
      metadata: {
        provider: this.providers[0]?.name || "None",
        model: this.providers[0]?.model || "None",
        duration: Date.now() - startTime,
        confidence: 0,
        nodeConfidences: {},
        edgeConfidences: {},
        repairAttempts: 0,
      },
    };
  }

  private parseAndValidate(
    content: string,
    repairAttempt: number,
  ): FlowGraph | null {
    let parsed: unknown;

    try {
      const cleaned = this.cleanJSON(content);
      parsed = JSON.parse(cleaned);
    } catch {
      console.warn("[Pipeline] JSON parse failed, attempting repair...");
      return this.attemptRepair(content, repairAttempt);
    }

    const result = FlowGraphSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    console.warn("[Pipeline] Zod validation failed:", result.error.message);
    return this.attemptRepair(content, repairAttempt);
  }

  private attemptRepair(content: string, attempt: number): FlowGraph | null {
    if (attempt >= MAX_REPAIR_ATTEMPTS) {
      console.warn("[Pipeline] Max repair attempts reached");
      return null;
    }

    const repaired = this.autoRepair(content);

    if (repaired) {
      const result = FlowGraphSchema.safeParse(repaired);
      if (result.success) {
        console.log("[Pipeline] Auto-repair succeeded");
        return result.data;
      }
    }

    return null;
  }

  private cleanJSON(content: string): string {
    let cleaned = content.trim();

    cleaned = cleaned.replace(/^```json\s*/i, "");
    cleaned = cleaned.replace(/^```\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/i, "");

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    return cleaned;
  }

  private autoRepair(content: string): object | null {
    try {
      const cleaned = this.cleanJSON(content);
      const parsed = JSON.parse(cleaned);

      if (typeof parsed !== "object" || parsed === null) {
        return null;
      }

      const obj = parsed as Record<string, unknown>;

      if (!Array.isArray(obj.nodes)) {
        obj.nodes = [];
      }

      if (!Array.isArray(obj.edges)) {
        obj.edges = [];
      }

      if (typeof obj.meta !== "object" || obj.meta === null) {
        obj.meta = { version: 1, isSandbox: false };
      }

      const validNodes = (obj.nodes as unknown[])
        .filter((n) => typeof n === "object" && n !== null)
        .map((n, i) => {
          const node = n as Record<string, unknown>;
          const pos = (
            typeof node.position === "object" && node.position !== null
              ? node.position
              : {}
          ) as Record<string, unknown>;

          return {
            id: String(node.id || `node_${i}_${Date.now()}`),
            type: ["start", "process", "decision", "action", "end"].includes(
              String(node.type),
            )
              ? node.type
              : "process",
            position: {
              x: typeof pos.x === "number" ? pos.x : i * 150,
              y: typeof pos.y === "number" ? pos.y : 0,
            },
            data: {
              label: String(
                (node.data as { label?: unknown })?.label ||
                  (node as { label?: unknown }).label ||
                  `Step ${i + 1}`,
              ),
              confidence:
                typeof (node.data as { confidence?: number })?.confidence ===
                "number"
                  ? (node.data as { confidence: number }).confidence
                  : 0.5,
              meta: {},
            },
          };
        });

      const existingIds = new Set(validNodes.map((n) => n.id));

      const validEdges = (obj.edges as unknown[])
        .filter((e) => typeof e === "object" && e !== null)
        .map((e, i) => {
          const edge = e as Record<string, unknown>;
          const source = String(edge.source || "");
          const target = String(edge.target || "");

          return {
            id: String(edge.id || `edge_${i}_${Date.now()}`),
            source: existingIds.has(source) ? source : validNodes[0]?.id || "",
            target: existingIds.has(target) ? target : validNodes[1]?.id || "",
            label: edge.label ? String(edge.label) : undefined,
            confidence:
              typeof edge.confidence === "number" ? edge.confidence : undefined,
          };
        })
        .filter((e) => e.source && e.target);

      return {
        nodes: validNodes,
        edges: validEdges,
        meta: obj.meta,
      };
    } catch {
      return null;
    }
  }

  private calculateConfidence(flow: FlowGraph): {
    nodeConfidences: Record<string, number>;
    edgeConfidences: Record<string, number>;
    overall: number;
  } {
    const nodeConfidences: Record<string, number> = {};
    const edgeConfidences: Record<string, number> = {};

    let nodeSum = 0;
    for (const node of flow.nodes) {
      const confidence = node.data.confidence ?? 0.5;
      nodeConfidences[node.id] = confidence;
      nodeSum += confidence;
    }

    let edgeSum = 0;
    for (const edge of flow.edges) {
      const confidence = edge.confidence ?? 0.5;
      edgeConfidences[edge.id] = confidence;
      edgeSum += confidence;
    }

    const nodeAvg = flow.nodes.length > 0 ? nodeSum / flow.nodes.length : 0;
    const edgeAvg = flow.edges.length > 0 ? edgeSum / flow.edges.length : 1;

    const overall =
      flow.nodes.length > 0 && flow.edges.length > 0
        ? nodeAvg * 0.6 + edgeAvg * 0.4
        : flow.nodes.length > 0
          ? nodeAvg
          : edgeAvg;

    return { nodeConfidences, edgeConfidences, overall };
  }

  private getRepairPrompt(originalPrompt?: string): string {
    return `${originalPrompt || ""}

IMPORTANT: If the previous response was not valid JSON, please ensure your next response is:
1. Valid JSON that can be parsed
2. Matches the FlowGraph schema exactly
3. Contains all required fields
4. Has no markdown formatting or code blocks`;
  }
}

export function createPipeline(providers: AIProvider[]): AIPipeline {
  return new AIPipeline(providers);
}
