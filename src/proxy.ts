import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  getAdminSessionSecretKeyOrNull,
  getUserSessionSecretKeyOrNull,
} from "@/lib/session-secrets";

const SESSION_COOKIE = "kadrlar_session";
const ADMIN_COOKIE = "kadrlar_admin_session";

const PROTECTED_USER_PREFIXES = [
  "/dashboard",
  "/settings",
  "/messages",
  "/notifications",
  "/profile",
  "/saved",
  "/saved-searches",
  "/reviews",
  "/teams/create",
  "/invitations",
  "/onboarding",
  "/home",
];

const GUEST_ONLY_PREFIXES = ["/login", "/register", "/forgot-password"];

async function sessionSecret() {
  return getUserSessionSecretKeyOrNull();
}

async function adminSecret() {
  return getAdminSessionSecretKeyOrNull();
}

async function verifyToken(token: string, secret: Uint8Array): Promise<boolean> {
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const secret = await adminSecret();
    if (!token || !secret || !(await verifyToken(token, secret))) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED_USER_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const isGuestOnly = GUEST_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (!isProtected && !isGuestOnly) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = await sessionSecret();
  const hasValidSession = token && secret ? await verifyToken(token, secret) : false;

  if (isProtected && !hasValidSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isGuestOnly && hasValidSession) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
