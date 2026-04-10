/** Normalize Next.js app router dynamic segments (string | string[] | undefined). */
export function routeParam(p: string | string[] | undefined): string | undefined {
  if (typeof p === "string") return p;
  if (Array.isArray(p)) return p[0];
  return undefined;
}
