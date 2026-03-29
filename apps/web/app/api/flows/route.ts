import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { flows } from "@createflowchart/db";
import { eq, desc } from "drizzle-orm";
import { documentToFlowGraph, isDiagramDocument } from "@/features/editor/lib/document-compat";

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

  return NextResponse.json(userFlows);
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

  const persistedData =
    data ??
    (isDiagramDocument(document)
      ? documentToFlowGraph(document)
      : { nodes: [], edges: [], meta: { version: 1, isSandbox: false } });

  const [newFlow] = await db
    .insert(flows)
    .values({
      userId: session.user.id,
      title,
      data: persistedData,
    })
    .returning();

  return NextResponse.json({
    ...newFlow,
    document: isDiagramDocument(document)
      ? document
      : null,
    formatVersion: "flowgraph-v1",
  });
}
