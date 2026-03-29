"use client";

import { useSession, signOut } from "@/shared/lib/auth-client";
import { Button } from "@/shared/ui/Button";
import { Dropdown, DropdownItem, DropdownDivider } from "@/shared/ui/Dropdown";
import styles from "../styles/dashboard.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.nav}>
        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          <div style={{ fontSize: "var(--font-size-lg)", fontWeight: "bold", color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "24px", height: "24px", background: "var(--color-primary)", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "14px" }}>C</span>
            Dashboard
          </div>
        </Link>

        {session && (
          <Dropdown
            trigger={
              <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--color-primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)", fontSize: "12px", fontWeight: "bold", border: "1px solid var(--color-border)" }}>
                  {session.user.name?.[0].toUpperCase() ?? "U"}
                </div>
              </button>
            }
          >
            <div style={{ padding: "8px 12px", fontSize: "12px", color: "var(--color-text-muted)" }}>
              {session.user.email}
            </div>
            <DropdownDivider />
            <DropdownItem onClick={() => router.push("/profile")}>Profile Settings</DropdownItem>
            <DropdownItem onClick={() => router.push("/dashboard")}>My Flowcharts</DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={handleSignOut}>
              <span style={{ color: "var(--color-error)" }}>Sign Out</span>
            </DropdownItem>
          </Dropdown>
        )}
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
