import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { dashboardAuthenticated } from "../auth";
import { crmSummary, listContacts, segments } from "../../crm/db";
import { DashboardAutoRefresh } from "../dashboard-auto-refresh";
import styles from "../dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {title:"CRM · AMB BOUTIQUE",robots:{index:false,follow:false}};
const count = (value: unknown) => Number(value || 0).toLocaleString("pt-BR");

export default async function ContactsPage({searchParams}: {searchParams: Promise<{q?:string;segment?:string;after?:string}>}) {
  if (!await dashboardAuthenticated()) redirect("/dashboard/login");
  const params = await searchParams;
  const q = (params.q || "").trim().toLowerCase().slice(0,320);
  const segment = segments.some(([key])=>key===params.segment) ? params.segment! : "all";
  const after = (params.after || "").slice(0,320);
  const result = await Promise.all([listContacts(q,segment,after),crmSummary()]).catch(()=>null);
  const rows = result?.[0].slice(0,50) || [];
  const next = new URLSearchParams({q,segment,after:String(rows.at(-1)?.email || "")});
  return <main className={styles.dashboard}>
    <header className={styles.header}><div><p className={styles.kicker}>AMB BOUTIQUE · CRM PRIVADO</p><h1>Contatos & relações</h1><p>A origem, as interações e a jornada de cada email, sem perder a história.</p></div>
      <div className={styles.headerActions}><Link href="/dashboard">Commerce Intelligence</Link><form action="/api/dashboard/logout" method="post"><button>Sair</button></form></div>
    </header>
    <section className={styles.statusStrip}><span>{result ? `${count(result[1].counts.contacts)} contatos no arquivo permanente` : "Sincronização indisponível"}</span>
      <span>{result?.[1].sync ? `Sincronizado em ${new Date(String(result[1].sync.updated_at)).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}` : "Aguardando primeira sincronização completa"}</span><DashboardAutoRefresh/></section>
    <section className={styles.panel} style={{marginTop:12}}>
      <form className={styles.crmSearch} method="get"><label>Email<input name="q" type="search" placeholder="Buscar por email" defaultValue={q}/></label>
        <label>Segmento<select name="segment" defaultValue={segment}>{segments.map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label><button>Filtrar contatos</button></form>
      <p className={styles.muted}>Os filtros organizam a base. A autorização de envio depende também dos bloqueios, da inscrição, da cadência e da cota disponível.</p>
      {!result && <p className={styles.orderError}>Não foi possível consultar o CRM. Tente novamente após a sincronização.</p>}
      <div className={styles.tableWrap}><table><thead><tr><th>Contato</th><th>Situação</th><th>Envios AMB</th><th>Aberturas / cliques</th><th>Jornada na loja</th></tr></thead>
        <tbody>{rows.map(row=><tr key={String(row.email)}>
          <td><Link href={`/dashboard/contacts/${encodeURIComponent(String(row.email))}`}>{String(row.email)}</Link><small className={styles.blockSmall}>{String(row.country || row.source || "Origem no arquivo")}</small></td>
          <td><span className={row.blocked ? styles.statusPending : styles.statusDone}>{row.blocked ? "Bloqueado" : row.email_consent ? "Inscrito na loja" : row.marketing_status==="subscribed" ? "Inscrição confirmada" : "Sem inscrição registrada"}</span></td>
          <td>{count(row.sent)}<small className={styles.blockSmall}>{Number(row.pending)>0 ? `${count(row.pending)} aguardando confirmação` : ""}</small></td>
          <td>{count(row.opens)} / {count(row.clicks)}{Number(row.legacy_engagement)>0 && <small className={styles.blockSmall}>Interação no histórico anterior</small>}</td>
          <td>{Number(row.purchases)>0 ? `${count(row.purchases)} compra(s) confirmada(s)` : Number(row.checkouts)>0 ? "Checkout iniciado" : Number(row.carts)>0 ? "Carrinho registrado" : "Sem jornada identificada"}</td>
        </tr>)}</tbody></table></div>
      {result && !rows.length && <p className={styles.bodyCopy}>Nenhum contato neste filtro.</p>}
      <nav className={styles.crmPager} aria-label="Paginação"><Link href={`/dashboard/contacts?${new URLSearchParams({q,segment})}`}>Início da lista</Link>{result && result[0].length>50 && <Link href={`/dashboard/contacts?${next}`}>Próximos 50 →</Link>}</nav>
    </section>
    <p className={styles.muted}>“Sem abertura registrada” indica ausência de sinal, não prova de que o email foi ignorado. Aberturas e cliques podem incluir prévias e verificadores. Uma compra exige confirmação do pagamento; visitas anônimas permanecem sem atribuição.</p>
  </main>;
}
