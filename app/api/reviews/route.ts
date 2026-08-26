import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { products } from "../../data";
import { getMerchantImage } from "../../merchant";
import { getReviewsSql } from "../../reviews/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cleanText = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

type PublicReviewRow = {
  id: number | string;
  customer_name: string;
  rating: number | string;
  review_body: string;
  created_at: string | Date;
};

type CountRow = { count: number | string };

function requestIpHash(request: NextRequest) {
  const ip = cleanText(request.headers.get("x-forwarded-for")?.split(",")[0], 80);
  const salt = process.env.ANALYTICS_HASH_SALT || process.env.DASHBOARD_SESSION_SECRET || "";
  return ip && salt ? createHash("sha256").update(`${salt}:review:${ip}`).digest("hex") : null;
}

export async function GET(request: NextRequest) {
  const slug = cleanText(request.nextUrl.searchParams.get("slug"), 180);
  const product = products.find((item) => item.slug === slug);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const sql = await getReviewsSql();
  if (!sql) return NextResponse.json({ configured: false, average: 0, count: 0, reviews: [] });

  const rows = await sql`
    SELECT id, customer_name, rating, review_body, created_at
    FROM amb_product_reviews
    WHERE product_slug = ${slug} AND status = 'approved'
    ORDER BY created_at DESC
    LIMIT 50
  ` as unknown as PublicReviewRow[];
  const count = rows.length;
  const average = count ? rows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / count : 0;

  return NextResponse.json({
    configured: true,
    average: Number(average.toFixed(1)),
    count,
    reviews: rows.map((row) => ({
      id: Number(row.id),
      customerName: String(row.customer_name),
      rating: Number(row.rating),
      body: String(row.review_body),
      createdAt: new Date(row.created_at).toISOString(),
    })),
  });
}

type ReviewBody = {
  slug?: string;
  customerName?: string;
  rating?: number;
  review?: string;
  company?: string;
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as ReviewBody | null;
  if (!body) return NextResponse.json({ error: "Invalid review." }, { status: 400 });

  // Honeypot: bots get a harmless success response without creating a review.
  if (cleanText(body.company, 200)) return NextResponse.json({ accepted: true, pending: true });

  const slug = cleanText(body.slug, 180);
  const customerName = cleanText(body.customerName, 80);
  const review = cleanText(body.review, 2000);
  const rating = Math.round(Number(body.rating));
  const product = products.find((item) => item.slug === slug);

  if (!product || customerName.length < 2 || review.length < 10 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Please complete your name, star rating and review." }, { status: 400 });
  }

  const sql = await getReviewsSql();
  if (!sql) return NextResponse.json({ error: "Reviews are temporarily unavailable." }, { status: 503 });

  const ipHash = requestIpHash(request);
  if (ipHash) {
    const recent = await sql`
      SELECT count(*) AS count
      FROM amb_product_reviews
      WHERE ip_hash = ${ipHash} AND created_at > now() - interval '24 hours'
    ` as unknown as CountRow[];
    if (Number(recent[0]?.count || 0) >= 5) {
      return NextResponse.json({ error: "Too many recent review submissions. Please try again later." }, { status: 429 });
    }
  }

  const productImage = getMerchantImage(product) || product.images?.[0] || null;
  await sql`
    INSERT INTO amb_product_reviews (
      product_slug, product_name, product_image, customer_name, rating, review_body, status, ip_hash
    ) VALUES (
      ${product.slug}, ${product.name}, ${productImage}, ${customerName}, ${rating}, ${review}, 'pending', ${ipHash}
    )
  `;

  return NextResponse.json({ accepted: true, pending: true }, { status: 201 });
}
