import { db } from "@/shared/lib/db";
import { flows, flowVersions } from "@createflowchart/db/src/schema";
import { eq, desc } from "drizzle-orm";
import { ZodError } from "zod";
import type { FlowGraph } from "@createflowchart/core";
import { FlowGraphSchema } from "@createflowchart/core";

export interface FlowListItem {
  id: string;
  title: string;
  isPublic: boolean;
  likeCount: number;
  updatedAt: Date;
  createdAt: Date;
}

export interface FlowDetail extends FlowListItem {
  data: FlowGraph;
  userId: string;
}

export interface CreateFlowInput {
  title?: string;
  data?: FlowGraph;
  isPublic?: boolean;
}

export interface UpdateFlowInput {
  title?: string;
  data?: FlowGraph;
  isPublic?: boolean;
  changeSummary?: string;
}

class FlowServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "FlowServiceError";
  }
}

async function validateFlowGraph(data: unknown): Promise<FlowGraph> {
  const result = FlowGraphSchema.safeParse(data);
  if (!result.success) {
    throw new FlowServiceError(
      `Invalid FlowGraph: ${result.error.message}`,
      400,
      "INVALID_FLOW_GRAPH",
    );
  }
  return result.data;
}

export async function listFlows(userId: string): Promise<FlowListItem[]> {
  const results = await db
    .select({
      id: flows.id,
      title: flows.title,
      isPublic: flows.isPublic,
      likeCount: flows.likeCount,
      updatedAt: flows.updatedAt,
      createdAt: flows.createdAt,
    })
    .from(flows)
    .where(eq(flows.userId, userId))
    .orderBy(desc(flows.updatedAt));

  return results;
}

export async function getFlow(
  flowId: string,
  userId?: string,
): Promise<FlowDetail | null> {
  const conditions = [eq(flows.id, flowId)];
  if (userId) {
    conditions.push(eq(flows.userId, userId) as never);
  }

  const [result] = await db
    .select({
      id: flows.id,
      title: flows.title,
      data: flows.data,
      isPublic: flows.isPublic,
      likeCount: flows.likeCount,
      updatedAt: flows.updatedAt,
      createdAt: flows.createdAt,
      userId: flows.userId,
    })
    .from(flows)
    .where(eq(flows.id, flowId))
    .limit(1);

  if (!result) {
    return null;
  }

  const flowData =
    typeof result.data === "string" ? JSON.parse(result.data) : result.data;

  return {
    ...result,
    data: flowData,
  } as FlowDetail;
}

export async function createFlow(
  userId: string,
  input: CreateFlowInput,
): Promise<{ id: string }> {
  const data = input.data ?? {
    nodes: [],
    edges: [],
    meta: { version: 1, isSandbox: false },
  };

  const validatedData = await validateFlowGraph(data);

  const [result] = await db
    .insert(flows)
    .values({
      userId,
      title: input.title ?? "Untitled Flow",
      data: validatedData as never,
      isPublic: input.isPublic ?? false,
    })
    .returning({ id: flows.id });

  if (!result) {
    throw new FlowServiceError("Failed to create flow", 500, "CREATE_FAILED");
  }

  return { id: result.id };
}

export async function updateFlow(
  flowId: string,
  userId: string,
  input: UpdateFlowInput,
): Promise<FlowDetail> {
  const existing = await getFlow(flowId, userId);
  if (!existing) {
    throw new FlowServiceError("Flow not found", 404, "NOT_FOUND");
  }

  if (input.data) {
    await validateFlowGraph(input.data);
  }

  if (input.changeSummary) {
    const [versionResult] = await db
      .insert(flowVersions)
      .values({
        flowId,
        data: existing.data as never,
        changeSummary: input.changeSummary,
        versionNumber: 1,
      })
      .returning({ id: flowVersions.id });
  }

  const [result] = await db
    .update(flows)
    .set({
      title: input.title,
      data: input.data as never,
      isPublic: input.isPublic,
      updatedAt: new Date(),
    })
    .where(eq(flows.id, flowId))
    .returning();

  if (!result) {
    throw new FlowServiceError("Failed to update flow", 500, "UPDATE_FAILED");
  }

  return {
    ...result,
    data:
      typeof result.data === "string" ? JSON.parse(result.data) : result.data,
  } as FlowDetail;
}

export async function deleteFlow(
  flowId: string,
  userId: string,
): Promise<void> {
  const existing = await getFlow(flowId, userId);
  if (!existing) {
    throw new FlowServiceError("Flow not found", 404, "NOT_FOUND");
  }

  await db.delete(flows).where(eq(flows.id, flowId));
}

export async function getFlowVersionHistory(
  flowId: string,
): Promise<
  Array<{
    id: string;
    versionNumber: number;
    changeSummary: string | null;
    createdAt: Date;
  }>
> {
  const results = await db
    .select({
      id: flowVersions.id,
      versionNumber: flowVersions.versionNumber,
      changeSummary: flowVersions.changeSummary,
      createdAt: flowVersions.createdAt,
    })
    .from(flowVersions)
    .where(eq(flowVersions.flowId, flowId))
    .orderBy(desc(flowVersions.versionNumber));

  return results;
}

export { FlowServiceError };
