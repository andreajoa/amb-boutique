import { NextRequest, NextResponse } from "next/server";

import { getDeliveryWindowsMap, getProductDeliveryWindows } from "../../product-delivery";

export const runtime = "nodejs";

/**
 * Public, customer-safe delivery window map (slug -> market -> { minDays, maxDays }).
 * Never exposes supplier identity, carrier names, URLs, or costs.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim().toLowerCase() || "";
  if (slug) {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ ok: false, error: "Invalid product slug" }, { status: 400 });
    }
    const productWindows = await getProductDeliveryWindows(slug);
    return NextResponse.json(
      { ok: true, windows: productWindows ? { [slug]: productWindows } : {} },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
    );
  }

  const windows = await getDeliveryWindowsMap();
  return NextResponse.json(
    { ok: true, count: Object.keys(windows).length, windows },
    { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
  );
}
