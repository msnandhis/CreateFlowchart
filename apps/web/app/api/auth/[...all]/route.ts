import { NextResponse } from "next/server";
import { DEV_SESSION } from "@/shared/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(DEV_SESSION);
}

export async function POST() {
  return NextResponse.json(DEV_SESSION);
}
