import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import { aiPipeline } from "@/shared/lib/ai-gateway";
import { redis } from "@/shared/lib/redis";
import { headers } from "next/headers";

const RATE_LIMIT_PREFIX = "rl:ai:gen:";
const HOURLY_LIMIT = 10;

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rlKey = `${RATE_LIMIT_PREFIX}${userId}`;

    const currentCount = await redis.get(rlKey);
    if (currentCount && parseInt(currentCount) >= HOURLY_LIMIT) {
      const ttl = await redis.ttl(rlKey);
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Too many AI requests. Try again in ${Math.ceil(ttl / 60)} minutes.`,
          limit: HOURLY_LIMIT,
          remaining: 0,
        },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { prompt, context } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    const result = await aiPipeline.generate({ prompt, context });

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: "Generation failed", message: result.error?.message },
        { status: 500 },
      );
    }

    if (!currentCount) {
      await redis.set(rlKey, 1, "EX", 3600);
    } else {
      await redis.incr(rlKey);
    }

    console.log(
      `[AI] Generated flow via ${result.metadata.provider} for user ${userId} in ${result.metadata.duration}ms`,
    );

    return NextResponse.json({
      flow: result.data,
      provider: result.metadata.provider,
      metadata: {
        duration: result.metadata.duration,
        confidence: result.metadata.confidence,
        remaining: HOURLY_LIMIT - (parseInt(currentCount || "0") + 1),
      },
    });
  } catch (error: any) {
    console.error("[AI Generation Error]:", error);
    return NextResponse.json(
      { error: "Generation failed", message: error.message },
      { status: 500 },
    );
  }
}
