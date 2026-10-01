import "server-only";

import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";

const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");

function signingSecret() {
  return process.env.STORE_CONNECTOR_SYNC_TOKEN?.trim() || "";
}

function privateKey() {
  const secret = signingSecret();
  if (!secret) return null;
  const seed = createHash("sha256")
    .update("amb-store-manager-ed25519-v1\0")
    .update(secret)
    .digest()
    .subarray(0, 32);
  return createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]),
    format: "der",
    type: "pkcs8",
  });
}

export function ambFulfillmentPublicKey() {
  const key = privateKey();
  if (!key) return null;
  const publicKey = createPublicKey(key);
  const publicKeyPem = publicKey.export({ format: "pem", type: "spki" }).toString();
  const keyId = createHash("sha256").update(publicKeyPem).digest("hex").slice(0, 24);
  return { algorithm: "Ed25519" as const, keyId, publicKeyPem };
}

export function signAmbFulfillmentPayload(payload: string) {
  const key = privateKey();
  if (!key) return null;
  const publicInfo = ambFulfillmentPublicKey();
  if (!publicInfo) return null;
  return {
    ...publicInfo,
    signature: sign(null, Buffer.from(payload, "utf8"), key).toString("base64"),
  };
}
