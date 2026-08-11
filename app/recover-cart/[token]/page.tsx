import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAnalyticsSql } from "../../analytics/db";
import { verifyJourneyToken } from "../../email/journey-token";
import { RecoverCartClient } from "./recover-cart-client";

export const metadata: Metadata = { title: "Restore Your Bag", robots: { index: false, follow: false } };

export default async function RecoverCartPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const journeyId = verifyJourneyToken(decodeURIComponent(token));
  const sql = getAnalyticsSql();
  if (!journeyId || !sql) notFound();
  const rows = await sql`
    SELECT cart FROM amb_commerce_journeys
    WHERE id = ${journeyId} AND status IN ('cart', 'checkout', 'abandoned', 'failed')
    LIMIT 1
  ` as Array<{ cart: unknown[] }>;
  if (!rows[0]?.cart?.length) notFound();
  return <RecoverCartClient cart={rows[0].cart}/>;
}

