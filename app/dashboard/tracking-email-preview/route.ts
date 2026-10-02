import { NextRequest, NextResponse } from "next/server";
import { dashboardAuthenticated } from "../auth";
import { sendAmbTrackingUpdateEmail } from "../../email/tracking-update";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!await dashboardAuthenticated()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { to?: string; confirm?: boolean } | null;
  if (!body?.confirm || body.to !== "andremuseu@gmail.com") {
    return NextResponse.json({ ok: false, error: "Explicit preview confirmation required." }, { status: 400 });
  }

  const now = Date.now();
  const sent = await sendAmbTrackingUpdateEmail({
    to: body.to,
    firstName: "André",
    sessionId: "cs_test_AMB_TRACKING_PREVIEW_2026",
    phase: "IN_TRANSIT",
    trackingCode: "AMB-DEMO-TRACKING",
    latestEvent: {
      eventDesc: "Your package is in transit and moving toward the destination.",
      status: "IN_TRANSIT",
      address: "United States",
      eventDate: new Date(now).toISOString(),
    },
    timeline: [
      {
        eventDesc: "Shipment information received.",
        status: "SHIPPED",
        address: "Origin facility",
        eventDate: new Date(now - 2 * 86400000).toISOString(),
      },
      {
        eventDesc: "Your package departed the origin facility.",
        status: "IN_TRANSIT",
        address: "International transit network",
        eventDate: new Date(now - 86400000).toISOString(),
      },
      {
        eventDesc: "Your package is in transit and moving toward the destination.",
        status: "IN_TRANSIT",
        address: "United States",
        eventDate: new Date(now).toISOString(),
      },
    ],
  });

  return NextResponse.json({ ok: true, providerId: sent.id, subject: sent.subject });
}
