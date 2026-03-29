import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { templateService } from "@/features/templates/services/template-service";

/**
 * GET /api/templates/categories — Get all categories
 */
export async function GET() {
  const categories = await templateService.getCategories();

  return NextResponse.json(categories);
}
