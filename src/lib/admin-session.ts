import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getAdminSessionSecretKey } from "@/lib/session-secrets";

const ADMIN_COOKIE = "kadrlar_admin_session";
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;

function adminCookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export type AdminSessionPayload = {
  sub: string;
  role: string;
};

export async function signAdminSessionToken(adminId: string, role: string) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setExpirationTime("12h")
    .sign(await getAdminSessionSecretKey());
}

export async function verifyAdminSessionToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, await getAdminSessionSecretKey());
    const sub = payload.sub;
    const role = payload.role;
    if (!sub || typeof role !== "string") return null;
    return { sub, role };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) return null;
  return verifyAdminSessionToken(raw);
}

export async function attachAdminSessionToResponse(res: NextResponse, adminId: string, role: string) {
  const token = await signAdminSessionToken(adminId, role);
  res.cookies.set(ADMIN_COOKIE, token, { ...adminCookieBase(), maxAge: ADMIN_SESSION_MAX_AGE });
  return res;
}

export function clearAdminSessionOnResponse(res: NextResponse): NextResponse {
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
