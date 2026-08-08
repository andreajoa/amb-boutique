"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="not-found"><p>WE’LL FIX THIS</p><h1>Something went wrong.</h1><span>Please try again. If the issue continues, contact info@ambboutique.online.</span><button className="button dark" onClick={reset}>Try Again</button></main>;
}
