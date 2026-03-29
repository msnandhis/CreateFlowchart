import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import { templateService } from "@/features/templates/services/template-service";
import { headers } from "next/headers";

/**
 * POST /api/templates/[id]/like — Like a template
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

  try {
    await templateService.like(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already liked" }, { status: 409 });
    }
    throw error;
  }
}

/**
 * DELETE /api/templates/[id]/like — Unlike a template
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

  await templateService.unlike(id, session.user.id);

  return NextResponse.json({ success: true });
}
