import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import {
  aiGenerationQueue,
  type AIGenerationJobData,
} from "@/shared/lib/queue";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { flowGraph, instruction } = body;

    if (!flowGraph) {
      return NextResponse.json(
        { error: "FlowGraph is required" },
        { status: 400 },
      );
    }

    if (!instruction || typeof instruction !== "string") {
      return NextResponse.json(
        { error: "Improvement instruction is required" },
        { status: 400 },
      );
    }

    const jobData: AIGenerationJobData = {
      userId: session.user.id,
      prompt: instruction,
      action: "improve",
      existingFlowGraph: JSON.stringify(flowGraph),
    };

    const job = await aiGenerationQueue.add("improve", jobData, {
      jobId: `improve_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    });

    return NextResponse.json({
      jobId: job.id,
      status: "pending",
    });
  } catch (error: any) {
    console.error("[AI Improve Error]:", error);
    return NextResponse.json(
      { error: "Failed to queue improve job", message: error.message },
      { status: 500 },
    );
  }
}
