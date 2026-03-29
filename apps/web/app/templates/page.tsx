"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TemplateGallery } from "@/features/templates/components/TemplateGallery";
import { Button } from "@/shared/ui/Button";
import styles from "./templates.module.css";

export default function TemplatesPage() {
  const router = useRouter();

  const handleSelectTemplate = (template: any) => {
    router.push(`/editor?template=${template.id}`);
  };

  const handleCreateNew = () => {
    router.push("/editor");
  };

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          CreateFlowchart
        </Link>
        <div className={styles.navLinks}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/gallery">Gallery</Link>
          <Link href="/templates" className={styles.active}>
            Templates
          </Link>
        </div>
        <div className={styles.navActions}>
          <Link href="/editor">
            <Button variant="primary" size="sm">
              New Flow
            </Button>
          </Link>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Templates</h1>
          <p className={styles.subtitle}>
            Start fast with pre-built flowchart templates
          </p>
        </div>

        <TemplateGallery
          showCreateButton
          onSelectTemplate={handleSelectTemplate}
          onCreateNew={handleCreateNew}
          emptyMessage="No templates yet. Create the first one!"
        />
      </main>
    </div>
  );
}