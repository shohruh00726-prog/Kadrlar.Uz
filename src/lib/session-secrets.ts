import { GENERATE_SECRET_CMD, VERCEL_ENV_VARS_HINT } from "@/lib/env-messages";

const USER_DERIVE_PREFIX = "kadrlar:session:v1:";
const ADMIN_DERIVE_PREFIX = "kadrlar:admin_session:v1:";
const DEV_USER_SECRET = "__kadrlar_dev_user_session_sec__";
const DEV_ADMIN_SECRET = "__kadrlar_dev_admin_session_sec__";

async function derivedKey(prefix: string, serviceRole: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(prefix + serviceRole);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(buf);
}

export async function getUserSessionSecretKeyOrNull(): Promise<Uint8Array | null> {
  const explicit = process.env.SESSION_SECRET ?? "";
  if (explicit.length >= 16) return new TextEncoder().encode(explicit);

  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (serviceRole.length >= 16) return derivedKey(USER_DERIVE_PREFIX, serviceRole);

  if (process.env.NODE_ENV !== "production") {
    return new TextEncoder().encode(DEV_USER_SECRET);
  }
  return null;
}

export async function getUserSessionSecretKey(): Promise<Uint8Array> {
  const k = await getUserSessionSecretKeyOrNull();
  if (k) return k;
  throw new Error(
    [
      "Set SESSION_SECRET (min 16 characters) for auth,",
      "or set SUPABASE_SERVICE_ROLE_KEY so a session key can be derived.",
      VERCEL_ENV_VARS_HINT,
      GENERATE_SECRET_CMD,
    ].join(" "),
  );
}

export async function getAdminSessionSecretKeyOrNull(): Promise<Uint8Array | null> {
  const explicit = process.env.ADMIN_SESSION_SECRET ?? "";
  if (explicit.length >= 16) return new TextEncoder().encode(explicit);

  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (serviceRole.length >= 16) return derivedKey(ADMIN_DERIVE_PREFIX, serviceRole);

  if (process.env.NODE_ENV !== "production") {
    return new TextEncoder().encode(DEV_ADMIN_SECRET);
  }
  return null;
}

export async function getAdminSessionSecretKey(): Promise<Uint8Array> {
  const k = await getAdminSessionSecretKeyOrNull();
  if (k) return k;
  throw new Error(
    [
      "Set ADMIN_SESSION_SECRET (min 16 characters) for /admin auth,",
      "or set SUPABASE_SERVICE_ROLE_KEY so an admin session key can be derived.",
      VERCEL_ENV_VARS_HINT,
      GENERATE_SECRET_CMD,
    ].join(" "),
  );
}
