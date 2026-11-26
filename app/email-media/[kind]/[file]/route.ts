import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { products as catalog } from "../../../data";

export const runtime = "nodejs";

const PUBLIC_DIR = path.resolve(process.cwd(), "public");

const HERO_FILES: Record<string, string> = {
  "amb-hero.jpg": "images/amb-hero.webp",
  "new-arrivals.jpg": "images/new-arrivals.webp",
  "journal-handbags.jpg": "images/journal-handbags.webp",
  "product-banner.jpg": "images/product-banner.webp",
  "newsletter-editorial.jpg": "images/newsletter-editorial.webp",
};

const PRODUCT_BY_SLUG = new Map(catalog.map((product) => [product.slug, product]));

function safePublicPath(relativePath: string) {
  const cleaned = relativePath.split(/[?#]/)[0].replace(/^\/+/, "");
  const resolved = path.resolve(PUBLIC_DIR, cleaned);
  if (!resolved.startsWith(`${PUBLIC_DIR}${path.sep}`)) return null;
  return resolved;
}

async function resolveSource(kind: string, file: string) {
  if (kind === "hero") {
    const mapped = HERO_FILES[file];
    if (!mapped) return null;
    const diskPath = safePublicPath(mapped);
    if (!diskPath) return null;
    return { diskPath, width: 1200, height: 628, background: "#1c1a18", position: "attention" as const };
  }

  if (kind === "product") {
    const match = /^([a-z0-9-]+)\.jpg$/i.exec(file);
    if (!match) return null;
    const product = PRODUCT_BY_SLUG.get(match[1].toLowerCase());
    const primary = product && !product.gallerySprite ? product.images?.[0] : undefined;
    if (!primary || !primary.startsWith("/")) return null;
    const diskPath = safePublicPath(primary);
    if (!diskPath) return null;
    return { diskPath, width: 600, height: 600, background: "#f5efe5", position: "top" as const };
  }

  return null;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ kind: string; file: string }> },
) {
  const { kind, file } = await params;
  const spec = await resolveSource(kind, file);
  if (!spec) return new NextResponse("Not found", { status: 404 });

  let source: Buffer;
  try {
    source = await fs.readFile(spec.diskPath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const jpeg = await sharp(source)
    .resize(spec.width, spec.height, { fit: "cover", position: spec.position })
    .flatten({ background: spec.background })
    .jpeg({ quality: 86, progressive: true, mozjpeg: true })
    .toBuffer();

  return new NextResponse(new Uint8Array(jpeg), {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
