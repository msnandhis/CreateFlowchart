import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { flowLikes, flows } from "@createflowchart/db/src/schema";
import { eq, and, sql } from "drizzle-orm";
import { headers } from "next/headers";

/**
 * POST /api/flows/[id]/like — Like a flow
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [flow] = await db.select().from(flows).where(eq(flows.id, id)).limit(1);

  if (!flow) {
    return NextResponse.json({ error: "Flow not found" }, { status: 404 });
  }

  try {
    await db.insert(flowLikes).values({
      flowId: id,
      userId: session.user.id,
    });

    await db
      .update(flows)
      .set({ likeCount: sql`${flows.likeCount} + 1` })
      .where(eq(flows.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already liked" }, { status: 409 });
    }
    throw error;
  }
}

/**
 * DELETE /api/flows/[id]/like — Unlike a flow
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [deleted] = await db
    .delete(flowLikes)
    .where(and(eq(flowLikes.flowId, id), eq(flowLikes.userId, session.user.id)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not liked" }, { status: 404 });
  }

  await db
    .update(flows)
    .set({ likeCount: sql`GREATEST(${flows.likeCount} - 1, 0)` })
    .where(eq(flows.id, id));

  return NextResponse.json({ success: true });
}

/**
 * GET /api/flows/[id]/like — Check if user liked this flow
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ liked: false });
  }

  const [like] = await db
    .select()
    .from(flowLikes)
    .where(and(eq(flowLikes.flowId, id), eq(flowLikes.userId, session.user.id)))
    .limit(1);

  return NextResponse.json({ liked: !!like });
}
