export function contactEmailFromRoute(value: string): string | null {
  // Vercel may deliver an encoded dynamic parameter. Locally Next can already
  // decode it; a literal @ means percent characters belong to the actual email.
  if (!value.includes("@")) {
    try { value = decodeURIComponent(value); }
    catch { return null; }
  }
  return value.trim().toLowerCase();
}
