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
    const { prompt, imageUrl, imageMimeType } = body;

    if ((!prompt || typeof prompt !== "string") && !imageUrl) {
      return NextResponse.json(
        { error: "Prompt or image is required" },
        { status: 400 },
      );
    }

    const jobData: AIGenerationJobData = {
      userId: session.user.id,
      prompt: typeof prompt === "string" ? prompt : "",
      action: "generate",
      imageUrl: typeof imageUrl === "string" ? imageUrl : undefined,
      imageMimeType: typeof imageMimeType === "string" ? imageMimeType : undefined,
    };

    const job = await aiGenerationQueue.add("generate", jobData, {
      jobId: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    });

    return NextResponse.json({
      jobId: job.id,
      status: "pending",
    });
  } catch (error: any) {
    console.error("[AI Generation Error]:", error);
    return NextResponse.json(
      { error: "Failed to queue generation job", message: error.message },
      { status: 500 },
    );
  }
}
