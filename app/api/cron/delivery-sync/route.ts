import { NextRequest, NextResponse } from "next/server";

import { dashboardAuthenticated } from "../../../dashboard/auth";
import { syncDeliveryWindowsFromManager } from "../../../product-delivery";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim() || "";
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!authorized(request) && !(await dashboardAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncDeliveryWindowsFromManager();
    return NextResponse.json(result, {
      status: result.ok ? 200 : result.skipped ? 503 : 502,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Delivery window sync failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
