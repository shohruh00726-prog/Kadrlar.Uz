import { NextResponse } from "next/server";
import { z } from "zod";
import { signInFailureResponse } from "@/lib/auth-supabase-errors";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { attachSessionToResponse, type UserRole } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email()
    .transform((s) => s.toLowerCase()),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { email: normalizedEmail, password } = parsed.data;
    const supabase = await getSupabaseServerClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (signInError) {
      const mapped = signInFailureResponse(signInError);
      console.error("[auth/login]", mapped.logLine, { email: normalizedEmail });
      return NextResponse.json({ error: mapped.publicMessage }, { status: mapped.httpStatus });
    }

    const sb = getSupabaseAdmin();
    const { data: user, error } = await sb.from("users").select("*").eq("email", normalizedEmail).maybeSingle();
    if (error || !user) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error:
            "No profile is linked to this account. Try signing up again with the same email, or use Forgot password if you already registered.",
        },
        { status: 404 },
      );
    }
    const row = user as Record<string, unknown>;
    if (row.is_suspended) {
      return NextResponse.json({ error: "Account suspended. Contact support." }, { status: 403 });
    }
    await sb.from("users").update({ last_active: new Date().toISOString() }).eq("id", row.id as string);

    return await attachSessionToResponse(
      NextResponse.json({ ok: true, userId: row.id, userType: row.user_type }),
      row.id as string,
      row.user_type as UserRole,
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
