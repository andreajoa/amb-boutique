import type { Metadata } from "next";
import Link from "next/link";
import { Footer, Header } from "../components";
import {
  trackingLookupByEmailAndReference,
  trackingLookupByToken,
} from "../fulfillment-tracking";
import { trackingEventIso } from "../tracking-time";
import { buildTrackingView } from "../tracking-view";
import { LocalTime } from "./local-time";

export const metadata: Metadata = {
  title: "Track Your Order",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    token?: string;
    email?: string;
    order?: string;
  }>;
};

function EventTime({ value }: { value: string | null }) {
  const iso = trackingEventIso(value);
  if (iso) return <LocalTime iso={iso} />;
  return value ? <>{value}</> : null;
}

export default async function TrackOrderPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.token?.trim() || "";
  const email = params.email?.trim() || "";
  const order = params.order?.trim() || "";

  const snapshot = token
    ? await trackingLookupByToken(token)
    : email && order
      ? await trackingLookupByEmailAndReference(email, order)
      : null;

  const attempted = Boolean(token || (email && order));
  const view = snapshot ? buildTrackingView(snapshot) : null;

  return (
    <main>
      <Header />
      <section style={{ background: "#f5efe5", minHeight: "72vh", padding: "56px 20px 80px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <p style={{ fontSize: 11, letterSpacing: ".18em", fontWeight: 700, color: "#9a755c", margin: 0 }}>
            AMB BOUTIQUE DELIVERY
          </p>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(36px,6vw,58px)", fontWeight: 500, margin: "12px 0 12px" }}>
            Track your order
          </h1>
          <p style={{ maxWidth: 620, lineHeight: 1.7, color: "#5c554e", margin: "0 0 30px" }}>
            Follow your AMB order from preparation through delivery. We update this page as new delivery information becomes available.
          </p>

          {!token && !snapshot && (
            <form method="get" action="/track-order" style={{ background: "#fffefc", border: "1px solid #dfd5ca", padding: 28, display: "grid", gap: 16 }}>
              <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 700 }}>
                EMAIL USED AT CHECKOUT
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={email}
                  placeholder="you@example.com"
                  style={{ border: "1px solid #cfc4b8", background: "#fff", padding: "13px 14px", fontSize: 14 }}
                />
              </label>
              <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 700 }}>
                ORDER REFERENCE
                <input
                  name="order"
                  type="text"
                  required
                  defaultValue={order}
                  placeholder="Example: AMB1234567"
                  style={{ border: "1px solid #cfc4b8", background: "#fff", padding: "13px 14px", fontSize: 14, textTransform: "uppercase" }}
                />
              </label>
              <button
                type="submit"
                style={{ border: 0, background: "#171512", color: "#fff", padding: "14px 20px", fontSize: 12, letterSpacing: ".08em", fontWeight: 700, cursor: "pointer" }}
              >
                TRACK MY ORDER
              </button>
            </form>
          )}

          {attempted && !snapshot && (
            <div style={{ background: "#fffefc", border: "1px solid #dfd5ca", padding: 28 }}>
              <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 500, marginTop: 0 }}>
                We couldn’t find that order.
              </h2>
              <p style={{ lineHeight: 1.7, color: "#5c554e" }}>
                Check the order reference and the email used during checkout. If you still need help, contact info@ambboutique.online.
              </p>
              <Link href="/track-order" style={{ color: "#171512", fontWeight: 700 }}>Try again</Link>
            </div>
          )}

          {snapshot && view && (
            <div style={{ display: "grid", gap: 20 }}>
              {Boolean(view.items.length) && (
                <section style={{ background: "#fffefc", border: "1px solid #dfd5ca", padding: 28 }}>
                  <h2 style={{ fontSize: 12, letterSpacing: ".14em", margin: "0 0 20px" }}>ITEMS IN YOUR ORDER</h2>
                  <div style={{ display: "grid", gap: 18 }}>
                    {view.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                        {item.image ? <img src={item.image} alt={item.name} width={108} height={135} style={{ width: 108, height: 135, objectFit: "contain", background: "#f5efe5" }}/> :
                          <div style={{ width: 108, height: 135, background: "#f5efe5", display: "grid", placeItems: "center", fontSize: 11, color: "#796d63" }}>Image unavailable</div>}
                        <div style={{ flex: 1, minWidth: 140, lineHeight: 1.8 }}>
                          <strong style={{ fontFamily: "Georgia,serif", fontSize: 20 }}>{item.name}</strong>
                          {item.color && <div>Color: {item.color}</div>}
                          {item.size && <div>Size: {item.size}</div>}
                          <div>Quantity: {item.quantity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <div style={{ background: "#fffefc", border: "1px solid #dfd5ca", padding: 30 }}>
                <div style={{ fontSize: 11, letterSpacing: ".16em", fontWeight: 700, color: "#9a755c" }}>{view.statusLabel}</div>
                <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 32, fontWeight: 500, margin: "10px 0 12px" }}>
                  {view.headline}
                </h2>
                {view.latestEvent && (view.latestDetail || view.latestEvent.eventDate) && (
                  <p style={{ margin: "0 0 16px", lineHeight: 1.6, color: "#3f3a35" }}>
                    {view.latestDetail}
                    {view.latestDetail && view.latestEvent.eventDate ? " · " : ""}
                    {view.latestEvent.eventDate && <span style={{ color: "#756d65", fontSize: 13 }}><EventTime value={view.latestEvent.eventDate} /></span>}
                  </p>
                )}
                {view.estimatedDelivery && (
                  <p style={{ margin: "0 0 16px", fontSize: 14, color: "#171512" }}>
                    Estimated delivery: <strong>by <LocalTime iso={view.estimatedDelivery} dateOnly /></strong>
                  </p>
                )}
                <div style={{ display: "grid", gap: 6, fontSize: 13, color: "#5c554e" }}>
                  <div>Order reference: <strong>{view.orderReference}</strong></div>
                  {view.trackingCode && <div>Tracking code: <strong>{view.trackingCode}</strong></div>}
                  <div>Delivery service: <strong>{view.deliveryService}</strong></div>
                </div>
              </div>

              <div style={{ background: "#fffefc", border: "1px solid #dfd5ca", padding: "28px 30px" }}>
                <div style={{ fontSize: 11, letterSpacing: ".15em", fontWeight: 700, marginBottom: 20 }}>DELIVERY PROGRESS</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
                  {view.progress.map((step) => (
                    <div key={step.label} style={{ minWidth: 0 }}>
                      <div style={{ height: 5, borderRadius: 8, background: step.reached ? "#9a755c" : "#e8dfd5", marginBottom: 10 }} />
                      <span style={{ color: step.reached ? "#171512" : "#867e75", fontSize: 11, fontWeight: step.reached ? 700 : 400, overflowWrap: "anywhere" }}>{step.label}</span>
                    </div>
                  ))}
                </div>
                {view.trackingCode && <p style={{ margin: "18px 0 0", fontSize: 12, color: "#5c554e", overflowWrap: "anywhere" }}>
                  Tracking number: <strong>{view.trackingCode}</strong>
                </p>}
              </div>

              <div style={{ background: "#fffefc", border: "1px solid #dfd5ca", padding: 30 }}>
                <div style={{ fontSize: 11, letterSpacing: ".16em", fontWeight: 700, marginBottom: 18 }}>DELIVERY JOURNEY</div>
                {view.events.length ? (
                  <div>
                    {view.events.map((event, index) => (
                      <div key={`${event.eventDate || "event"}-${index}`} style={{ padding: "16px 0", borderTop: index ? "1px solid #e7dfd6" : "none" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          <span aria-hidden="true" style={{ width: 10, height: 10, background: index === 0 ? "#9a755c" : "#d5c9bb", borderRadius: "50%", flexShrink: 0, marginTop: 5 }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            {event.status && event.status !== event.eventDesc && (
                              <div style={{ fontSize: 10, letterSpacing: ".12em", fontWeight: 700, color: "#9a755c", marginBottom: 4, textTransform: "uppercase" }}>{event.status}</div>
                            )}
                            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.45 }}>{event.eventDesc || event.status || "Delivery update"}</div>
                            {event.address && <div style={{ marginTop: 5, color: "#5c554e", fontSize: 13 }}>{event.address}</div>}
                            {event.eventDate && <div style={{ marginTop: 5, color: "#827a72", fontSize: 12 }}><EventTime value={event.eventDate} /></div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, lineHeight: 1.7, color: "#5c554e" }}>
                    Tracking events are not available from the delivery network right now. Your purchase is confirmed, but we cannot verify its current shipping stage yet. Please check again later or contact our support team.
                  </p>
                )}
              </div>

              <p style={{ fontSize: 12, lineHeight: 1.7, color: "#6b655e", margin: 0 }}>
                We monitor active AMB deliveries automatically and update this page when new tracking information becomes available.
              </p>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
