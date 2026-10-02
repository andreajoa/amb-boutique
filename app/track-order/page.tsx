import type { Metadata } from "next";
import { Footer, Header } from "../components";
import {
  trackingLookupByEmailAndReference,
  trackingLookupByToken,
  trackingPhase,
  type AmbTrackingEvent,
} from "../fulfillment-tracking";

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

function phaseCopy(phase: string) {
  if (phase === "DELIVERED") return { label: "DELIVERED", title: "Your order has arrived." };
  if (phase === "OUT_FOR_DELIVERY") return { label: "OUT FOR DELIVERY", title: "Your order is arriving soon." };
  if (phase === "CUSTOMS") return { label: "DELIVERY UPDATE", title: "Your order is moving through the delivery network." };
  if (phase === "IN_TRANSIT") return { label: "IN TRANSIT", title: "Your order is on the way." };
  return { label: "PREPARING", title: "We’re preparing your order." };
}

function latestEventFrom(snapshot: Awaited<ReturnType<typeof trackingLookupByToken>>) {
  if (!snapshot?.timeline?.length) return null;
  return snapshot.timeline[snapshot.timeline.length - 1] as AmbTrackingEvent;
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
  const latestEvent = latestEventFrom(snapshot);
  const phase = snapshot
    ? trackingPhase({
        fulfillmentStatus: snapshot.fulfillment_status,
        latestEvent,
      })
    : "PREPARING";
  const copy = phaseCopy(phase);
  const events = snapshot?.timeline?.slice().reverse() || [];

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
                  placeholder="Example: 3VTGBXIJUB"
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
              <a href="/track-order" style={{ color: "#171512", fontWeight: 700 }}>Try again</a>
            </div>
          )}

          {snapshot && (
            <div style={{ display: "grid", gap: 20 }}>
              <div style={{ background: "#fffefc", border: "1px solid #dfd5ca", padding: 30 }}>
                <div style={{ fontSize: 11, letterSpacing: ".16em", fontWeight: 700, color: "#9a755c" }}>{copy.label}</div>
                <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 32, fontWeight: 500, margin: "10px 0 12px" }}>
                  {copy.title}
                </h2>
                <div style={{ display: "grid", gap: 6, fontSize: 13, color: "#5c554e" }}>
                  <div>Order reference: <strong>{snapshot.session_id.slice(-10).toUpperCase()}</strong></div>
                  {snapshot.tracking_code && <div>Tracking code: <strong>{snapshot.tracking_code}</strong></div>}
                  <div>Delivery service: <strong>AMB Boutique Delivery</strong></div>
                </div>
              </div>

              {latestEvent && (
                <div style={{ background: "#efe5d9", padding: 26 }}>
                  <div style={{ fontSize: 10, letterSpacing: ".14em", fontWeight: 700, marginBottom: 10 }}>LATEST UPDATE</div>
                  <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.45 }}>{latestEvent.eventDesc || latestEvent.status || "Delivery update"}</div>
                  {latestEvent.address && <div style={{ marginTop: 8, color: "#5c554e" }}>{latestEvent.address}</div>}
                  {latestEvent.eventDate && <div style={{ marginTop: 6, fontSize: 12, color: "#756d65" }}>{latestEvent.eventDate}</div>}
                </div>
              )}

              <div style={{ background: "#fffefc", border: "1px solid #dfd5ca", padding: 30 }}>
                <div style={{ fontSize: 11, letterSpacing: ".16em", fontWeight: 700, marginBottom: 18 }}>DELIVERY JOURNEY</div>
                {events.length ? (
                  <div>
                    {events.map((event, index) => (
                      <div key={`${event.eventDate || "event"}-${index}`} style={{ padding: "16px 0", borderTop: index ? "1px solid #e7dfd6" : "none" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.45 }}>{event.eventDesc || event.status || "Delivery update"}</div>
                        {event.address && <div style={{ marginTop: 5, color: "#5c554e", fontSize: 13 }}>{event.address}</div>}
                        {event.eventDate && <div style={{ marginTop: 5, color: "#827a72", fontSize: 12 }}>{event.eventDate}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, lineHeight: 1.7, color: "#5c554e" }}>
                    Your order is being prepared. Detailed movement will appear here as soon as the delivery network publishes the first tracking event.
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
