import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { dashboardAuthenticated } from "../auth";
import { allCampaigns, findCampaign } from "../../email/campaigns";
import { renderAmbEmail } from "../../email/template";
import styles from "../dashboard.module.css";

export const metadata: Metadata = { title: "Email Mockup", robots: { index: false, follow: false } };

export default async function EmailPreviewPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  if (!await dashboardAuthenticated()) redirect("/dashboard/login");
  const { campaign: requested = "welcome-newsletter" } = await searchParams;
  const campaign = findCampaign(requested);
  const index = Math.max(0, allCampaigns.findIndex((item) => item.key === campaign.key));
  const previous = allCampaigns[(index - 1 + allCampaigns.length) % allCampaigns.length];
  const next = allCampaigns[(index + 1) % allCampaigns.length];
  const html = renderAmbEmail(campaign, { firstName: "Olivia" });
  return <main className={styles.emailPreview}>
    <header className={styles.previewBar}>
      <Link href="/dashboard">← Dashboard</Link>
      <span>{campaign.name} · {index + 1} of {allCampaigns.length}</span>
      <span><Link href={`/dashboard/email-preview?campaign=${previous.key}`}>Previous</Link> · <Link href={`/dashboard/email-preview?campaign=${next.key}`}>Next</Link></span>
    </header>
    <iframe title={campaign.name} className={styles.previewFrame} srcDoc={html}/>
  </main>;
}

