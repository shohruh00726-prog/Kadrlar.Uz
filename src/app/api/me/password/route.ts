import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth-user";

const pwdSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json();
  const parsed = pwdSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const ok = await bcrypt.compare(parsed.data.currentPassword, ctx.user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Wrong password" }, { status: 400 });

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("users").update({ password_hash: passwordHash }).eq("id", ctx.user.id);
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
