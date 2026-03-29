import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { flows, users } from "@createflowchart/db";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { normalizePersistedFlow } from "@/features/editor/lib/persisted-flow";

/**
 * Get Flow by ID
 * GET /api/flows/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const flow = await db.query.flows.findFirst({
      where: eq(flows.id, id),
    });

    if (!flow) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    if (!flow.isPublic && (!session || session.user.id !== flow.userId)) {
      return NextResponse.json({ error: "Flow is private" }, { status: 403 });
    }

    const author = await db.query.users.findFirst({
      where: eq(users.id, flow.userId),
    });
    const normalized = normalizePersistedFlow({
      data: typeof flow.data === "string" ? JSON.parse(flow.data) : flow.data,
      id: flow.id,
      title: flow.title,
      authorId: flow.userId,
    });

    return NextResponse.json({
      id: flow.id,
      title: flow.title,
      data: normalized.legacy,
      document: normalized.document,
      formatVersion: normalized.formatVersion,
      isPublic: flow.isPublic,
      isFeatured: flow.isFeatured,
      likeCount: flow.likeCount,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
      author: author
        ? {
            id: author.id,
            name: author.name,
            image: author.image,
          }
        : null,
    });
  } catch (error: any) {
    console.error("[Flow Get Error]:", error);
    return NextResponse.json(
      { error: "Failed to get flow", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Update Flow Data (Auto-save)
 * PATCH /api/flows/[id]
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, data, document, isPublic } = body;
    const normalized =
      data !== undefined || document !== undefined
        ? normalizePersistedFlow({
            data:
              data ??
              { nodes: [], edges: [], meta: { version: 1, isSandbox: false } },
            document,
            id,
            title,
            authorId: session.user.id,
          })
        : null;

    // Build update object dynamically
    const updateData: any = {
      updatedAt: new Date(),
    };
    if (title !== undefined) updateData.title = title;
    if (normalized) updateData.data = normalized;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const result = await db
      .update(flows)
      .set(updateData)
      .where(and(eq(flows.id, id), eq(flows.userId, session.user.id)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Flow not found or unauthorized" }, { status: 404 });
    }

    const persisted = normalizePersistedFlow({
      data:
        typeof result[0].data === "string"
          ? JSON.parse(result[0].data)
          : result[0].data,
      id: result[0].id,
      title: result[0].title,
      authorId: result[0].userId,
    });

    return NextResponse.json({
      success: true,
      flow: {
        ...result[0],
        data: persisted.legacy,
        document: persisted.document,
        formatVersion: persisted.formatVersion,
      },
      document: persisted.document,
      data: persisted.legacy,
      formatVersion: persisted.formatVersion,
    });
  } catch (error: any) {
    console.error("[Flow Update Error]:", error);
    return NextResponse.json({ error: "Failed to update flow", message: error.message }, { status: 500 });
  }
}

/**
 * Delete Flow
 * DELETE /api/flows/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db
      .delete(flows)
      .where(and(eq(flows.id, id), eq(flows.userId, session.user.id)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Flow not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Flow deleted successfully" });
  } catch (error: any) {
    console.error("[Flow Delete Error]:", error);
    return NextResponse.json({ error: "Failed to delete flow", message: error.message }, { status: 500 });
  }
}
