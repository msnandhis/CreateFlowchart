import { EditorShell } from "@/features/editor/components/EditorShell";
import { auth } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { flows } from "@createflowchart/db";
import { eq, and } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Server-side data fetching for the editor page.
 * Ensures the user has permission to view/edit the flow.
 */
export default async function EditorIdPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    // Check if flow is public before redirecting
    const flow = await db.query.flows.findFirst({
      where: eq(flows.id, id),
    });

    if (!flow || !flow.isPublic) {
      redirect("/login");
    }
  }

  // Fetch flow (if session exists, check ownership; if not, check public)
  const flow = await db.query.flows.findFirst({
    where: session 
      ? and(eq(flows.id, id), eq(flows.userId, session.user.id))
      : and(eq(flows.id, id), eq(flows.isPublic, true)),
  });

  if (!flow) {
    notFound();
  }

  return <EditorShell key={flow.id} initialData={flow} />;
}
