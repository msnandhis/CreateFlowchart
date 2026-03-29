import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import {
  aiGenerationQueue,
  type AIGenerationJobData,
} from "@/shared/lib/queue";
import { headers } from "next/headers";
import { documentToFlowGraph, toDiagramDocument } from "@/features/editor/lib/document-compat";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { flowGraph, document, instruction } = body;

    if (!flowGraph && !document) {
      return NextResponse.json(
        { error: "Document is required" },
        { status: 400 },
      );
    }

    if (!instruction || typeof instruction !== "string") {
      return NextResponse.json(
        { error: "Improvement instruction is required" },
        { status: 400 },
      );
    }

    const canonicalDocument = document
      ? toDiagramDocument({ data: document, title: "AI Improve" })
      : toDiagramDocument({ data: flowGraph, title: "AI Improve" });
    const legacyFlowGraph = documentToFlowGraph(canonicalDocument);

    const jobData: AIGenerationJobData = {
      userId: session.user.id,
      prompt: instruction,
      action: "improve",
      existingDocument: JSON.stringify(canonicalDocument),
      existingFlowGraph: JSON.stringify(legacyFlowGraph),
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
