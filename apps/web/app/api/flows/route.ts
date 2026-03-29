import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { flows } from "@createflowchart/db";
import { eq, desc } from "drizzle-orm";
import { normalizePersistedFlow } from "@/features/editor/lib/persisted-flow";

/**
 * GET /api/flows — List user flows
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const userFlows = await db.query.flows.findMany({
    where: eq(flows.userId, session.user.id),
    orderBy: [desc(flows.updatedAt)],
  });

  return NextResponse.json(
    userFlows.map((flow) => {
      const normalized = normalizePersistedFlow({
        data: typeof flow.data === "string" ? JSON.parse(flow.data) : flow.data,
        id: flow.id,
        title: flow.title,
        authorId: flow.userId,
      });

      return {
        ...flow,
        data: normalized.legacy,
        document: normalized.document,
        formatVersion: normalized.formatVersion,
        family: normalized.document.family,
        nodeCount: normalized.document.nodes.length,
        edgeCount: normalized.document.edges.length,
        containerCount: normalized.document.containers.length,
      };
    }),
  );
}

/**
 * POST /api/flows — Create new flow
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const {
    title = "Untitled Flow",
    data,
    document,
  } = body;

  const normalized = normalizePersistedFlow({
    data:
      data ?? { nodes: [], edges: [], meta: { version: 1, isSandbox: false } },
    document,
    title,
    authorId: session.user.id,
  });

  const [newFlow] = await db
    .insert(flows)
    .values({
      userId: session.user.id,
      title,
      data: normalized,
    })
    .returning();

  return NextResponse.json({
    ...newFlow,
    data: normalized.legacy,
    document: normalized.document,
    formatVersion: normalized.formatVersion,
    family: normalized.document.family,
    nodeCount: normalized.document.nodes.length,
    edgeCount: normalized.document.edges.length,
    containerCount: normalized.document.containers.length,
  });
}
