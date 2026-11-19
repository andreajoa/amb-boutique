import "server-only";

import {
  customerSafeTrackingText,
  latestTrackingEvent,
  trackingPhase,
  type AmbTrackingEvent,
  type AmbTrackingSnapshot,
} from "./fulfillment-tracking";
import { trackingEventIso, trackingEventTime } from "./tracking-time";

// One description of an order's delivery, rendered by both the tracking page
// and the tracking e-mail, so the customer sees the same thing in both places.

export function phaseCopy(phase: string) {
  if (phase === "DELIVERED") return { label: "DELIVERED", title: "Your order has arrived." };
  if (phase === "OUT_FOR_DELIVERY") return { label: "OUT FOR DELIVERY", title: "Your order is arriving soon." };
  if (phase === "CUSTOMS") return { label: "DELIVERY UPDATE", title: "Your order is moving through the delivery network." };
  if (phase === "IN_TRANSIT") return { label: "IN TRANSIT", title: "Your order is on the way." };
  if (phase === "SHIPPED") return { label: "SHIPPED", title: "Your order has shipped." };
  return { label: "PREPARING", title: "We’re preparing your order." };
}

export type TrackingView = ReturnType<typeof buildTrackingView>;

export function buildTrackingView(snapshot: AmbTrackingSnapshot) {
  // Re-applied at display time so even rows saved by older code stay AMB-only.
  const timeline: AmbTrackingEvent[] = (Array.isArray(snapshot.timeline) ? snapshot.timeline : []).map((event) => ({
    ...event,
    eventDesc: customerSafeTrackingText(event.eventDesc),
    status: customerSafeTrackingText(event.status),
    address: event.address ? customerSafeTrackingText(event.address) : null,
  }));
  const latestEvent = latestTrackingEvent(timeline);
  const phase = trackingPhase({
    fulfillmentStatus: snapshot.fulfillment_status,
    latestEvent,
    timeline,
  });
  const copy = phaseCopy(phase);
  const hasCarrierEvidence = Boolean(snapshot.tracking_code || timeline.length || snapshot.shipped_at);
  const awaitingUpdate = !hasCarrierEvidence;
  // Same order as the AliExpress tracking page: milestone name first
  // ("Collected by carrier"), then the carrier sentence and its time.
  const headline = latestEvent?.status?.trim() || latestEvent?.eventDesc?.trim() ||
    (awaitingUpdate ? "Delivery status currently unavailable." : copy.title);
  const latestDetail = latestEvent?.eventDesc?.trim() && latestEvent.eventDesc.trim() !== headline
    ? latestEvent.eventDesc.trim() : "";
  const events: AmbTrackingEvent[] = timeline.slice().sort((a, b) => {
    const ta = trackingEventTime(a.eventDate);
    const tb = trackingEventTime(b.eventDate);
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });
  const dispatched = Boolean(snapshot.shipped_at ||
    ["SHIPPED", "DELIVERED"].includes(snapshot.fulfillment_status) ||
    ["SHIPPED", "IN_TRANSIT", "CUSTOMS", "OUT_FOR_DELIVERY", "DELIVERED"].includes(phase));

  return {
    phase,
    copy,
    awaitingUpdate,
    statusLabel: awaitingUpdate ? "AWAITING TRACKING UPDATE" : copy.label,
    headline,
    latestEvent,
    latestDetail,
    estimatedDelivery: phase !== "DELIVERED" ? trackingEventIso(snapshot.estimated_delivery_at) : null,
    orderReference: snapshot.session_id.slice(-10).toUpperCase(),
    trackingCode: snapshot.tracking_code,
    deliveryService: "AMB Boutique Delivery",
    items: snapshot.purchasedItems || [],
    progress: [
      { label: "Confirmed", reached: true },
      { label: "Dispatched", reached: dispatched },
      { label: "In transit", reached: ["IN_TRANSIT", "CUSTOMS", "OUT_FOR_DELIVERY", "DELIVERED"].includes(phase) },
      { label: "Delivered", reached: phase === "DELIVERED" },
    ],
    events,
  };
}
