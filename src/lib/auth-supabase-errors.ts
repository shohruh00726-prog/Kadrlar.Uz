import type { AuthError } from "@supabase/supabase-js";

export type PublicAuthFailure = {
  httpStatus: number;
  /** Safe to show in the UI */
  publicMessage: string;
  /** For server logs only */
  logLine: string;
};

/**
 * Maps Supabase sign-in errors to HTTP status + user-facing copy.
 * Always logs a detailed line for production debugging (Vercel).
 */
export function signInFailureResponse(signInError: AuthError): PublicAuthFailure {
  const msg = (signInError.message ?? "").toLowerCase();
  const code = String((signInError as { code?: string }).code ?? "");

  if (msg.includes("email not confirmed") || msg.includes("not confirmed") || code === "email_not_confirmed") {
    return {
      httpStatus: 403,
      publicMessage: "Confirm your email before signing in. Check your inbox for the verification link.",
      logLine: `signIn suppressed: email_not_confirmed code=${code} status=${signInError.status}`,
    };
  }

  if (msg.includes("too many requests") || msg.includes("rate limit") || signInError.status === 429) {
    return {
      httpStatus: 429,
      publicMessage: "Too many attempts. Please wait a few minutes and try again.",
      logLine: `signIn rate_limited: ${signInError.message} status=${signInError.status}`,
    };
  }

  if (msg.includes("user_banned") || msg.includes("banned")) {
    return {
      httpStatus: 403,
      publicMessage: "This account cannot sign in. Contact support if you need help.",
      logLine: `signIn banned: ${signInError.message} status=${signInError.status}`,
    };
  }

  return {
    httpStatus: 401,
    publicMessage: "Invalid email or password",
    logLine: `signIn failed: ${signInError.message} code=${code || "n/a"} status=${signInError.status ?? "n/a"}`,
  };
}
