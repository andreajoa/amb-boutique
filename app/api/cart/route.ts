import { NextResponse } from "next/server";
import { products } from "../../data";
import { isMarketCode } from "../../commerce";
import { getAnalyticsSql, jsonForDatabase } from "../../analytics/db";
import { cartRecoveryCampaigns } from "../../email/campaigns";
import { cancelJourneyEmails, scheduleRecoverySequence } from "../../email/send";
import { createJourneyToken } from "../../email/journey-token";

type CartItem = {
  slug?: string;
  quantity?: number;
  size?: string;
  color?: string;
  heelHeightCm?: number;
  offer?: string;
};

type CartBody = { visitorId?: string; market?: unknown; items?: CartItem[] };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as CartBody | null;
  const visitorId = (body?.visitorId || "").slice(0, 100);
  const market = isMarketCode(body?.market) ? body.market : "US";
  if (!visitorId || !Array.isArray(body?.items) || body.items.length > 30) {
    return NextResponse.json({ error: "Invalid bag snapshot." }, { status: 400 });
  }
  const sql = getAnalyticsSql();
  if (!sql) return NextResponse.json({ stored: false, preview: true }, { status: 202 });

  const cart = body.items.flatMap((item) => {
    const product = products.find((candidate) => candidate.slug === item.slug);
    if (!product) return [];
    const quantity = Math.max(1, Math.min(10, Math.floor(Number(item.quantity) || 1)));
    const sprite = product.gallerySprite && product.images?.length === 1 ? product.gallerySprite : undefined;
    return [{
      id: `${product.slug}:${item.size || "Selected"}:${item.color || "Selected"}:${item.heelHeightCm || "no-heel"}:${item.offer || "standard"}`,
      slug: product.slug,
      name: product.name,
      price: product.price,
      quantity,
      size: (item.size || product.sizes?.[0] || product.shoeVariants?.[0]?.sizes?.[0] || "One Size").slice(0, 40),
      color: (item.color || product.colorNames?.[0] || "Selected").slice(0, 60),
      heelHeightCm: Number.isFinite(Number(item.heelHeightCm)) ? Number(item.heelHeightCm) : undefined,
      sheet: product.sheet,
      quadrant: product.quadrant,
      image: product.images?.[0],
      imageSpriteColumns: sprite?.columns,
      imageSpriteRows: sprite?.rows,
      imageViewWidth: sprite?.viewWidth,
      imageViewHeight: sprite?.viewHeight,
      offer: item.offer === "cart-bump" || item.offer === "post-purchase" ? item.offer : undefined,
    }];
  });
  const amount = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

  const existing = await sql`
    SELECT id FROM amb_commerce_journeys
    WHERE visitor_id = ${visitorId} AND status = 'cart'
    ORDER BY updated_at DESC LIMIT 1
  ` as Array<{ id: number | string }>;

  if (!cart.length) {
    if (existing[0]?.id) {
      await cancelJourneyEmails(existing[0].id);
      await sql`UPDATE amb_commerce_journeys SET status = 'cleared', updated_at = now() WHERE id = ${existing[0].id}`;
    }
    return NextResponse.json({ stored: true, cleared: true });
  }

  let journeyId = existing[0]?.id;
  if (journeyId) {
    await cancelJourneyEmails(journeyId);
    await sql`
      UPDATE amb_commerce_journeys
      SET cart = ${jsonForDatabase(cart)}::jsonb, amount_total = ${amount},
          market = ${market}, currency = 'USD', updated_at = now(), recovery_state = '{}'::jsonb
      WHERE id = ${journeyId}
    `;
  } else {
    const rows = await sql`
      INSERT INTO amb_commerce_journeys (visitor_id, market, currency, amount_total, status, cart)
      VALUES (${visitorId}, ${market}, 'USD', ${amount}, 'cart', ${jsonForDatabase(cart)}::jsonb)
      RETURNING id
    ` as Array<{ id: number | string }>;
    journeyId = rows[0]?.id;
  }

  const contacts = await sql`
    SELECT id, email, first_name FROM amb_contacts
    WHERE visitor_id = ${visitorId} AND email_consent = true AND unsubscribed_at IS NULL
    ORDER BY updated_at DESC LIMIT 1
  ` as Array<{ id: number | string; email: string; first_name: string | null }>;

  const contact = contacts[0];
  const token = journeyId ? createJourneyToken(journeyId) : "";
  if (contact && journeyId && token) {
    const recoveryUrl = `/recover-cart/${encodeURIComponent(token)}`;
    await scheduleRecoverySequence({
      campaigns: cartRecoveryCampaigns,
      to: contact.email,
      contactId: contact.id,
      journeyId,
      recoveryUrl,
      firstName: contact.first_name || undefined,
    }).catch((error) => console.error("AMB cart recovery schedule failed", {
      journeyId,
      error: error instanceof Error ? error.message : "unknown",
    }));
  }

  return NextResponse.json({ stored: true, journeyId, recoveryReady: Boolean(contact && token) });
}

