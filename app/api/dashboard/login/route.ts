import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { cookieName, createDashboardSession, dashboardConfigured } from "../../../dashboard/auth";

export async function POST(request: Request) {
  if (!dashboardConfigured()) return NextResponse.json({ error: "Dashboard access is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null) as { accessKey?: string } | null;
  const supplied = Buffer.from(body?.accessKey || "");
  const expected = Buffer.from(process.env.DASHBOARD_ACCESS_KEY || "");
  const valid = supplied.length === expected.length && timingSafeEqual(supplied, expected);
  if (!valid) return NextResponse.json({ error: "Access key not recognized." }, { status: 401 });
  const session = createDashboardSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(cookieName, session.value, {
    httpOnly: true, secure: true, sameSite: "strict", path: "/dashboard", maxAge: session.maxAge,
  });
  return response;
}

