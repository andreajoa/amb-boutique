import { heelCardAtlasBase64 } from "./chunks";

export const dynamic = "force-static";

export async function GET() {
  const bytes = Buffer.from(heelCardAtlasBase64, "base64");
  return new Response(bytes, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(bytes.length),
    },
  });
}
