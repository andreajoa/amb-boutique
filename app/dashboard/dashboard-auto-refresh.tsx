"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function DashboardAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [router]);

  return <span>Orders auto-refresh every 30s</span>;
}
