import Link from "next/link";
import styles from "./home.module.css";
import { Button } from "@/shared/ui/Button";

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.glow} />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>C</span>
          CreateFlowchart
        </div>
        <nav className={styles.nav}>
          <Link href="/pricing" className={styles.navLink}>
            Pricing
          </Link>
          <Link href="/templates" className={styles.navLink}>
            Templates
          </Link>
          <Link href="/login" className={styles.navLink}>
            Sign In
          </Link>
          <Button variant="primary" size="sm">
            <Link href="/signup" style={{ color: "inherit", textDecoration: "none" }}>
              Get Started
            </Link>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <main className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Build smarter workflows with <span className={styles.heroGradient}>AI-powered</span> flowcharts.
        </h1>
        <p className={styles.heroSubtitle}>
          From complex logic to clean diagrams in seconds. Real-time collaboration, 
          intelligent automation, and high-fidelity exports for pros.
        </p>

        <div className={styles.heroCta}>
          <Button variant="primary" size="lg">
            <Link href="/editor" style={{ color: "inherit", textDecoration: "none" }}>
              Start Creating (Free)
            </Link>
          </Button>
          <Button variant="secondary" size="lg">
            View Live Demo
          </Button>
        </div>
      </main>

      {/* Preview Section */}
      <section className={styles.previewSection}>
        <div className={styles.preview}>
          <div className={styles.previewMockup}>
            {/* Embedded image placeholder or actual SVG preview */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-text-muted)" }}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="M12 12l0 8" /><path d="M8 16l4-4 4 4" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <SparkleIcon />
          </div>
          <h3 className={styles.featureTitle}>AI-Driven Logic</h3>
          <p className={styles.featureDesc}>
            Auto-generate complex logic from natural language prompts. 
            Identify loops and dead ends with real-time analysis.
          </p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <UsersIcon />
          </div>
          <h3 className={styles.featureTitle}>Real-time Collaboration</h3>
          <p className={styles.featureDesc}>
            Work together in real-time with your team. Multi-cursor editing, 
            version control, and deep access management.
          </p>
        </div>

        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>
            <ZapIcon />
          </div>
          <h3 className={styles.featureTitle}>High-Fidelity Exports</h3>
          <p className={styles.featureDesc}>
            Export to SVG, PNG, PDF, or Mermaid. Maintain pixel precision 
            for professional presentations and docs.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© 2026 CreateFlowchart.com — Built for engineers and designers.</p>
      </footer>
    </div>
  );
}

// ─── Shared UI Elements ──────────────────────────────────────────
function SparkleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2.001 2.001 0 0 1-1.275 1.275L3 12l5.813 1.912a2.001 2.001 0 0 1 1.275 1.275L12 21l1.912-5.813a2.001 2.001 0 0 1 1.275-1.275L21 12l-5.813-1.912a2.001 2.001 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14h6.5l-1.5 8 11-12h-6.5l1.5-8z" />
    </svg>
  );
}
