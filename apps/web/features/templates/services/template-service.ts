import { db } from "@/shared/lib/db";
import {
  templates,
  templateLikes,
  users,
} from "@createflowchart/db/src/schema";
import { eq, desc, and, sql, like, or } from "drizzle-orm";
import type { Template, NewTemplate } from "@createflowchart/db/src/schema";
import type { FlowGraph } from "@createflowchart/core";

export interface CreateTemplateInput {
  userId: string;
  title: string;
  description?: string;
  data: FlowGraph;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface TemplateWithAuthor {
  id: string;
  title: string;
  description: string | null;
  data: FlowGraph;
  category: string;
  tags: string[];
  usageCount: number;
  likeCount: number;
  isFeatured: boolean;
  isPublic: boolean;
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

class TemplateService {
  async create(input: CreateTemplateInput): Promise<Template> {
    const [template] = await db
      .insert(templates)
      .values({
        userId: input.userId,
        title: input.title,
        description: input.description,
        data: input.data as any,
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
      id: template.id,
      title: template.title,
      description: template.description,
      data: template.data as unknown as FlowGraph,
      category: template.category || "general",
      tags: template.tags || [],
      usageCount: template.usageCount,
      likeCount: template.likeCount,
      isFeatured: template.isFeatured,
      isPublic: template.isPublic,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      author: {
        id: template.authorId,
        name: template.authorName,
        image: template.authorImage,
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
      id: t.id,
      title: t.title,
      description: t.description,
      data: t.data as unknown as FlowGraph,
      category: t.category || "general",
      tags: t.tags || [],
      usageCount: t.usageCount,
      likeCount: t.likeCount,
      isFeatured: t.isFeatured,
      isPublic: t.isPublic,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      author: {
        id: t.authorId,
        name: t.authorName,
        image: t.authorImage,
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
      id: t.id,
      title: t.title,
      description: t.description,
      data: t.data as unknown as FlowGraph,
      category: t.category || "general",
      tags: t.tags || [],
      usageCount: t.usageCount,
      likeCount: t.likeCount,
      isFeatured: t.isFeatured,
      isPublic: t.isPublic,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      author: {
        id: t.authorId,
        name: t.authorName,
        image: t.authorImage,
      },
    }));
  }

  async getByUser(userId: string, limit: number = 20): Promise<Template[]> {
    const results = await db
      .select()
      .from(templates)
      .where(eq(templates.userId, userId))
      .orderBy(desc(templates.createdAt))
      .limit(limit);

    return results as Template[];
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
}

export const templateService = new TemplateService();
