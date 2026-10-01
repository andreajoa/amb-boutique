import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { dashboardAuthenticated } from "./auth";
import { getAnalyticsSql } from "../analytics/db";
import { allCampaigns, cartRecoveryCampaigns, checkoutRecoveryCampaigns, newsletterCampaigns } from "../email/campaigns";
import { DashboardAutoRefresh } from "./dashboard-auto-refresh";
import { getDashboardOrders, type DashboardAddress, type DashboardOrder } from "./orders";
import styles from "./dashboard.module.css";

export const metadata: Metadata = { title: "Commerce Intelligence", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Row = Record<string, string | number | null>;
const n = (value: unknown) => Number(value || 0);
const pct = (value: number) => `${value.toFixed(1)}%`;
const label = (value: unknown) => String(value || "Direct / unknown");

function insight(metrics: Row, email: Row) {
  const sessions = n(metrics.sessions);
  const cartRate = sessions ? n(metrics.cart_sessions) / sessions * 100 : 0;
  const checkoutRate = sessions ? n(metrics.checkout_sessions) / sessions * 100 : 0;
  const purchaseRate = sessions ? n(metrics.purchase_sessions) / sessions * 100 : 0;
  const delivered = n(email.delivered);
  const openRate = delivered ? n(email.opened) / delivered * 100 : 0;
  const clickRate = delivered ? n(email.clicked) / delivered * 100 : 0;
  if (delivered > 25 && openRate < 20) return "Subject/sender opportunity: opens are low. Test the promise, specificity and preview text before changing the body.";
  if (delivered > 25 && openRate >= 20 && clickRate < 2) return "Body/CTA opportunity: people open but do not click. Tighten the value, proof and single next step.";
  if (checkoutRate > 0 && purchaseRate < checkoutRate * .35) return "Checkout friction: intent is present but payment completion is weak. Review failures, delivery cost and payment options.";
  if (cartRate > 0 && checkoutRate < cartRate * .4) return "Bag-to-checkout friction: strengthen fit confidence, delivery clarity and the value of completing now.";
  if (!sessions) return "Data collection is ready. Insights will become evidence-based as consented sessions arrive.";
  return "Healthy baseline: keep useful content ahead of promotion, then test one offer or CTA variable at a time.";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  if (!await dashboardAuthenticated()) redirect("/dashboard/login");
  const { range = "30d" } = await searchParams;
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const sql = getAnalyticsSql();

  if (!sql) return <main className={styles.dashboard}><Setup/></main>;

  const ordersPromise = getDashboardOrders(days);
  const [metricsRows, funnelRows, sourceRows, countryRows, productRows, emailRows, emailCampaignRows, journeyRows, recentRows] = await Promise.all([
    sql`
      SELECT
        count(*) AS sessions,
        count(DISTINCT visitor_id) AS visitors,
        COALESCE(sum(pageviews),0) AS pageviews,
        COALESCE(avg(NULLIF(duration_seconds,0)),0) AS avg_duration,
        count(*) FILTER (WHERE last_activity_at > now() - interval '5 minutes') AS active_now,
        count(*) FILTER (WHERE added_to_cart) AS cart_sessions,
        count(*) FILTER (WHERE started_checkout) AS checkout_sessions,
        count(*) FILTER (WHERE purchased) AS purchase_sessions,
        count(*) FILTER (WHERE pageviews <= 1 AND duration_seconds < 15) AS bounced
      FROM amb_analytics_sessions WHERE started_at >= now() - (${days} * interval '1 day')
    `,
    sql`
      SELECT event_type, count(DISTINCT visitor_id) AS people
      FROM amb_analytics_events
      WHERE occurred_at >= now() - (${days} * interval '1 day') AND event_type IN ('product_view','add_to_cart','checkout_start','purchase')
      GROUP BY event_type
    `,
    sql`
      SELECT COALESCE(NULLIF(utm_source,''), NULLIF(referrer,''), 'Direct') AS source, count(*) AS sessions
      FROM amb_analytics_sessions WHERE started_at >= now() - (${days} * interval '1 day')
      GROUP BY 1 ORDER BY sessions DESC LIMIT 8
    `,
    sql`
      SELECT COALESCE(country,'Unknown') AS country, count(*) AS sessions
      FROM amb_analytics_sessions WHERE started_at >= now() - (${days} * interval '1 day')
      GROUP BY 1 ORDER BY sessions DESC LIMIT 8
    `,
    sql`
      SELECT slug,
        count(*) FILTER (WHERE event_type='product_view') AS views,
        count(*) FILTER (WHERE event_type='add_to_cart') AS carts,
        count(*) FILTER (WHERE event_type='purchase') AS purchases
      FROM amb_analytics_events
      WHERE occurred_at >= now() - (${days} * interval '1 day') AND slug IS NOT NULL
      GROUP BY slug ORDER BY views DESC LIMIT 10
    `,
    sql`
      SELECT
        count(*) FILTER (WHERE status IN ('sent','delivered','opened','clicked')) AS sent,
        count(*) FILTER (WHERE delivered_at IS NOT NULL) AS delivered,
        count(*) FILTER (WHERE opened_at IS NOT NULL) AS opened,
        count(*) FILTER (WHERE clicked_at IS NOT NULL) AS clicked,
        count(*) FILTER (WHERE bounced_at IS NOT NULL) AS bounced,
        count(*) FILTER (WHERE complained_at IS NOT NULL) AS complained,
        count(*) FILTER (WHERE conversion_at IS NOT NULL) AS converted
      FROM amb_email_messages WHERE created_at >= now() - (${days} * interval '1 day')
    `,
    sql`
      SELECT campaign_key, subject_variant,
        count(*) FILTER (WHERE delivered_at IS NOT NULL) AS delivered,
        count(*) FILTER (WHERE opened_at IS NOT NULL) AS opened,
        count(*) FILTER (WHERE clicked_at IS NOT NULL) AS clicked,
        count(*) FILTER (WHERE conversion_at IS NOT NULL) AS converted
      FROM amb_email_messages
      WHERE created_at >= now() - (${days} * interval '1 day')
      GROUP BY campaign_key, subject_variant
      ORDER BY campaign_key, subject_variant
    `,
    sql`
      SELECT status, count(*) AS journeys, COALESCE(sum(amount_total),0) AS value
      FROM amb_commerce_journeys WHERE updated_at >= now() - (${days} * interval '1 day')
      GROUP BY status ORDER BY journeys DESC
    `,
    sql`
      SELECT session_id, visitor_id, entry_path, exit_path, country, city, device_type,
        pageviews, click_count, max_scroll, duration_seconds, last_activity_at,
        added_to_cart, started_checkout, purchased
      FROM amb_analytics_sessions
      WHERE started_at >= now() - (${days} * interval '1 day')
      ORDER BY last_activity_at DESC LIMIT 12
    `,
  ]) as Array<Array<Row>>;
  const orderResult = await ordersPromise;

  const metrics = metricsRows[0] || {};
  const email = emailRows[0] || {};
  const sessions = n(metrics.sessions);
  const funnel = Object.fromEntries(funnelRows.map((row) => [String(row.event_type), n(row.people)]));
  const bounceRate = sessions ? n(metrics.bounced) / sessions * 100 : 0;
  const conversionRate = sessions ? n(metrics.purchase_sessions) / sessions * 100 : 0;
  const openRate = n(email.delivered) ? n(email.opened) / n(email.delivered) * 100 : 0;
  const clickRate = n(email.delivered) ? n(email.clicked) / n(email.delivered) * 100 : 0;

  return <main className={styles.dashboard}>
    <header className={styles.header}>
      <div><p className={styles.kicker}>AMB BOUTIQUE · PRIVATE</p><h1>Commerce Intelligence</h1><p>Sales, fulfillment and customer journey in one private operational view.</p></div>
      <div className={styles.headerActions}>
        <nav>{["7d","30d","90d"].map((item) => <Link key={item} className={range === item ? styles.activeRange : ""} href={`/dashboard?range=${item}`}>{item}</Link>)}</nav>
        <form action="/api/dashboard/logout" method="post"><button>Sign out</button></form>
      </div>
    </header>

    <section className={styles.statusStrip}>
      <span><i className={styles.liveDot}/> {n(metrics.active_now)} active now</span>
      <span>{n(metrics.visitors)} consented visitors</span>
      <span>{allCampaigns.length} email journeys drafted</span>
      <span>Range: last {days} days</span>
      <DashboardAutoRefresh/>
    </section>

    <section className={styles.metricGrid}>
      <Metric label="Visitors" value={n(metrics.visitors).toLocaleString()} note={`${n(metrics.pageviews).toLocaleString()} page views`}/>
      <Metric label="Sessions" value={sessions.toLocaleString()} note={`${Math.round(n(metrics.avg_duration))}s average attention`}/>
      <Metric label="Bounce" value={pct(bounceRate)} note="Single-page, under 15 seconds"/>
      <Metric label="Purchase conversion" value={pct(conversionRate)} note={`${n(metrics.purchase_sessions)} purchasing sessions`}/>
      <Metric label="Email open rate" value={pct(openRate)} note={`${n(email.opened)} unique message opens`}/>
      <Metric label="Email click rate" value={pct(clickRate)} note={`${n(email.clicked)} clicked messages`}/>
    </section>

    <section className={styles.insight}>
      <div><p className={styles.kicker}>NEXT BEST ACTION</p><h2>What the data is saying</h2></div>
      <p>{insight(metrics, email)}</p>
    </section>

    <OrdersPanel orders={orderResult.orders} error={orderResult.error}/>

    <div className={styles.twoColumns}>
      <section className={styles.panel}>
        <PanelTitle eyebrow="FUNNEL" title="Where intent becomes revenue"/>
        <Funnel label="Product view" value={funnel.product_view || 0} max={funnel.product_view || 1}/>
        <Funnel label="Added to bag" value={funnel.add_to_cart || 0} max={funnel.product_view || 1}/>
        <Funnel label="Checkout started" value={funnel.checkout_start || 0} max={funnel.product_view || 1}/>
        <Funnel label="Purchased" value={funnel.purchase || 0} max={funnel.product_view || 1}/>
      </section>
      <section className={styles.panel}>
        <PanelTitle eyebrow="LIFECYCLE" title="Recovery and content engine"/>
        <div className={styles.sequenceGrid}>
          <Link href="/dashboard/email-preview?campaign=cart-01"><strong>{cartRecoveryCampaigns.length}</strong><span>Cart recovery emails</span></Link>
          <Link href="/dashboard/email-preview?campaign=checkout-01"><strong>{checkoutRecoveryCampaigns.length}</strong><span>Checkout recovery emails</span></Link>
          <Link href="/dashboard/email-preview?campaign=brand-01"><strong>{newsletterCampaigns.length}</strong><span>Newsletter campaigns</span></Link>
        </div>
        <p className={styles.muted}>Delivery remains in review mode until EMAIL_AUTOMATION_ENABLED=true and the Resend sending domain/webhook are verified.</p>
      </section>
    </div>

    <div className={styles.threeColumns}>
      <Ranking title="Acquisition sources" rows={sourceRows} labelKey="source" valueKey="sessions"/>
      <Ranking title="Countries" rows={countryRows} labelKey="country" valueKey="sessions"/>
      <section className={styles.panel}><PanelTitle eyebrow="EMAIL HEALTH" title="Deliverability"/>
        <dl className={styles.compactStats}>
          <div><dt>Delivered</dt><dd>{n(email.delivered)}</dd></div>
          <div><dt>Bounced</dt><dd>{n(email.bounced)}</dd></div>
          <div><dt>Complaints</dt><dd>{n(email.complained)}</dd></div>
          <div><dt>Conversions</dt><dd>{n(email.converted)}</dd></div>
        </dl>
      </section>
    </div>

    <section className={styles.panel}>
      <PanelTitle eyebrow="PRODUCT INTELLIGENCE" title="What shoppers consider"/>
      <div className={styles.tableWrap}><table><thead><tr><th>Product</th><th>Views</th><th>Bag adds</th><th>Purchases</th><th>Bag rate</th></tr></thead>
      <tbody>{productRows.length ? productRows.map((row) => <tr key={label(row.slug)}><td>{label(row.slug).replaceAll("-"," ")}</td><td>{n(row.views)}</td><td>{n(row.carts)}</td><td>{n(row.purchases)}</td><td>{pct(n(row.views) ? n(row.carts)/n(row.views)*100 : 0)}</td></tr>) : <tr><td colSpan={5}>Product behavior will appear after consented visits.</td></tr>}</tbody></table></div>
    </section>

    <section className={styles.panel}>
      <PanelTitle eyebrow="EXPERIMENTS" title="Which message earns the next step"/>
      <p className={styles.bodyCopy}>Subject variants are assigned consistently per shopper. Compare opens first, then clicks and purchases before changing the email body or offer.</p>
      <div className={styles.tableWrap}><table><thead><tr><th>Campaign</th><th>Subject</th><th>Delivered</th><th>Open rate</th><th>Click rate</th><th>Purchases</th></tr></thead>
      <tbody>{emailCampaignRows.length ? emailCampaignRows.map((row) => <tr key={`${label(row.campaign_key)}-${label(row.subject_variant)}`}><td>{label(row.campaign_key)}</td><td>{label(row.subject_variant)}</td><td>{n(row.delivered)}</td><td>{pct(n(row.delivered) ? n(row.opened)/n(row.delivered)*100 : 0)}</td><td>{pct(n(row.delivered) ? n(row.clicked)/n(row.delivered)*100 : 0)}</td><td>{n(row.converted)}</td></tr>) : <tr><td colSpan={6}>Campaign experiments will appear after delivery is enabled.</td></tr>}</tbody></table></div>
    </section>

    <div className={styles.twoColumns}>
      <section className={styles.panel}><PanelTitle eyebrow="COMMERCE" title="Journey status"/>
        <dl className={styles.compactStats}>{journeyRows.length ? journeyRows.map((row) => <div key={label(row.status)}><dt>{label(row.status)}</dt><dd>{n(row.journeys)}</dd></div>) : <div><dt>No journeys yet</dt><dd>0</dd></div>}</dl>
      </section>
      <section className={styles.panel}><PanelTitle eyebrow="DATA CONTROL" title="Where customer data lives"/>
        <p className={styles.bodyCopy}><strong>Stripe:</strong> payment status, customer identity, billing and shipping address, order totals and payment references. <strong>AMB database:</strong> cart/variant snapshot, email and phone contact, checkout journey, campaign activity and analytics. Full card numbers and security codes are never exposed to or stored by the AMB dashboard.</p>
      </section>
    </div>

    <section className={styles.panel}>
      <PanelTitle eyebrow="RECENT JOURNEYS" title="What is happening now"/>
      <div className={styles.tableWrap}><table><thead><tr><th>Visitor</th><th>Entry → Exit</th><th>Location</th><th>Device</th><th>Pages</th><th>Clicks</th><th>Scroll</th><th>Stage</th></tr></thead>
      <tbody>{recentRows.length ? recentRows.map((row) => <tr key={label(row.session_id)}><td>{label(row.visitor_id).slice(0,12)}…</td><td>{label(row.entry_path)} → {label(row.exit_path)}</td><td>{[row.city,row.country].filter(Boolean).join(", ") || "Unknown"}</td><td>{label(row.device_type)}</td><td>{n(row.pageviews)}</td><td>{n(row.click_count)}</td><td>{n(row.max_scroll)}%</td><td>{row.purchased ? "Purchased" : row.started_checkout ? "Checkout" : row.added_to_cart ? "Bag" : "Browsing"}</td></tr>) : <tr><td colSpan={8}>No consented journeys in this period.</td></tr>}</tbody></table></div>
    </section>
  </main>;
}


function money(amount: number | null, currency: string) {
  if (amount === null) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}

function orderTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(timestamp);
}

