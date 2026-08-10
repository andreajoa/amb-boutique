import { NextResponse } from "next/server";
import { atlasBase64 } from "./chunks";

export const runtime = "nodejs";

export async function GET() {
  const bytes = new Uint8Array(Buffer.from(atlasBase64, "base64"));
  return new NextResponse(bytes, { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
}
