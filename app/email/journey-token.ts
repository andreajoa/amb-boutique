import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  return process.env.EMAIL_TOKEN_SECRET || process.env.DASHBOARD_SESSION_SECRET || "";
}

export function createJourneyToken(journeyId: number | string) {
  const value = String(journeyId);
  const key = secret();
  if (!key) return "";
  const signature = createHmac("sha256", key).update(value).digest("base64url");
  return `${value}.${signature}`;
}

export function verifyJourneyToken(token: string) {
  const [value, signature] = token.split(".");
  const key = secret();
  if (!value || !signature || !key) return null;
  const expected = createHmac("sha256", key).update(value).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right) ? value : null;
}
