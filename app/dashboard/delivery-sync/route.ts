import { NextRequest } from "next/server";

import { GET as runDeliverySyncCron } from "../../api/cron/delivery-sync/route";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return runDeliverySyncCron(request);
}
