import { NextRequest, NextResponse } from "next/server";
import { getVariantAvailability, InventoryError, releaseExpiredInventory } from "../../inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim() || "";
  const color = request.nextUrl.searchParams.get("color")?.trim() || "";
  const size = request.nextUrl.searchParams.get("size")?.trim() || "";

  if (!slug || !color || !size) {
    return NextResponse.json({ error: "Product, color and size are required." }, { status: 400 });
  }

  try {
    await releaseExpiredInventory();
    const result = await getVariantAvailability(slug, color, size);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    const status = error instanceof InventoryError ? error.status : 503;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Live inventory is unavailable." },
      { status, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
