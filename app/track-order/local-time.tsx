"use client";

import { useSyncExternalStore } from "react";
import { formatTrackingInstant } from "../tracking-time";

const noSubscription = () => () => {};

// Like the AliExpress tracking page, show carrier times in the viewer's own
// time zone. The server renders a UTC label until the browser takes over.
export function LocalTime({ iso, dateOnly = false }: { iso: string; dateOnly?: boolean }) {
  const label = useSyncExternalStore(
    noSubscription,
    () => formatTrackingInstant(iso, { dateOnly }),
    () => formatTrackingInstant(iso, { dateOnly, timeZone: "UTC", showZone: !dateOnly }),
  );
  return <time dateTime={iso}>{label}</time>;
}
