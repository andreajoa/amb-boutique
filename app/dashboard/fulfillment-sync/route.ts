import { NextRequest } from "next/server";

import { GET as runFulfillmentCron } from "../../api/cron/fulfillment/route";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return runFulfillmentCron(request);
}
