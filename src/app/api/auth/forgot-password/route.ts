import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { missingEnvMessage } from "@/lib/env-messages";
import { getSiteOriginFromRequest } from "@/lib/site-origin";

const bodySchema = z.object({
  email: z.string().email(),
});

function requirePublicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(missingEnvMessage(name));
  }
  return value;
}

export async function POST(req: Request) {
  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();
    const origin = getSiteOriginFromRequest(req);
    const nextPath = "/auth/update-password";
    const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const supabase = createClient(
      requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl,
    });

    if (error) {
      console.error("[auth/forgot-password]", error.message, { email, status: error.status });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
