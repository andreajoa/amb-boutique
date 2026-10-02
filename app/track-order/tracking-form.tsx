"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type TrackingResponse = {
  ok: true;
  order: string;
  status: string;
  statusLabel: string;
  trackingCode: string | null;
  currentLocation: string | null;
  latestDescription: string;
  estimatedDelivery: string | null;
  updatedAt: string;
  events: Array<{
    status: string;
    statusLabel: string;
    description: string;
    location: string | null;
    eventAt: string | null;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function progress(status: string) {
  if (status === "DELIVERED") return 100;
  if (status === "OUT_FOR_DELIVERY") return 86;
  if (status === "IN_TRANSIT") return 62;
  if (status === "SHIPPED") return 36;
  if (status === "EXCEPTION") return 62;
  return 14;
}

export function TrackingForm({
  initialOrder = "",
  token = "",
}: {
  initialOrder?: string;
  token?: string;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [email, setEmail] = useState("");
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = async (withToken = false) => {
    const trimmedOrder = order.trim();
    if (!trimmedOrder) {
      setError("Enter your order number.");
      return;
    }
    if (!withToken && !email.trim()) {
      setError("Enter the email used at checkout.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ order: trimmedOrder });
      if (withToken && token) params.set("token", token);
      else params.set("email", email.trim());
      const response = await fetch(`/api/tracking?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "We couldn’t find this order.");
      setData(payload as TrackingResponse);
    } catch (lookupError) {
      setData(null);
      setError(lookupError instanceof Error ? lookupError.message : "We couldn’t find this order.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialOrder && token) {
      void lookup(true);
    }
    // Token links intentionally load once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = useMemo(() => data ? progress(data.status) : 0, [data]);

  function submit(event: FormEvent) {
    event.preventDefault();
    void lookup(false);
  }

  return (
    <div style={{ width: "min(820px, calc(100% - 32px))", margin: "0 auto" }}>
      {!data && (
        <form onSubmit={submit} style={{
          marginTop: 32,
          padding: "clamp(24px, 5vw, 44px)",
          border: "1px solid #ded8cf",
          background: "#fffefc",
        }}>
          <label style={{ display: "block", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
            Order number
          </label>
          <input
            value={order}
            onChange={(event) => setOrder(event.target.value.toUpperCase())}
            placeholder="Example: 3VTGBXIJUB"
            autoComplete="off"
            style={{ width: "100%", height: 50, border: "1px solid #cfc5b8", padding: "0 14px", background: "white" }}
          />
          <label style={{ display: "block", fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 700, margin: "22px 0 8px" }}>
            Email used at checkout
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            style={{ width: "100%", height: 50, border: "1px solid #cfc5b8", padding: "0 14px", background: "white" }}
          />
          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              minHeight: 50,
              marginTop: 24,
              border: 0,
              background: "#171512",
              color: "white",
              textTransform: "uppercase",
              letterSpacing: ".12em",
              fontSize: 10,
              fontWeight: 700,
              opacity: busy ? .6 : 1,
            }}
          >
            {busy ? "Checking…" : "Track my order"}
          </button>
          {error && <p style={{ margin: "16px 0 0", color: "#9c3f32", lineHeight: 1.6 }}>{error}</p>}
        </form>
      )}

      {data && (
        <section style={{ marginTop: 32 }}>
          <div style={{ border: "1px solid #ded8cf", background: "#fffefc", padding: "clamp(24px, 5vw, 44px)" }}>
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: 0, color: "#a64b2a", fontSize: 10, letterSpacing: ".18em", fontWeight: 700 }}>AMB BOUTIQUE DELIVERY</p>
                <h2 style={{ margin: "10px 0 5px", fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 500, fontSize: "clamp(30px, 5vw, 44px)" }}>
                  {data.statusLabel}
                </h2>
                <p style={{ margin: 0, color: "#6b655e" }}>Order {data.order}</p>
              </div>
              <span style={{ border: "1px solid #d7c8b8", padding: "9px 13px", fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700 }}>
                {data.statusLabel}
              </span>
            </div>

            <div style={{ marginTop: 30, height: 5, background: "#e9e0d5", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "#171512", transition: "width .4s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 9, color: "#746b63", textTransform: "uppercase", letterSpacing: ".08em" }}>
              <span>Preparing</span><span>In transit</span><span>Delivery</span>
            </div>

            <p style={{ margin: "28px 0 0", fontSize: 16, lineHeight: 1.75 }}>{data.latestDescription}</p>
            {data.currentLocation && (
              <div style={{ marginTop: 22, padding: 18, background: "#f5efe5" }}>
                <strong style={{ display: "block", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 7 }}>Current location</strong>
                <span>{data.currentLocation}</span>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginTop: 24 }}>
              {data.trackingCode && <div><small style={{ color: "#6b655e" }}>Tracking code</small><div style={{ marginTop: 5, fontWeight: 700 }}>{data.trackingCode}</div></div>}
              {data.estimatedDelivery && <div><small style={{ color: "#6b655e" }}>Estimated delivery</small><div style={{ marginTop: 5, fontWeight: 700 }}>{data.estimatedDelivery}</div></div>}
              <div><small style={{ color: "#6b655e" }}>Last updated</small><div style={{ marginTop: 5, fontWeight: 700 }}>{formatDate(data.updatedAt)}</div></div>
            </div>
          </div>

          <div style={{ marginTop: 22, border: "1px solid #ded8cf", background: "#fffefc", padding: "clamp(24px, 5vw, 40px)" }}>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: ".17em", color: "#a64b2a", fontWeight: 700 }}>DELIVERY TIMELINE</p>
            <h3 style={{ margin: "9px 0 28px", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 30, fontWeight: 500 }}>Your order’s journey</h3>

            {data.events.length === 0 ? (
              <p style={{ color: "#6b655e", lineHeight: 1.7 }}>Your order is being prepared. The timeline will update automatically as soon as movement begins.</p>
            ) : (
              <div>
                {data.events.map((event, index) => (
                  <article key={`${event.eventAt || "event"}-${index}`} style={{
                    display: "grid",
                    gridTemplateColumns: "18px 1fr",
                    gap: 16,
                    paddingBottom: index === data.events.length - 1 ? 0 : 28,
                  }}>
                    <div style={{ position: "relative" }}>
                      <span style={{ display: "block", width: 10, height: 10, margin: "5px 0 0 4px", borderRadius: "50%", background: index === 0 ? "#171512" : "#bca995" }} />
                      {index !== data.events.length - 1 && <span style={{ position: "absolute", left: 8, top: 17, bottom: -24, width: 1, background: "#ded8cf" }} />}
                    </div>
                    <div>
                      <strong>{event.statusLabel}</strong>
                      <p style={{ margin: "6px 0 0", lineHeight: 1.65 }}>{event.description}</p>
                      {event.location && <p style={{ margin: "5px 0 0", color: "#6b655e" }}>{event.location}</p>}
                      {event.eventAt && <small style={{ display: "block", marginTop: 7, color: "#8a817a" }}>{formatDate(event.eventAt)}</small>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {!token && (
            <button type="button" onClick={() => { setData(null); setError(""); }} style={{
              margin: "20px 0 0",
              border: 0,
              padding: 0,
              background: "transparent",
              textDecoration: "underline",
              fontSize: 12,
            }}>
              Track another order
            </button>
          )}
        </section>
      )}
    </div>
  );
}
