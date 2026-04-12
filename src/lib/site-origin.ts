/**
 * Public site origin for Supabase email links (reset, confirm).
 * Prefer NEXT_PUBLIC_SITE_URL on Vercel so redirects match the user-facing host.
 */
export function getSiteOriginFromRequest(req: Request): string {
  const explicit = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const proto = (forwardedProto ?? "https").split(",")[0]?.trim() || "https";
    return `${proto}://${forwardedHost.split(",")[0]?.trim()}`;
  }

  return new URL(req.url).origin;
}
