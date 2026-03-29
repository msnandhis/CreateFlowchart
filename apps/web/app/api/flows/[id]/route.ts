import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { flows } from "@createflowchart/db";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

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
    const { title, data, isPublic } = body;

    // Build update object dynamically
    const updateData: any = {
      updatedAt: new Date(),
    };
    if (title !== undefined) updateData.title = title;
    if (data !== undefined) updateData.data = data;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const result = await db
      .update(flows)
      .set(updateData)
      .where(and(eq(flows.id, id), eq(flows.userId, session.user.id)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Flow not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, flow: result[0] });
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
