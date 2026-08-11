import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardAuthenticated, dashboardConfigured } from "../auth";
import { DashboardLoginForm } from "./login-form";
import styles from "../dashboard.module.css";

export const metadata: Metadata = { title: "AMB Intelligence Login", robots: { index: false, follow: false } };

export default async function DashboardLoginPage() {
  if (await dashboardAuthenticated()) redirect("/dashboard");
  return <main className={styles.loginPage}>
    <section className={styles.loginCard}>
      <p className={styles.kicker}>AMB BOUTIQUE · PRIVATE</p>
      <h1>Commerce Intelligence</h1>
      <p>Visitors, journeys, email performance and conversion opportunities in one private view.</p>
      <DashboardLoginForm configured={dashboardConfigured()}/>
    </section>
  </main>;
}

