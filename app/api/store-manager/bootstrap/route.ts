import { NextResponse } from "next/server";
import { storeManagerSyncTokenHash } from "../../../store-manager-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const tokenHash = storeManagerSyncTokenHash();
  if (!tokenHash) {
    return NextResponse.json(
      { ok: false, error: "Store Manager authentication is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      storeId: "amb-boutique-store",
      algorithm: "sha256",
      tokenHash,
    },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
  );
}
