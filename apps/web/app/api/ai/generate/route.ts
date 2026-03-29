import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import { aiGateway } from "@/shared/lib/ai-gateway";
import { redis } from "@/shared/lib/redis";
import { headers } from "next/headers";
import { FlowGraphSchema } from "@createflowchart/core";

const RATE_LIMIT_PREFIX = "rl:ai:gen:";
const HOURLY_LIMIT = 10; // PRD: 10 per hour

/**
 * AI Generation Endpoint
 * POST /api/ai/generate
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rlKey = `${RATE_LIMIT_PREFIX}${userId}`;

    // 2. Rate limiting (Sliding window or simple INCR + EXPIRE)
    const currentCount = await redis.get(rlKey);
    if (currentCount && parseInt(currentCount) >= HOURLY_LIMIT) {
      const ttl = await redis.ttl(rlKey);
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          message: `Too many AI requests. Try again in ${Math.ceil(ttl / 60)} minutes.`,
          limit: HOURLY_LIMIT,
          remaining: 0
        }, 
        { status: 429 }
      );
    }

    // 3. Parse input
    const body = await req.json();
    const { prompt, context } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 4. Trigger AI Gateway
    const startTime = Date.now();
    const { flow, provider } = await aiGateway.generateFlow(prompt, context);
    const duration = Date.now() - startTime;

    // 5. Increment rate limit
    if (!currentCount) {
      await redis.set(rlKey, 1, "EX", 3600); // 1 hour window
    } else {
      await redis.incr(rlKey);
    }

    console.log(`[AI] Generated flow via ${provider} for user ${userId} in ${duration}ms`);

    // 6. Return response
    return NextResponse.json({
      flow,
      provider,
      metadata: {
        duration,
        remaining: HOURLY_LIMIT - (parseInt(currentCount || "0") + 1)
      }
    });

  } catch (error: any) {
    console.error("[AI Generation Error]:", error);
    
    // Handle specifically known error types if needed
    return NextResponse.json(
      { error: "Generation failed", message: error.message }, 
      { status: 500 }
    );
  }
}
