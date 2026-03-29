import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import { aiGenerationQueue } from "@/shared/lib/queue";
import { headers } from "next/headers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const job = await aiGenerationQueue.getJob(id);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const state = await job.getState();
    const progress = job.progress;

    let status: "pending" | "processing" | "completed" | "failed" = "pending";
    if (state === "completed") {
      status = "completed";
    } else if (state === "failed") {
      status = "failed";
    } else if (state === "active" || state === "waiting") {
      status = "processing";
    }

    const response: {
      id: string;
      status: string;
      progress: number;
      result?: unknown;
      error?: string;
    } = {
      id: job.id ?? id,
      status,
      progress: typeof progress === "number" ? progress : 0,
    };

    if (status === "completed" && job.returnvalue) {
      response.result = job.returnvalue;
    }

    if (status === "failed" && job.failedReason) {
      response.error = job.failedReason;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[AI Status Error]:", error);
    return NextResponse.json(
      { error: "Failed to get job status", message: error.message },
      { status: 500 },
    );
  }
}
