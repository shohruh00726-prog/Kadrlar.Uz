import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Typed DB schema can replace `any` after running `supabase gen types`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminClient = SupabaseClient<any, "public", any>;

const globalForSupabaseAdmin = globalThis as unknown as { supabaseAdmin?: AdminClient };

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Server-side only: bypasses RLS. Use in Route Handlers and Server Actions. */
export function getSupabaseAdmin(): AdminClient {
  if (globalForSupabaseAdmin.supabaseAdmin) {
    return globalForSupabaseAdmin.supabaseAdmin;
  }
  const client = createClient<any, "public", any>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  if (process.env.NODE_ENV !== "development") {
    globalForSupabaseAdmin.supabaseAdmin = client;
  }
  return client;
}

export function isPostgresUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: string }).code) : "";
  return code === "23505";
}
