import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { DocumentPreview } from "@/features/diagram/components/DocumentPreview";
import { templateService } from "@/features/templates/services/template-service";

export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await templateService.getById(id);

  if (!template || !template.isPublic) {
    notFound();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        color: "var(--color-text-primary)",
      }}
    >
      <main
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "48px 32px 72px",
          display: "grid",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <Link href="/templates" style={{ color: "var(--color-text-muted)" }}>
              Back to templates
            </Link>
            <div style={{ display: "grid", gap: 6 }}>
              <h1 style={{ margin: 0, fontSize: "2rem" }}>{template.title}</h1>
              {template.description ? (
                <p
                  style={{
                    margin: 0,
                    maxWidth: 720,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {template.description}
                </p>
              ) : null}
            </div>
            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                fontSize: 13,
                color: "var(--color-text-muted)",
              }}
            >
              <span>{template.nodeCount} nodes</span>
              <span>{template.usageCount} uses</span>
              <span>{template.likeCount} likes</span>
              <span>{template.category}</span>
              <span>By {template.author.name}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Link href={`/editor?template=${template.id}`}>
              <Button variant="primary">Use Template</Button>
            </Link>
          </div>
        </div>

        <DocumentPreview document={template.document} minHeight={520} />

        {template.tags.length ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {template.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-secondary)",
                  fontSize: 13,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}
