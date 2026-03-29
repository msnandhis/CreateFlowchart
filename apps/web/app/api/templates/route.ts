import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import { templateService } from "@/features/templates/services/template-service";

/**
 * GET /api/templates — List/search templates
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || undefined;
  const category = searchParams.get("category") || undefined;
  const tags =
    searchParams.get("tags")?.split(",").filter(Boolean) || undefined;
  const sortBy = searchParams.get("sortBy") as
    | "recent"
    | "popular"
    | "likes"
    | undefined;
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const session = await auth.api.getSession({ headers: req.headers });

  const result = await templateService.search(
    { query, category, tags, limit, offset, sortBy },
    session?.user.id,
  );

  return NextResponse.json(result);
}

/**
 * POST /api/templates — Create new template
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, data, document, category, tags, isPublic } =
    await req.json();

  if (!title || (!data && !document)) {
    return NextResponse.json(
      { error: "Title and diagram payload are required" },
      { status: 400 },
    );
  }

  const template = await templateService.create({
    userId: session.user.id,
    title,
    description,
    data,
    document,
    category,
    tags,
    isPublic,
  });

  return NextResponse.json(template, { status: 201 });
}
