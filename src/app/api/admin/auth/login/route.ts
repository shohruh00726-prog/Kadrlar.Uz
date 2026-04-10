import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapAdminUserRow } from "@/lib/db/mappers";
import { attachAdminSessionToResponse } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: row, error } = await sb
    .from("admin_users")
    .select("*")
    .eq("email", parsed.data.email.toLowerCase())
    .maybeSingle();
  if (error || !row) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const admin = mapAdminUserRow(row as Record<string, unknown>);
  const ok = await bcrypt.compare(parsed.data.password, admin.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  await sb.from("admin_users").update({ last_login: new Date().toISOString() }).eq("id", admin.id);
  await logAdminAction({ adminId: admin.id, actionType: "admin_login" });

  return await attachAdminSessionToResponse(
    NextResponse.json({
      ok: true,
      admin: { id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role },
    }),
    admin.id,
    admin.role,
  );
}
