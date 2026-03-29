import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import { templateService } from "@/features/templates/services/template-service";

/**
 * GET /api/templates/user — Get current user's templates
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const templates = await templateService.getByUser(session.user.id, limit);

  return NextResponse.json(templates);
}
