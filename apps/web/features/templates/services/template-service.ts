import { db } from "@/shared/lib/db";
import {
  templates,
  templateLikes,
  users,
} from "@createflowchart/db/src/schema";
import { eq, desc, and, sql, like, or } from "drizzle-orm";
import type { Template } from "@createflowchart/db/src/schema";
import type { FlowGraph } from "@createflowchart/core";
import type { DiagramDocument } from "@createflowchart/schema";
import {
  createPersistedFlowEnvelope,
  normalizePersistedFlow,
} from "@/features/editor/lib/persisted-flow";

export interface CreateTemplateInput {
  userId: string;
  title: string;
  description?: string;
  data?: FlowGraph;
  document?: DiagramDocument;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface TemplateWithAuthor {
  id: string;
  title: string;
  description: string | null;
  data: FlowGraph;
  document: DiagramDocument;
  formatVersion: "flowgraph-v1" | "document-v2" | "flowgraph-v1+document-v2";
  category: string;
  tags: string[];
  usageCount: number;
  likeCount: number;
  isFeatured: boolean;
  isPublic: boolean;
  family: DiagramDocument["family"];
  edgeCount: number;
  containerCount: number;
  nodeCount: number;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string;
    image: string | null;
  };
  userLiked?: boolean;
}

export interface SearchTemplatesInput {
  query?: string;
  category?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: "recent" | "popular" | "likes";
}

interface TemplateRecord {
  id: string;
  title: string;
  description: string | null;
  data: unknown;
  category: string | null;
  tags: string[] | null;
  usageCount: number;
  likeCount: number;
  isFeatured: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  authorId?: string;
  authorName?: string | null;
  authorImage?: string | null;
}

class TemplateService {
  async create(input: CreateTemplateInput): Promise<Template> {
    const normalized = createPersistedFlowEnvelope({
      data: input.data,
      document: input.document,
      title: input.title,
      authorId: input.userId,
    });

    const [template] = await db
      .insert(templates)
      .values({
        userId: input.userId,
        title: input.title,
        description: input.description,
        data: normalized as any,
        category: input.category || "general",
        tags: input.tags || [],
        isPublic: input.isPublic ?? true,
      })
      .returning();

    return template;
  }

  async getById(
    id: string,
    userId?: string,
  ): Promise<TemplateWithAuthor | null> {
    const [template] = await db
      .select({
        id: templates.id,
        title: templates.title,
        description: templates.description,
        data: templates.data,
        category: templates.category,
        tags: templates.tags,
        usageCount: templates.usageCount,
        likeCount: templates.likeCount,
        isFeatured: templates.isFeatured,
        isPublic: templates.isPublic,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
        authorId: users.id,
        authorName: users.name,
        authorImage: users.image,
      })
      .from(templates)
      .innerJoin(users, eq(templates.userId, users.id))
      .where(eq(templates.id, id))
      .limit(1);

    if (!template) return null;

    let userLiked = false;
    if (userId) {
      const [likeRecord] = await db
        .select()
        .from(templateLikes)
        .where(
          and(
            eq(templateLikes.templateId, id),
            eq(templateLikes.userId, userId),
          ),
        )
        .limit(1);
      userLiked = !!likeRecord;
    }

    return {
      ...this.normalizeTemplateRecord(template),
      author: {
        id: template.authorId,
        name: template.authorName ?? "Unknown",
        image: template.authorImage ?? null,
      },
      userLiked,
    };
  }

  async search(
    input: SearchTemplatesInput,
    userId?: string,
  ): Promise<{
    templates: TemplateWithAuthor[];
    total: number;
  }> {
    const limit = input.limit || 20;
    const offset = input.offset || 0;

    const conditions = [eq(templates.isPublic, true)];

    if (input.category) {
      conditions.push(eq(templates.category, input.category));
    }

    if (input.tags && input.tags.length > 0) {
      const tagConditions = input.tags.map(
        (tag) => sql`${templates.tags} @> ARRAY[${tag}]`,
      );
      conditions.push(or(...tagConditions) as any);
    }

    if (input.query) {
      conditions.push(
        or(
          like(templates.title, `%${input.query}%`),
          like(templates.description, `%${input.query}%`),
        ) as any,
      );
    }

    const orderBy =
      input.sortBy === "likes"
        ? desc(templates.likeCount)
        : input.sortBy === "popular"
          ? desc(templates.usageCount)
          : desc(templates.createdAt);

    const results = await db
      .select({
        id: templates.id,
        title: templates.title,
        description: templates.description,
        data: templates.data,
        category: templates.category,
        tags: templates.tags,
        usageCount: templates.usageCount,
        likeCount: templates.likeCount,
        isFeatured: templates.isFeatured,
        isPublic: templates.isPublic,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
        authorId: users.id,
        authorName: users.name,
        authorImage: users.image,
      })
      .from(templates)
      .innerJoin(users, eq(templates.userId, users.id))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(templates)
      .where(and(...conditions));

    const templatesList: TemplateWithAuthor[] = results.map((t) => ({
      ...this.normalizeTemplateRecord(t),
      author: {
        id: t.authorId,
        name: t.authorName ?? "Unknown",
        image: t.authorImage ?? null,
      },
    }));

    return {
      templates: templatesList,
      total: countResult[0]?.count || 0,
    };
  }

