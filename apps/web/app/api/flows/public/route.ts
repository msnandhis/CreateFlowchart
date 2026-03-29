import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { auth } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { flows, users, flowLikes } from "@createflowchart/db/src/schema";
import { eq, desc, sql } from "drizzle-orm";

interface FlowWithAuthor {
  id: string;
  title: string;
  data: unknown;
  isPublic: boolean;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  userLiked?: boolean;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sortBy = searchParams.get("sortBy") as "recent" | "likes" | null;
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const session = await auth.api.getSession({ headers: req.headers });

  const orderBy =
    sortBy === "likes" ? desc(flows.likeCount) : desc(flows.updatedAt);

  const results = await db
    .select({
      id: flows.id,
      title: flows.title,
      data: flows.data,
      isPublic: flows.isPublic,
      likeCount: flows.likeCount,
      createdAt: flows.createdAt,
      updatedAt: flows.updatedAt,
      authorId: users.id,
      authorName: users.name,
      authorImage: users.image,
    })
    .from(flows)
    .innerJoin(users, eq(flows.userId, users.id))
    .where(eq(flows.isPublic, true))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  let userLikedFlowIds: Set<string> = new Set();
  if (session) {
    const userLikes = await db
      .select({ flowId: flowLikes.flowId })
      .from(flowLikes)
      .where(eq(flowLikes.userId, session.user.id));

    userLikedFlowIds = new Set(userLikes.map((l) => l.flowId));
  }

  const flowsWithAuthor: FlowWithAuthor[] = results.map((f) => ({
    id: f.id,
    title: f.title,
    data: f.data,
    isPublic: f.isPublic,
    likeCount: f.likeCount,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    author: {
      id: f.authorId,
      name: f.authorName,
      image: f.authorImage,
    },
    userLiked: userLikedFlowIds.has(f.id),
  }));

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(flows)
    .where(eq(flows.isPublic, true));

  return NextResponse.json({
    flows: flowsWithAuthor,
    total: countResult[0]?.count || 0,
  });
}
