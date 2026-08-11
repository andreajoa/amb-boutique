import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "amb-dashboard-session";

function secret() {
  return process.env.DASHBOARD_SESSION_SECRET || process.env.DASHBOARD_ACCESS_KEY || "";
}

function signature(expires: string) {
  return createHmac("sha256", secret()).update(expires).digest("base64url");
}

export function createDashboardSession() {
  const expires = String(Date.now() + 12 * 60 * 60 * 1000);
  return { value: `${expires}.${signature(expires)}`, maxAge: 12 * 60 * 60 };
}

export async function dashboardAuthenticated() {
  const token = (await cookies()).get(cookieName)?.value || "";
  const [expires, supplied] = token.split(".");
  if (!expires || !supplied || !secret() || Number(expires) < Date.now()) return false;
  const expected = signature(expires);
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function dashboardConfigured() {
  return Boolean(process.env.DASHBOARD_ACCESS_KEY && secret());
}

export { cookieName };
