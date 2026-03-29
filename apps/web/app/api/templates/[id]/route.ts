import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import { templateService } from "@/features/templates/services/template-service";
import { headers } from "next/headers";

/**
 * GET /api/templates/[id] — Get single template
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const template = await templateService.getById(id, session?.user.id);

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (!template.isPublic && template.author.id !== session?.user.id) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await templateService.incrementUsage(id);

  return NextResponse.json(template);
}

/**
 * PUT /api/templates/[id] — Update template
 */
export async function PUT(
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

  const { title, description, category, tags, isPublic } = await req.json();

  const template = await templateService.update(id, session.user.id, {
    title,
    description,
    category,
    tags,
    isPublic,
  });

  if (!template) {
    return NextResponse.json(
      { error: "Template not found or unauthorized" },
      { status: 404 },
    );
  }

  return NextResponse.json(template);
}

/**
 * DELETE /api/templates/[id] — Delete template
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

  const deleted = await templateService.delete(id, session.user.id);

  if (!deleted) {
    return NextResponse.json(
      { error: "Template not found or unauthorized" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
