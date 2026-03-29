import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { templateService } from "@/features/templates/services/template-service";

/**
 * GET /api/templates/featured — Get featured templates
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const templates = await templateService.getFeatured(limit);

  return NextResponse.json(templates);
}
