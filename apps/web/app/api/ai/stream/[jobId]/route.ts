import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import { subscribeToJob } from "@/shared/lib/job-events";
import { aiGenerationQueue } from "@/shared/lib/queue";
import { headers } from "next/headers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  const job = await aiGenerationQueue.getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const userId = job.data.userId;
  if (userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: unknown) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      subscribeToJob(jobId, (event) => {
        sendEvent(event);
        if (event.status === "completed" || event.status === "failed") {
          if (keepAliveInterval) clearInterval(keepAliveInterval);
          if (unsubscribe) unsubscribe();
          controller.close();
        }
      }).then((unsub) => {
        unsubscribe = unsub;
      });

      keepAliveInterval = setInterval(() => {
        const keepAlive = `: keepalive ${Date.now()}\n\n`;
        try {
          controller.enqueue(encoder.encode(keepAlive));
        } catch {
          if (keepAliveInterval) clearInterval(keepAliveInterval);
        }
      }, 30000);

      sendEvent({
        jobId,
        status: "processing",
        progress: 0,
        timestamp: new Date().toISOString(),
      });
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