  async getFeatured(limit: number = 10): Promise<TemplateWithAuthor[]> {
    const results = await db
      .select({
        id: templates.id,
        title: templates.title,
        description: templates.description,
        data: templates.data,
        category: templates.category,
        tags: templates.tags,
        usageCount: templates.usageCount,
        likeCount: templates.likeCount,
        isFeatured: templates.isFeatured,
        isPublic: templates.isPublic,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
        authorId: users.id,
        authorName: users.name,
        authorImage: users.image,
      })
      .from(templates)
      .innerJoin(users, eq(templates.userId, users.id))
      .where(eq(templates.isFeatured, true))
      .orderBy(desc(templates.usageCount))
      .limit(limit);

    return results.map((t) => ({
      ...this.normalizeTemplateRecord(t),
      author: {
        id: t.authorId,
        name: t.authorName ?? "Unknown",
        image: t.authorImage ?? null,
      },
    }));
  }

  async getByUser(userId: string, limit: number = 20): Promise<
    Array<
      Omit<TemplateWithAuthor, "author"> & {
        author: { id: string; name: string; image: string | null };
      }
    >
  > {
    const results = await db
      .select()
      .from(templates)
      .where(eq(templates.userId, userId))
      .orderBy(desc(templates.createdAt))
      .limit(limit);

    return results.map((template) => ({
      ...this.normalizeTemplateRecord({
        ...template,
        data: template.data,
      }),
      author: {
        id: userId,
        name: "You",
        image: null,
      },
    }));
  }

  async update(
    id: string,
    userId: string,
    updates: Partial<{
      title: string;
      description: string;
      category: string;
      tags: string[];
      isPublic: boolean;
    }>,
  ): Promise<Template | null> {
    const [updated] = await db
      .update(templates)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(templates.id, id), eq(templates.userId, userId)))
      .returning();

    return updated as Template | null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(templates)
      .where(and(eq(templates.id, id), eq(templates.userId, userId)))
      .returning({ id: templates.id });

    return !!deleted;
  }

  async like(templateId: string, userId: string): Promise<void> {
    await db.insert(templateLikes).values({
      templateId,
      userId,
    });

    await db
      .update(templates)
      .set({ likeCount: sql`${templates.likeCount} + 1` })
      .where(eq(templates.id, templateId));
  }

  async unlike(templateId: string, userId: string): Promise<void> {
    await db
      .delete(templateLikes)
      .where(
        and(
          eq(templateLikes.templateId, templateId),
          eq(templateLikes.userId, userId),
        ),
      );

    await db
      .update(templates)
      .set({ likeCount: sql`GREATEST(${templates.likeCount} - 1, 0)` })
      .where(eq(templates.id, templateId));
  }

  async incrementUsage(id: string): Promise<void> {
    await db
      .update(templates)
      .set({ usageCount: sql`${templates.usageCount} + 1` })
      .where(eq(templates.id, id));
  }

  async getCategories(): Promise<string[]> {
    const results = await db
      .select({ category: templates.category })
      .from(templates)
      .where(eq(templates.isPublic, true))
      .groupBy(templates.category);

    return results.map((r) => r.category).filter((c): c is string => !!c);
  }

  private normalizeTemplateRecord(record: TemplateRecord): Omit<TemplateWithAuthor, "author" | "userLiked"> {
    const normalized = normalizePersistedFlow({
      data: typeof record.data === "string" ? JSON.parse(record.data) : record.data,
      id: record.id,
      title: record.title,
      authorId: record.authorId,
    });

    return {
      id: record.id,
      title: record.title,
      description: record.description,
      data: normalized.legacy,
      document: normalized.document,
      formatVersion: normalized.formatVersion,
      category: record.category || "general",
      tags: record.tags || [],
      usageCount: record.usageCount,
      likeCount: record.likeCount,
      isFeatured: record.isFeatured,
      isPublic: record.isPublic,
      family: normalized.document.family,
      edgeCount: normalized.document.edges.length,
      containerCount: normalized.document.containers.length,
      nodeCount: normalized.document.nodes.length,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}

export const templateService = new TemplateService();
