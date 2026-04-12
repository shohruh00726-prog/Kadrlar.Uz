import type { AdminClient } from "@/lib/supabase/admin";

const USERS_PER_PAGE = 1000;
const MAX_PAGES = 25;

function emailsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Finds an Auth user by email (paginated). Only used when registration reports duplicate email.
 */
export async function findAuthUserByEmail(sb: AdminClient, normalizedEmail: string) {
  const want = normalizedEmail.trim().toLowerCase();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: USERS_PER_PAGE });
    if (error) {
      console.error("[auth-orphan] listUsers", error.message);
      return null;
    }
    const users = data?.users ?? [];
    const found = users.find((u) => u.email && emailsMatch(u.email, want));
    if (found) return found;
    if (users.length < USERS_PER_PAGE) break;
  }
  return null;
}

/**
 * If Auth has this email but our app has no `public.users` row, delete the Auth user so
 * signUp can succeed. Fixes partial registrations (DB insert failed after auth user was created).
 */
export async function tryClearOrphanAuthUser(sb: AdminClient, normalizedEmail: string): Promise<boolean> {
  const authUser = await findAuthUserByEmail(sb, normalizedEmail);
  if (!authUser?.id) return false;

  const { data: profile } = await sb.from("users").select("id").eq("id", authUser.id).maybeSingle();
  if (profile) return false;

  const { data: profileByEmail } = await sb.from("users").select("id").eq("email", normalizedEmail).maybeSingle();
  if (profileByEmail) return false;

  const { error } = await sb.auth.admin.deleteUser(authUser.id);
  if (error) {
    console.error("[auth-orphan] deleteUser failed", error.message, { id: authUser.id, email: normalizedEmail });
    return false;
  }
  return true;
}

export function isSignUpDuplicateError(message: string, status?: number, code?: string): boolean {
  const msg = message.toLowerCase();
  const c = (code ?? "").toLowerCase();
  return (
    msg.includes("already") ||
    msg.includes("registered") ||
    msg.includes("exists") ||
    msg.includes("duplicate") ||
    c.includes("already") ||
    c === "user_already_exists" ||
    status === 422
  );
}
