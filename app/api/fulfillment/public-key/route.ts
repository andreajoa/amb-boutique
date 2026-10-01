import { NextResponse } from "next/server";
import { ambFulfillmentPublicKey } from "../../../fulfillment-signing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = ambFulfillmentPublicKey();
  if (!key) {
    return NextResponse.json(
      { error: "Fulfillment signing is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      algorithm: key.algorithm,
      keyId: key.keyId,
      publicKeyPem: key.publicKeyPem,
    },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
  );
}
