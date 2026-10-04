import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { dashboardAuthenticated } from "../../auth";
import { crmSql } from "../../../crm/db";
import styles from "../../dashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {title:"Histórico do contato · AMB",robots:{index:false,follow:false}};
const date = (value: unknown) => value ? new Date(String(value)).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"}) : "Não registrado";
const titles: Record<string,string> = {open:"Abertura registrada",click:"Clique registrado",engagement_observed:"Interação no histórico anterior",
  suppressed:"Contato bloqueado",source_observed:"Origem atualizada",message_accepted:"Envio aceito pelo provedor",message_unknown:"Envio reservado / resultado incerto",message_queued:"Solicitação na fila Omnisend",store_contacts:"Cadastro da loja atualizado",store_journeys:"Jornada da loja atualizada",store_messages:"Email da loja atualizado",store_events:"Interação na loja"};

export default async function ContactPage({params,searchParams}: {params:Promise<{email:string}>;searchParams:Promise<{before?:string;key?:string}>}) {
  if (!await dashboardAuthenticated()) redirect("/dashboard/login");
  const email=(await params).email.trim().toLowerCase();
  if (!email || email.length>320) notFound();
  const {before,key=""}=await searchParams;
  const cursor=before && Number.isFinite(Date.parse(before)) ? before : "9999-01-01T00:00:00Z";
  const sql=await crmSql();
  const [archive,store,events,journeys,storeEvents] = await Promise.all([
    sql`SELECT * FROM amb_prospector_contacts WHERE email=${email}`,
    sql`SELECT to_jsonb(c) AS payload FROM amb_contacts c WHERE lower(email)=${email}`,
    sql`SELECT * FROM amb_prospector_events WHERE email=${email}
      AND (observed_at,key)<(${cursor}::timestamptz,${before ? key : "~"}) ORDER BY observed_at DESC,key DESC LIMIT 51`,
    sql`SELECT id,status,cart,amount_total,currency,updated_at,completed_at FROM amb_commerce_journeys WHERE lower(email)=${email} ORDER BY updated_at DESC LIMIT 30`,
    sql`SELECT e.event_type,e.occurred_at,e.path,e.slug,e.source FROM amb_analytics_events e
      JOIN amb_analytics_visitors v ON v.visitor_id=e.visitor_id WHERE lower(v.email)=${email}
      AND e.event_type IN ('product_view','add_to_cart','cart_open','checkout_start','checkout_error','newsletter_signup','popup_signup','purchase','click')
      ORDER BY e.occurred_at DESC LIMIT 30`,
  ]);
  if (!archive.length && !store.length) {
    console.warn("[DEBUG-amb-crm-profile]", {
      parameterLength:email.length, encodedSeparator:/%40/i.test(email), literalSeparator:email.includes("@"),
      archiveArray:Array.isArray(archive), archiveRows:archive.length,
      storeArray:Array.isArray(store), storeRows:store.length,
    });
    notFound();
  }
  const contact=archive[0] || {}, signup=store[0]?.payload || {}, payload=contact.payload || {};
  const blocked=contact.blocked || signup.unsubscribed_at || signup.suppression_reason;
  const reasons=Array.isArray(payload.reasons) ? payload.reasons.map(String) : [];
  const page=events.slice(0,50), last=page.at(-1);
  const more=new URLSearchParams({before:String(last?.observed_at || ""),key:String(last?.key || "")});
  return <main className={styles.dashboard}>
    <header className={styles.header}><div><p className={styles.kicker}>AMB BOUTIQUE · HISTÓRICO DO CONTATO</p><h1 className={styles.crmEmail}>{email}</h1><p>Registros preservados e sinais vinculados a uma identidade conhecida.</p></div><div className={styles.headerActions}><Link href="/dashboard/contacts">← Contatos</Link></div></header>
    <section className={styles.statusStrip}><span>{blocked ? "Bloqueado para envio" : "Sem bloqueio registrado"}</span><span>{signup.email_consent && !signup.unsubscribed_at ? "Inscrição na loja registrada" : "Sem inscrição de marketing registrada"}</span><span>{String(contact.country || signup.market || "País não identificado")}</span></section>
    <div className={styles.twoColumns}><section className={styles.panel}><p className={styles.kicker}>RELAÇÃO</p><h2>Permissão & bloqueios</h2>
      <dl className={styles.crmFacts}><dt>Origem na loja</dt><dd>{String(signup.source || "Não registrada")}</dd><dt>Inscrição em</dt><dd>{date(signup.consented_at)}</dd><dt>Descadastro em</dt><dd>{date(signup.unsubscribed_at)}</dd><dt>Motivos de bloqueio</dt><dd>{[...reasons,signup.suppression_reason].filter(Boolean).join(", ") || "Nenhum registrado"}</dd><dt>Primeiro registro no CRM</dt><dd>{date(payload.first_seen)}</dd></dl>
      <p className={styles.muted}>Abertura e clique acionam a sequência após o envio inicial aceito. Bloqueios, inscrições e cotas continuam sendo verificados antes de cada envio.</p>
    </section><section className={styles.panel}><p className={styles.kicker}>EMAIL AMB</p><h2>Sinais acumulados</h2><div className={styles.compactStats}>
      {[["Envios aceitos",contact.sent],["Resultado pendente",contact.pending],["Aberturas registradas",contact.opens],["Cliques registrados",contact.clicks]].map(([label,value])=><div key={String(label)}><dt>{String(label)}</dt><dd>{Number(value || 0).toLocaleString("pt-BR")}</dd></div>)}
      </div><p className={styles.muted}>Última interação: {date(payload.last_engagement)}. {Number(contact.legacy_engagement)>0 ? "O histórico anterior reúne abertura ou clique sem distinguir o tipo." : ""}</p></section></div>
    <section className={styles.panel}><p className={styles.kicker}>COMMERCE</p><h2>Carrinho, checkout & compra</h2><div className={styles.tableWrap}><table><thead><tr><th>Atualização</th><th>Estado</th><th>Valor</th><th>Pagamento</th></tr></thead><tbody>{journeys.map(j=><tr key={String(j.id)}><td>{date(j.updated_at)}</td><td>{String(j.status)}</td><td>{j.amount_total===null ? "Não registrado" : `${Number(j.amount_total).toFixed(2)} ${j.currency || ""}`}</td><td>{j.status==="completed" && j.completed_at ? `Confirmado em ${date(j.completed_at)}` : "Sem pagamento confirmado"}</td></tr>)}</tbody></table></div>{!journeys.length && <p className={styles.muted}>Nenhuma jornada vinculada a este email.</p>}</section>
    <div className={styles.twoColumns}><section className={styles.panel}><p className={styles.kicker}>ARQUIVO PERMANENTE</p><h2>Linha do tempo</h2><ol className={styles.crmTimeline}>{page.map(e=><li key={String(e.key)}><time>{date(e.occurred_at || e.observed_at)}</time><strong>{titles[String(e.kind)] || String(e.kind)}</strong><small>{String(e.source)}{e.occurred_at ? "" : " · data da observação"}</small>{e.payload?.campaign && <p>{String(e.payload.campaign)} · etapa {String(e.payload.step)}</p>}{e.payload?.reason && <p>{String(e.payload.reason)}</p>}{e.payload?.url && <p className={styles.crmUrl}>{String(e.payload.url)}</p>}</li>)}</ol>{!page.length && <p className={styles.muted}>Aguardando a primeira sincronização do histórico.</p>}{events.length>50 && <Link href={`/dashboard/contacts/${encodeURIComponent(email)}?${more}`}>Registros anteriores →</Link>}</section>
      <section className={styles.panel}><p className={styles.kicker}>LOJA · DADOS ATUAIS</p><h2>Atividade identificada</h2><ol className={styles.crmTimeline}>{storeEvents.map((e,index)=><li key={index}><time>{date(e.occurred_at)}</time><strong>{e.event_type==="purchase" ? "Sinal de compra na navegação" : String(e.event_type)}</strong><small>{String(e.source || "Loja")} · {String(e.slug || e.path || "")}</small></li>)}</ol>{!storeEvents.length && <p className={styles.muted}>Sem navegação vinculada a este email. Eventos anônimos permanecem sem atribuição.</p>}<p className={styles.muted}>A atividade pode ser vinculada pelo identificador de visitante registrado pela loja. Os pagamentos confirmados estão na seção Commerce.</p></section></div>
  </main>;
}
