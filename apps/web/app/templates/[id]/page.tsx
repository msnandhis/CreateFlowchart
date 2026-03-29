import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { DocumentPreview } from "@/features/diagram/components/DocumentPreview";
import { templateService } from "@/features/templates/services/template-service";
import styles from "./template-detail.module.css";

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
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.heroContent}>
            <Link href="/templates" className={styles.backLink}>
              Back to templates
            </Link>
            <div className={styles.titleBlock}>
              <h1 className={styles.title}>{template.title}</h1>
              {template.description ? (
                <p className={styles.description}>{template.description}</p>
              ) : null}
            </div>
            <div className={styles.meta}>
              <Badge variant="info">{template.family}</Badge>
              <span className={styles.pill}>{template.nodeCount} nodes</span>
              <span className={styles.pill}>{template.edgeCount} edges</span>
              {template.containerCount > 0 ? (
                <span className={styles.pill}>{template.containerCount} groups</span>
              ) : null}
              <span className={styles.pill}>{template.usageCount} uses</span>
              <span className={styles.pill}>{template.likeCount} likes</span>
              {template.category ? (
                <span className={styles.pill}>{template.category}</span>
              ) : null}
              <span className={styles.pill}>By {template.author.name}</span>
            </div>
          </div>

          <div className={styles.actions}>
            <Link href="/templates" className={styles.secondaryLink}>
              Browse More
            </Link>
            <Link href={`/editor?template=${template.id}`}>
              <Button variant="primary">Use Template</Button>
            </Link>
            <Link href={`/view/${template.id}`} className={styles.secondaryLink}>
              Live Preview
            </Link>
          </div>
        </div>

        <section className={styles.previewSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Template Preview</h2>
              <p className={styles.sectionCopy}>
                Review the complete diagram before remixing it into the editor.
              </p>
            </div>
          </div>
          <DocumentPreview document={template.document} minHeight={520} />
        </section>

        {template.tags.length ? (
          <div className={styles.tags}>
            {template.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}