function addressLines(address: DashboardAddress | null) {
  if (!address) return ["Address unavailable"];
  const cityLine = [
    [address.city, address.state].filter(Boolean).join(", "),
    address.postalCode,
  ].filter(Boolean).join(" ");
  return [
    address.name,
    address.line1,
    address.line2,
    cityLine,
    address.country,
  ].filter((value): value is string => Boolean(value));
}

function OrdersPanel({ orders, error }: { orders: DashboardOrder[]; error: string | null }) {
  const unfulfilled = orders.filter((order) => order.fulfillmentStatus !== "fulfilled").length;
  const latest = orders[0];

  return <section className={`${styles.panel} ${styles.ordersPanel}`}>
    <PanelTitle eyebrow="ORDERS / FULFILLMENT" title="Paid orders and shipping details"/>
    <div className={styles.orderSummaryGrid}>
      <div><span>Paid orders</span><strong>{orders.length}</strong><small>In the selected dashboard range</small></div>
      <div><span>Awaiting fulfillment</span><strong>{unfulfilled}</strong><small>Orders not marked fulfilled</small></div>
      <div><span>Latest sale</span><strong>{latest ? latest.orderReference : "—"}</strong><small>{latest ? orderTime(latest.createdAt) : "No paid sale in this range"}</small></div>
    </div>
    {error ? <p className={styles.orderError}>{error}</p> : null}
    <p className={styles.bodyCopy}>Open an order to see the exact product, selected variant, customer contact and delivery information needed for fulfillment. This section reads current paid checkout data directly from Stripe and refreshes automatically.</p>
    <div className={styles.orderList}>
      {orders.length ? orders.map((order, index) => <details className={styles.orderCard} key={order.sessionId} open={index === 0}>
        <summary>
          <div>
            <span className={styles.orderRef}>ORDER {order.orderReference}</span>
            <strong>{order.customerName || order.email || "Customer"}</strong>
            <small>{orderTime(order.createdAt)} · {order.items.length} line item{order.items.length === 1 ? "" : "s"}</small>
          </div>
          <div className={styles.orderSummaryRight}>
            <strong>{money(order.total, order.currency)}</strong>
            <span className={order.fulfillmentStatus === "fulfilled" ? styles.statusDone : styles.statusPending}>{order.fulfillmentStatus}</span>
          </div>
        </summary>
        <div className={styles.orderDetailGrid}>
          <section>
            <h3>Items purchased</h3>
            <div className={styles.tableWrap}><table><thead><tr><th>Product</th><th>Variant</th><th>Qty</th><th>Total</th></tr></thead>
              <tbody>{order.items.map((item, itemIndex) => <tr key={`${order.sessionId}-${item.slug || item.name}-${itemIndex}`}>
                <td><strong>{item.name}</strong>{item.slug ? <small className={styles.blockSmall}>{item.slug}</small> : null}</td>
                <td>
                  <span className={styles.variantLine}>Size: <strong>{item.size || "—"}</strong></span>
                  <span className={styles.variantLine}>Color: <strong>{item.color || "—"}</strong></span>
                  {item.heelHeightCm ? <span className={styles.variantLine}>Heel: <strong>{item.heelHeightCm} cm</strong></span> : null}
                  {item.offer && item.offer !== "standard" ? <span className={styles.variantLine}>Offer: <strong>{item.offer}</strong></span> : null}
                </td>
                <td>{item.quantity}</td>
                <td>{money(item.amountTotal, item.currency)}</td>
              </tr>)}</tbody>
            </table></div>
          </section>
          <section className={styles.fulfillmentCard}>
            <h3>Ship to</h3>
            <address>{addressLines(order.shippingAddress).map((line) => <span key={line}>{line}</span>)}</address>
            <dl>
              <div><dt>Email</dt><dd>{order.email || "—"}</dd></div>
              <div><dt>Phone</dt><dd>{order.phone || "—"}</dd></div>
              <div><dt>Market</dt><dd>{order.market}</dd></div>
            </dl>
          </section>
          <section className={styles.fulfillmentCard}>
            <h3>Billing / payment</h3>
            <address>{addressLines(order.billingAddress).map((line) => <span key={line}>{line}</span>)}</address>
            <dl>
              <div><dt>Payment</dt><dd>{order.paymentStatus}</dd></div>
              <div><dt>Subtotal</dt><dd>{money(order.subtotal, order.currency)}</dd></div>
              <div><dt>Shipping</dt><dd>{money(order.shipping, order.currency)}</dd></div>
              <div><dt>Tax</dt><dd>{money(order.tax, order.currency)}</dd></div>
              <div><dt>Discount</dt><dd>{money(order.discount, order.currency)}</dd></div>
              <div><dt>Total</dt><dd><strong>{money(order.total, order.currency)}</strong></dd></div>
            </dl>
          </section>
          <section className={styles.fulfillmentCard}>
            <h3>Order control</h3>
            <dl>
              <div><dt>Stripe session</dt><dd className={styles.codeValue}>{order.sessionId}</dd></div>
              <div><dt>Payment intent</dt><dd className={styles.codeValue}>{order.paymentIntentId || "—"}</dd></div>
              <div><dt>Stripe customer</dt><dd className={styles.codeValue}>{order.customerId || "—"}</dd></div>
              <div><dt>Order note</dt><dd>{order.orderNote || "No note"}</dd></div>
            </dl>
          </section>
        </div>
      </details>) : <p className={styles.muted}>No paid AMB orders were found in this range.</p>}
    </div>
  </section>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className={styles.metric}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className={styles.panelTitle}><p className={styles.kicker}>{eyebrow}</p><h2>{title}</h2></div>;
}
function Funnel({ label: name, value, max }: { label: string; value: number; max: number }) {
  return <div className={styles.funnel}><div><span>{name}</span><strong>{value}</strong></div><i><b style={{ width: `${Math.max(value ? 5 : 0, value/max*100)}%` }}/></i></div>;
}
function Ranking({ title, rows, labelKey, valueKey }: { title: string; rows: Row[]; labelKey: string; valueKey: string }) {
  const max = Math.max(1, ...rows.map((row) => n(row[valueKey])));
  return <section className={styles.panel}><PanelTitle eyebrow="RANKING" title={title}/>{rows.length ? rows.map((row) => <Funnel key={label(row[labelKey])} label={label(row[labelKey]).slice(0,45)} value={n(row[valueKey])} max={max}/>) : <p className={styles.muted}>Waiting for traffic data.</p>}</section>;
}
function Setup() {
  return <section className={styles.setup}><p className={styles.kicker}>SETUP REQUIRED</p><h1>Connect the existing AMB database</h1><p>Add DATABASE_URL (or AMB_DATABASE_URL) to this Vercel project. The analytics schema is already prepared in the AMB Boutique Inventory database.</p></section>;
}
