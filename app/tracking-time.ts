// Carrier timestamps for the customer tracking page and e-mails.
// The Store Manager sends ISO instants (UTC). Rows saved before that change hold
// the legacy AliExpress format "YYYY-MM-DD HH:mm:ss", which is China time (GMT+8):
// "2026-11-19 15:56:00" is the event AliExpress shows as Nov 19, 07:56 UTC.

const LEGACY_CHINA_TIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

export function trackingEventIso(value: string | Date | null | undefined) {
  // Postgres timestamp columns arrive as Date objects; carrier dates as text.
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const legacy = raw.match(LEGACY_CHINA_TIME);
  const parsed = legacy
    ? Date.parse(`${legacy[1]}-${legacy[2]}-${legacy[3]}T${legacy[4]}:${legacy[5]}:${legacy[6] || "00"}+08:00`)
    : Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export function trackingEventTime(value: string | Date | null | undefined) {
  const iso = trackingEventIso(value);
  return iso ? Date.parse(iso) : Number.NaN;
}

const MARKET_TIME_ZONES: Record<string, string> = {
  US: "America/New_York",
  CA: "America/Toronto",
  GB: "Europe/London",
  AU: "Australia/Sydney",
  NZ: "Pacific/Auckland",
};

export function marketTimeZone(market: string | null | undefined) {
  return MARKET_TIME_ZONES[(market || "").toUpperCase()] || "America/New_York";
}

export function formatTrackingInstant(
  iso: string,
  options: { timeZone?: string; dateOnly?: boolean; showZone?: boolean } = {},
) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", options.dateOnly
    ? { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: options.timeZone }
    : {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: options.timeZone,
        timeZoneName: options.showZone ? "short" : undefined,
      }).format(date);
}
