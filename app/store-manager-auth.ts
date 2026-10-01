import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

export function storeManagerSyncToken() {
  return process.env.STORE_CONNECTOR_SYNC_TOKEN?.trim() || "";
}

export function storeManagerSyncTokenHash() {
  const token = storeManagerSyncToken();
  return token ? createHash("sha256").update(token).digest("hex") : "";
}

export function storeManagerRequestAuthorized(authorization: string | null) {
  const token = storeManagerSyncToken();
  const supplied = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  if (!token || !supplied) return false;
  const expected = Buffer.from(token);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
