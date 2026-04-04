import Link from "next/link";
import styles from "./home.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      {/* ─── Navigation ──────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoMark}>C</span>
            CreateFlowchart
          </Link>
          <div className={styles.navLinks}>
            <Link href="/docs" className={styles.navLink}>Docs</Link>
            <Link href="/templates" className={styles.navLink}>Templates</Link>
            <Link href="/pricing" className={styles.navLink}>Pricing</Link>
            <a href="https://github.com/createflowchart" className={styles.navLink} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </div>
        </div>
        <div className={styles.navRight}>
          <Link href="/login" className={styles.navLink}>Sign in</Link>
          <span className={styles.navDivider} />
          <Link href="/editor" className={styles.navCta}>
            Open Editor
          </Link>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <span className={styles.heroBadgeDot} />
          Open source diagramming platform
        </div>
        <h1 className={styles.heroTitle}>
          Build diagrams that <span className={styles.heroAccent}>think</span> with you.
        </h1>
        <p className={styles.heroSub}>
          An open-source engine for flowcharts, BPMN, org charts, and 15+ diagram types.
          Use it as an npm library, a REST API, or a full-featured editor.
        </p>
        <div className={styles.heroActions}>
          <Link href="/editor" className={styles.btnPrimary}>
            <ArrowRightIcon />
            Start Building
          </Link>
          <a href="https://github.com/createflowchart" className={styles.btnSecondary} target="_blank" rel="noopener noreferrer">
            <GitHubIcon />
            View Source
          </a>
        </div>
      </section>

      {/* ─── Canvas Preview ──────────────────────────────────────── */}
      <div className={styles.canvasWrap}>
        <div className={styles.canvas}>
          <div className={styles.canvasToolbar}>
            <div className={styles.canvasToolbarDot} />
            <div className={styles.canvasToolbarDot} />
            <div className={styles.canvasToolbarDot} />
            <span className={styles.canvasToolbarTitle}>
              user-auth-flow.flow — CreateFlowchart
            </span>
          </div>
          <div className={styles.canvasBody}>
            {/* Sidebar */}
            <div className={styles.canvasSidebar}>
              <span className={styles.canvasSidebarLabel}>Shapes</span>
              <div className={styles.canvasSidebarItem}>
                <span className={styles.canvasSidebarShapePill} />
                Start / End
              </div>
              <div className={styles.canvasSidebarItem}>
                <span className={styles.canvasSidebarShape} />
                Process
              </div>
              <div className={styles.canvasSidebarItem}>
                <span className={styles.canvasSidebarShapeDiamond} />
                Decision
              </div>
              <div className={styles.canvasSidebarItem}>
                <span className={styles.canvasSidebarShape} />
                Action
              </div>
              <span className={styles.canvasSidebarLabel} style={{ marginTop: 16 }}>Layers</span>
              <div className={styles.canvasSidebarItem}>
                <LayerIcon /> Main flow
              </div>
              <div className={styles.canvasSidebarItem}>
                <LayerIcon /> Error paths
              </div>
            </div>

            {/* Diagram area */}
            <div className={styles.canvasArea}>
              {/* Nodes */}
              <div className={`${styles.dNode} ${styles.dNodeStart}`}>
                User visits /login
              </div>
              <div className={`${styles.dNode} ${styles.dNodeProcess1}`}>
                Enter credentials
              </div>
              <div className={`${styles.dNode} ${styles.dNodeDecision}`}>
                <span className={styles.dNodeDecisionLabel}>Valid?</span>
              </div>
              <div className={`${styles.dNode} ${styles.dNodeAction}`}>
                Send welcome email
              </div>
              <div className={`${styles.dNode} ${styles.dNodeEnd}`}>
                Dashboard
              </div>
              <div className={`${styles.dNode} ${styles.dNodeEnd2}`}>
                Show error
              </div>

              {/* AI indicator */}
              <div className={styles.aiPulse}>
                <span className={styles.aiDot} />
                AI analyzed — 3 suggestions
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Capabilities ────────────────────────────────────────── */}
      <section className={styles.capabilities}>
        <div className={styles.capHeader}>
          <p className={styles.capLabel}>Capabilities</p>
          <h2 className={styles.capTitle}>Everything you need to diagram at scale.</h2>
          <p className={styles.capSub}>
            One engine that powers interactive flowcharts, BPMN, org charts, and more — in the browser or on the server.
          </p>
        </div>

        <div className={styles.capGrid}>
          <CapCard
            icon={<SparkleIcon />}
            title="AI Generation"
            desc="Describe a process in plain English. Get a validated, editable diagram in seconds."
          />
          <CapCard
            icon={<LayoutIcon />}
            title="Auto Layout"
            desc="8 algorithms: layered, tree, force-directed, radial, circular, grid, swimlane, and timeline."
          />
          <CapCard
            icon={<UsersIcon />}
            title="Real-time Multiplayer"
            desc="Yjs-powered CRDT collaboration. Multi-cursor editing with conflict-free merging."
          />
          <CapCard
            icon={<CodeIcon />}
            title="Code ↔ Diagram"
            desc="Edit as text (native DSL or Mermaid). Changes sync bi-directionally with the visual canvas."
          />
          <CapCard
            icon={<PortIcon />}
            title="Port System"
            desc="Typed connection points with validation constraints. Model circuits, data flows, and BPMN connections."
          />
          <CapCard
            icon={<ExportIcon />}
            title="Export Anywhere"
            desc="High-fidelity SVG, PNG, PDF, Mermaid, and JSON. Server-side rendering for CI/CD pipelines."
          />
        </div>
      </section>

      {/* ─── Three Modes ─────────────────────────────────────────── */}
      <section className={styles.modes}>
        <div className={styles.capHeader}>
          <p className={styles.capLabel}>Three ways to author</p>
          <h2 className={styles.capTitle}>Visual. Code. AI.</h2>
          <p className={styles.capSub}>
            Every authoring mode reads and writes the same JSON model. Pick what fits your workflow.
          </p>
        </div>

        <div className={styles.modesGrid}>
          {/* Visual mode */}
          <div className={styles.modeCard}>
            <div className={styles.modePreview}>
              <div className={styles.miniDiagram}>
                <div className={styles.miniNode} style={{ borderColor: "var(--color-node-start)", color: "var(--color-node-start)", borderRadius: 12 }}>
                  Start
                </div>
                <div className={styles.miniArrow} />
                <div className={styles.miniNode} style={{ borderColor: "var(--color-node-process)", color: "var(--color-node-process)" }}>
                  Process
                </div>
                <div className={styles.miniArrow} />
                <div className={styles.miniNode} style={{ borderColor: "var(--color-node-end)", color: "var(--color-node-end)", borderRadius: 12 }}>
                  End
                </div>
              </div>
            </div>
            <div className={styles.modeContent}>
              <span className={styles.modeTag}>Canvas</span>
              <h3 className={styles.modeTitle}>Drag, drop, connect</h3>
              <p className={styles.modeDesc}>
                Professional canvas editor with shape palette, snap grid, groups, auto-layout, and real-time collaboration.
              </p>
            </div>
          </div>

          {/* Code mode */}
          <div className={styles.modeCard}>
            <div className={styles.modePreview} style={{ display: "flex", alignItems: "center", padding: 24 }}>
              <div className={styles.codeBlock}>
                <span className={styles.kw}>flow</span>{" "}UserAuth {"{"}<br/>
                &nbsp;&nbsp;start{" → "}<span className={styles.str}>Login</span><br/>
                &nbsp;&nbsp;<span className={styles.str}>Login</span>{" → "}<span className={styles.kw}>decide</span> Valid?<br/>
                &nbsp;&nbsp;Valid? <span className={styles.str}>yes</span>{" → "}Dashboard<br/>
                &nbsp;&nbsp;Valid? <span className={styles.str}>no</span>{" → "}Error<br/>
                {"}"}
              </div>
            </div>
            <div className={styles.modeContent}>
              <span className={styles.modeTag}>Code</span>
              <h3 className={styles.modeTitle}>Write as text</h3>
              <p className={styles.modeDesc}>
                Native DSL, Mermaid, or D2 syntax. Bi-directional sync — code changes update the canvas, and vice versa.
              </p>
            </div>
          </div>

          {/* AI mode */}
          <div className={styles.modeCard}>
            <div className={styles.modePreview} style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 24 }}>
              <div className={styles.aiChat}>
                <div className={styles.aiChatUser}>
                  Create a user registration flow with email verification
                </div>
                <div className={styles.aiChatBot}>
                  Generated 6 nodes, 7 edges. 2 decision points detected. Confidence: 94%.
                </div>
              </div>
            </div>
            <div className={styles.modeContent}>
              <span className={styles.modeTag}>AI</span>
              <h3 className={styles.modeTitle}>Describe, generate</h3>
              <p className={styles.modeDesc}>
                Multi-provider AI pipeline (OpenAI, Anthropic, OpenRouter) with schema validation and auto-repair.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Platform Distribution ───────────────────────────────── */}
      <section className={styles.platform}>
        <div className={styles.capHeader}>
          <p className={styles.capLabel}>Use it your way</p>
          <h2 className={styles.capTitle}>Library. API. Editor.</h2>
          <p className={styles.capSub}>
            CreateFlowchart is a platform, not just a web app. Use the engine in your own projects.
          </p>
        </div>

        <div className={styles.platformGrid}>
          <div className={styles.platformCard}>
            <span className={styles.platformCardTag}>npm package</span>
            <div className={styles.platformMono}>
              <span className={styles.cmt}>{"// "} Install the core engine</span>{"\n"}
              <span className={styles.hl}>npm install</span> @createflowchart/legacy{"\n\n"}
              <span className={styles.cmt}>{"// "} Generate a diagram</span>{"\n"}
              <span className={styles.kw}>const</span> engine = <span className={styles.fn}>createEngine</span>();{"\n"}
              engine.<span className={styles.fn}>addNode</span>({"{ "}shape: <span className={styles.str}>&apos;process&apos;</span>{" }"});{"\n"}
              engine.<span className={styles.fn}>autoLayout</span>(<span className={styles.str}>&apos;tree&apos;</span>);
            </div>
            <h3 className={styles.platformCardTitle}>Headless engine for any framework</h3>
            <p className={styles.platformCardDesc}>
              Framework-agnostic TypeScript library. Works in React, Vue, Svelte, Node.js, or vanilla JS. Zero DOM dependencies for core operations.
            </p>
          </div>

          <div className={styles.platformCard}>
            <span className={styles.platformCardTag}>REST API</span>
            <div className={styles.platformMono}>
              <span className={styles.hl}>POST</span> /api/v1/generate{"\n\n"}
              {"{"}{"\n"}
              {"  "}<span className={styles.str}>&quot;prompt&quot;</span>: <span className={styles.str}>&quot;CI/CD pipeline&quot;</span>,{"\n"}
              {"  "}<span className={styles.str}>&quot;format&quot;</span>: <span className={styles.str}>&quot;svg&quot;</span>,{"\n"}
              {"  "}<span className={styles.str}>&quot;layout&quot;</span>: <span className={styles.str}>&quot;layered-digraph&quot;</span>{"\n"}
              {"}"}
            </div>
            <h3 className={styles.platformCardTitle}>Generate diagrams from any backend</h3>
            <p className={styles.platformCardDesc}>
              Send a prompt or diagram JSON, get back SVG, PNG, or PDF. Server-side rendering without a browser.
            </p>
          </div>

          <div className={styles.platformCard}>
            <span className={styles.platformCardTag}>React component</span>
            <div className={styles.platformMono}>
              <span className={styles.kw}>import</span> {"{ "}Diagram{"} "}<span className={styles.kw}>from</span> <span className={styles.str}>&apos;@createflowchart/react&apos;</span>;{"\n\n"}
              {"<"}<span className={styles.fn}>Diagram</span>{"\n"}
              {"  "}model={"{"}model{"}"}{"\n"}
              {"  "}layout=<span className={styles.str}>&quot;tree&quot;</span>{"\n"}
              {"  "}onModelChange={"{"}handleChange{"}"}{"\n"}
              {"/>"}
            </div>
            <h3 className={styles.platformCardTitle}>Drop-in React component</h3>
            <p className={styles.platformCardDesc}>
              Canvas-rendered diagram component with palette, minimap, and overview. Handles 10,000+ nodes.
            </p>
          </div>

          <div className={styles.platformCard}>
            <span className={styles.platformCardTag}>CLI</span>
            <div className={styles.platformMono}>
              <span className={styles.cmt}># Render a Mermaid file</span>{"\n"}
              <span className={styles.hl}>npx</span> createflowchart render flow.mmd \{"\n"}
              {"  "}--output flow.svg \{"\n"}
              {"  "}--layout tree{"\n\n"}
              <span className={styles.cmt}># Generate from prompt</span>{"\n"}
              <span className={styles.hl}>npx</span> createflowchart generate <span className={styles.str}>&quot;auth flow&quot;</span>
            </div>
            <h3 className={styles.platformCardTitle}>CI/CD and automation</h3>
            <p className={styles.platformCardDesc}>
              Generate diagrams in pipelines, documentation builds, or scripts. Output SVG, PNG, or JSON.
            </p>
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────── */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Start diagramming in 30 seconds.</h2>
          <p className={styles.ctaSub}>
            Open the editor — no account needed. Sandbox mode saves automatically to your browser.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/editor" className={styles.btnPrimary}>
              <ArrowRightIcon />
              Open Editor
            </Link>
            <a href="https://github.com/createflowchart" className={styles.btnSecondary} target="_blank" rel="noopener noreferrer">
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerLeft}>
            © 2026 CreateFlowchart — MIT License
          </span>
          <div className={styles.footerLinks}>
            <Link href="/docs" className={styles.footerLink}>Documentation</Link>
            <a href="https://github.com/createflowchart" className={styles.footerLink} target="_blank" rel="noopener noreferrer">GitHub</a>
            <Link href="/templates" className={styles.footerLink}>Templates</Link>
            <Link href="/pricing" className={styles.footerLink}>Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Component: Capability card
// ═══════════════════════════════════════════════════════════════════

function CapCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className={styles.capCard}>
      <div className={styles.capIcon}>{icon}</div>
      <h3 className={styles.capCardTitle}>{title}</h3>
      <p className={styles.capCardDesc}>{desc}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Icons — minimal 16×16, stroke-based
// ═══════════════════════════════════════════════════════════════════

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
    </svg>
  );
}

function LayoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function PortIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function LayerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 12-8.58 3.91a2 2 0 0 1-1.66 0L2 12" />
    </svg>
  );
}
