import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const COOKIE = "kadrlar_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function sessionCookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export type UserRole = "employee" | "employer";

export type SessionPayload = {
  sub: string;
  typ: UserRole;
};

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set (min 16 chars) for auth.");
  }
  return new TextEncoder().encode(s);
}

export async function signSessionToken(userId: string, userType: UserRole) {
  return new SignJWT({ typ: userType })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const sub = payload.sub;
    const typ = payload.typ;
    if (!sub || (typ !== "employee" && typ !== "employer")) return null;
    return { sub, typ: typ as UserRole };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  return verifySessionToken(raw);
}

/** Attach session cookie to a Route Handler response (reliable Set-Cookie in App Router). */
export async function attachSessionToResponse(
  res: NextResponse,
  userId: string,
  userType: UserRole,
): Promise<NextResponse> {
  const token = await signSessionToken(userId, userType);
  res.cookies.set(COOKIE, token, { ...sessionCookieBase(), maxAge: SESSION_MAX_AGE });
  return res;
}

export function clearSessionCookieOnResponse(res: NextResponse): NextResponse {
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
