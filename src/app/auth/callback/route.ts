import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { missingEnvMessage } from "@/lib/env-messages";
import { getSiteOriginFromRequest } from "@/lib/site-origin";

function requirePublicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(missingEnvMessage(name));
  }
  return value;
}

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/home";
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const siteOrigin = getSiteOriginFromRequest(request);

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", siteOrigin));
  }

  const redirectUrl = new URL(next, siteOrigin);
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"), requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback]", error.message, error);
    return NextResponse.redirect(new URL("/login?error=auth", siteOrigin));
  }

  return response;
}
