import Link from "next/link";
import { crmSummary } from "../crm/db";
import styles from "./dashboard.module.css";

export async function CrmSummary() {
  const data = await crmSummary().catch(() => null);
  return <section className={styles.panel} style={{margin:"12px 0"}}>
    <p className={styles.kicker}>CONTACT INTELLIGENCE</p>
    <div className={styles.crmHeading}><h2>Every contact, one history</h2><Link href="/dashboard/contacts">Open CRM →</Link></div>
    {data ? <>
      <div className={styles.compactStats}>
        <div><dt>Archived contacts</dt><dd>{Number(data.counts.contacts).toLocaleString()}</dd></div>
        <div><dt>Interaction recorded</dt><dd>{Number(data.counts.engaged).toLocaleString()}</dd></div>
        <div><dt>Suppressed in archive</dt><dd>{Number(data.counts.blocked).toLocaleString()}</dd></div>
        <div><dt>No open / click recorded</dt><dd>{Number(data.counts.no_signal).toLocaleString()}</dd></div>
      </div>
      <p className={styles.muted}>{data.sync ? `Last complete sync: ${new Date(String(data.sync.updated_at)).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}.` : "Waiting for the first complete VM sync."} Store contacts and paid journeys appear in the CRM directly.</p>
    </> : <p className={styles.orderError}>CRM synchronization is temporarily unavailable. The existing commerce dashboard remains available.</p>}
  </section>;
}
