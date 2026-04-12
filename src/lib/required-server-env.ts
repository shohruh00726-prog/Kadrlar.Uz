import { GENERATE_SECRET_CMD, VERCEL_ENV_VARS_HINT } from "@/lib/env-messages";

/**
 * Validates env vars that must be present for the deployed app to work.
 * Called from instrumentation on server startup (Node runtime) so Vercel logs show a single clear error instead of 500s per route.
 */
export function assertProductionServerEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const problems: string[] = [];
  const add = (desc: string, ok: boolean) => {
    if (!ok) problems.push(desc);
  };

  const trim = (v: string | undefined) => (v ?? "").trim();

  add("NEXT_PUBLIC_SUPABASE_URL (non-empty)", !!trim(process.env.NEXT_PUBLIC_SUPABASE_URL));
  add("NEXT_PUBLIC_SUPABASE_ANON_KEY (non-empty)", !!trim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  add("SUPABASE_SERVICE_ROLE_KEY (non-empty)", !!trim(process.env.SUPABASE_SERVICE_ROLE_KEY));

  const session = process.env.SESSION_SECRET ?? "";
  const hasServiceRole = !!trim(process.env.SUPABASE_SERVICE_ROLE_KEY);
  add(
    "SESSION_SECRET (min 16) or SUPABASE_SERVICE_ROLE_KEY (derive session key)",
    session.length >= 16 || hasServiceRole,
  );

  const admin = process.env.ADMIN_SESSION_SECRET ?? "";
  add(
    "ADMIN_SESSION_SECRET (min 16) or SUPABASE_SERVICE_ROLE_KEY (derive admin key)",
    admin.length >= 16 || hasServiceRole,
  );

  // VERIFICATION_DOC_SECRET is checked in @/lib/verification-crypto when verification
  // uploads run; omitting it here avoids crashing the whole Node process on Vercel when
  // that feature is not configured yet.

  if (problems.length === 0) return;

  throw new Error(
    [
      "Server environment is incomplete for production. Fix these:",
      ...problems.map((p) => `  - ${p}`),
      "",
      VERCEL_ENV_VARS_HINT,
      GENERATE_SECRET_CMD,
    ].join("\n"),
  );
}
