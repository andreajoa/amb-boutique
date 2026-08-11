import "server-only";

const RESEND_CONTACTS_URL = "https://api.resend.com/contacts";

function resendHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function providerError(response: Response) {
  const body = await response.text().catch(() => "");
  return new Error(`Resend contact sync failed (${response.status})${body ? `: ${body}` : ""}`);
}

export async function subscribeResendContact(email: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const normalizedEmail = email.trim().toLowerCase();
  const encodedEmail = encodeURIComponent(normalizedEmail);
  const segmentId = process.env.RESEND_SEGMENT_ID?.trim();
  const headers = resendHeaders(apiKey);

  const updateResponse = await fetch(`${RESEND_CONTACTS_URL}/${encodedEmail}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ unsubscribed: false }),
    cache: "no-store",
  });

  if (updateResponse.ok) {
    if (segmentId) {
      const segmentResponse = await fetch(
        `${RESEND_CONTACTS_URL}/${encodedEmail}/segments/${encodeURIComponent(segmentId)}`,
        { method: "POST", headers, cache: "no-store" },
      );
      if (!segmentResponse.ok) throw await providerError(segmentResponse);
    }
    return true;
  }

  if (updateResponse.status !== 404) throw await providerError(updateResponse);

  const createResponse = await fetch(RESEND_CONTACTS_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: normalizedEmail,
      unsubscribed: false,
      ...(segmentId ? { segments: [{ id: segmentId }] } : {}),
    }),
    cache: "no-store",
  });
  if (!createResponse.ok) throw await providerError(createResponse);
  return true;
}

export async function unsubscribeResendContact(email: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const response = await fetch(`${RESEND_CONTACTS_URL}/${encodeURIComponent(email.trim().toLowerCase())}`, {
    method: "PATCH",
    headers: resendHeaders(apiKey),
    body: JSON.stringify({ unsubscribed: true }),
    cache: "no-store",
  });
  if (response.status === 404) return false;
  if (!response.ok) throw await providerError(response);
  return true;
}
