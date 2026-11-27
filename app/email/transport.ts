import "server-only";
// Envio com transbordo (pedido do André, 27/11/2026):
//   1º contato e transacionais → Resend; se o Resend bater o limite → Brevo; se o Brevo bater → NovaMail.
//   Follow-ups (recuperação de carrinho/checkout, newsletters, etapas 2+ das sequências) → sempre NovaMail.
// Resend e Brevo NUNCA são desligados: se o NovaMail falhar, o follow-up volta para o Resend.
// IDs: Resend = id puro (compatível com o histórico), Brevo = "brevo:<messageId>", NovaMail = "nm:<id>".
import { Resend } from "resend";
import { ambResendApiKey } from "./resend-config";

export type AmbProvider = "resend" | "brevo" | "novamail";

export type AmbMail = {
  from: string;
  to: string[];
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  scheduledAt?: string;
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;
};

const NOVAMAIL_URL = () => (process.env.NOVAMAIL_API_URL?.trim() || "https://api.novamail.nexaclouds.online").replace(/\/$/, "");
const novamailKey = () => process.env.AMB_NOVAMAIL_API_KEY?.trim() || "";
const brevoKey = () => process.env.AMB_BREVO_API_KEY?.trim() || process.env.BREVO_API_KEY?.trim() || "";
// O NovaMail envia pelo domínio verificado nele (mail.ambboutique.online), com o mesmo nome de exibição.
const novamailFrom = (from: string) =>
  process.env.AMB_NOVAMAIL_FROM?.trim() || from.replace(/@(?:[a-z0-9-]+\.)*ambboutique\.online/i, "@mail.ambboutique.online");

export class ProviderLimitError extends Error {}

/** Resend/Brevo devolvem 429 (ou nomes de cota) quando o limite do plano grátis acaba. */
export function isLimitError(status: number | undefined, text: string) {
  return status === 429 || /quota|limit|exceeded|too many|credits?/i.test(text);
}

let resendClient: Resend | null | undefined;
function resend() {
  if (resendClient !== undefined) return resendClient;
  const key = ambResendApiKey();
  resendClient = key ? new Resend(key) : null;
  return resendClient;
}

async function viaResend(mail: AmbMail) {
  const client = resend();
  if (!client) throw new Error("Resend is not configured.");
  const result = await client.emails.send({
    from: mail.from,
    to: mail.to,
    replyTo: mail.replyTo,
    subject: mail.subject,
    ...(mail.html ? { html: mail.html } : {}),
    ...(mail.text ? { text: mail.text } : {}),
    scheduledAt: mail.scheduledAt,
    headers: mail.headers,
    tags: mail.tags,
  } as Parameters<Resend["emails"]["send"]>[0]);
  if (result.error || !result.data?.id) {
    const error = result.error as { message?: string; name?: string; statusCode?: number } | null;
    const text = `${error?.name || ""} ${error?.message || "Email provider did not accept the message."}`;
    if (isLimitError(error?.statusCode, text)) throw new ProviderLimitError(text);
    throw new Error(error?.message || "Email provider did not accept the message.");
  }
  return result.data.id;
}

function brevoAddress(value: string) {
  const match = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return match ? { name: match[1].trim() || undefined, email: match[2].trim() } : { email: value.trim() };
}

async function viaBrevo(mail: AmbMail) {
  const key = brevoKey();
  if (!key) throw new ProviderLimitError("Brevo is not configured.");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: brevoAddress(mail.from),
      to: mail.to.map((email) => ({ email })),
      replyTo: mail.replyTo ? brevoAddress(mail.replyTo) : undefined,
      subject: mail.subject,
      htmlContent: mail.html,
      textContent: mail.text,
      scheduledAt: mail.scheduledAt,
      headers: mail.headers,
      tags: mail.tags?.map((tag) => `${tag.name}:${tag.value}`),
    }),
  });
  const json = (await response.json().catch(() => ({}))) as { messageId?: string; message?: string; code?: string };
  if (!response.ok || !json.messageId) {
    const text = `${json.code || ""} ${json.message || response.status}`;
    if (isLimitError(response.status, text)) throw new ProviderLimitError(text);
    throw new Error(`Brevo rejected the message: ${text}`);
  }
  return `brevo:${json.messageId}`;
}

async function viaNovaMail(mail: AmbMail) {
  const key = novamailKey();
  if (!key) throw new Error("NovaMail is not configured.");
  const response = await fetch(`${NOVAMAIL_URL()}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: novamailFrom(mail.from),
      to: mail.to,
      reply_to: mail.replyTo ? [mail.replyTo] : undefined,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      scheduled_at: mail.scheduledAt,
      headers: mail.headers,
      tags: mail.tags?.map((tag) => ({ name: tag.name.replace(/[^A-Za-z0-9_-]/g, "_"), value: tag.value.replace(/[^A-Za-z0-9_-]/g, "_") })),
    }),
  });
  const json = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok || !json.id) throw new Error(`NovaMail rejected the message: ${json.message || response.status}`);
  return `nm:${json.id}`;
}

export async function deliverAmbEmail(mail: AmbMail, options: { followUp: boolean }): Promise<{ id: string; provider: AmbProvider }> {
  if (options.followUp && novamailKey()) {
    try {
      return { id: await viaNovaMail(mail), provider: "novamail" };
    } catch (error) {
      console.warn("[amb-email] NovaMail failed for a follow-up, using Resend:", error instanceof Error ? error.message : error);
    }
  }
  try {
    return { id: await viaResend(mail), provider: "resend" };
  } catch (error) {
    if (!(error instanceof ProviderLimitError)) throw error;
  }
  try {
    return { id: await viaBrevo(mail), provider: "brevo" };
  } catch (error) {
    if (!(error instanceof ProviderLimitError) || !novamailKey()) throw error;
  }
  return { id: await viaNovaMail(mail), provider: "novamail" };
}

/** Cancela um envio agendado no provedor certo (pelo prefixo do id). */
export async function cancelAmbEmail(providerId: string): Promise<{ ok: boolean; error?: string }> {
  if (providerId.startsWith("nm:")) {
    const response = await fetch(`${NOVAMAIL_URL()}/emails/${encodeURIComponent(providerId.slice(3))}/cancel`, {
      method: "POST",
      headers: { authorization: `Bearer ${novamailKey()}` },
    });
    if (response.ok) return { ok: true };
    const json = (await response.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: json.message || String(response.status) };
  }
  if (providerId.startsWith("brevo:")) {
    const response = await fetch(`https://api.brevo.com/v3/smtp/email/${encodeURIComponent(providerId.slice(6))}`, {
      method: "DELETE",
      headers: { "api-key": brevoKey(), accept: "application/json" },
    });
    return response.ok ? { ok: true } : { ok: false, error: String(response.status) };
  }
  const client = resend();
  if (!client) return { ok: false, error: "Resend is not configured." };
  const result = await client.emails.cancel(providerId);
  return result.error ? { ok: false, error: result.error.message } : { ok: true };
}
