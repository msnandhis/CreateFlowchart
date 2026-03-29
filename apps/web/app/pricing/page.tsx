import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import styles from "./pricing.module.css";

export default function PricingPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          CreateFlowchart
        </Link>
        <div className={styles.navLinks}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/gallery">Gallery</Link>
          <Link href="/templates">Templates</Link>
        </div>
        <div className={styles.navActions}>
          <Link href="/editor">
            <Button variant="primary" size="sm">
              Start Free
            </Button>
          </Link>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Simple, Transparent Pricing</h1>
          <p className={styles.subtitle}>
            Start free, upgrade when you need more power
          </p>
        </div>

        <div className={styles.plans}>
          <div className={styles.plan}>
            <div className={styles.planHeader}>
              <h2 className={styles.planName}>Free</h2>
              <div className={styles.planPrice}>
                <span className={styles.priceAmount}>$0</span>
                <span className={styles.pricePeriod}>/month</span>
              </div>
            </div>
            <ul className={styles.planFeatures}>
              <li>Up to 10 flowcharts</li>
              <li>5 AI generations per day</li>
              <li>SVG export</li>
              <li>Real-time collaboration</li>
              <li>Community support</li>
            </ul>
            <Button variant="secondary" className={styles.planButton}>
              Current Plan
            </Button>
          </div>

          <div className={`${styles.plan} ${styles.planPopular}`}>
            <div className={styles.popularBadge}>Most Popular</div>
            <div className={styles.planHeader}>
              <h2 className={styles.planName}>Pro</h2>
              <div className={styles.planPrice}>
                <span className={styles.priceAmount}>$12</span>
                <span className={styles.pricePeriod}>/month</span>
              </div>
            </div>
            <ul className={styles.planFeatures}>
              <li>Unlimited flowcharts</li>
              <li>100 AI generations per day</li>
              <li>SVG, PNG, PDF export</li>
              <li>Real-time collaboration</li>
              <li>Priority support</li>
              <li>Custom templates</li>
              <li>Analytics dashboard</li>
            </ul>
            <Button variant="primary" className={styles.planButton}>
              Coming Soon
            </Button>
          </div>

          <div className={styles.plan}>
            <div className={styles.planHeader}>
              <h2 className={styles.planName}>Enterprise</h2>
              <div className={styles.planPrice}>
                <span className={styles.priceAmount}>Custom</span>
              </div>
            </div>
            <ul className={styles.planFeatures}>
              <li>Everything in Pro</li>
              <li>Unlimited AI generations</li>
              <li>SSO / SAML</li>
              <li>Dedicated support</li>
              <li>Custom integrations</li>
              <li>SLA guarantee</li>
            </ul>
            <Button variant="secondary" className={styles.planButton}>
              Contact Sales
            </Button>
          </div>
        </div>

        <p className={styles.note}>
          All plans include a 14-day free trial. No credit card required.
        </p>
      </main>
    </div>
  );
}