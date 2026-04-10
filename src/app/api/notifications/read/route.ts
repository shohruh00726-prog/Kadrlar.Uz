import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";

export async function POST() {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabaseAdmin();
  await sb.from("notifications").update({ is_read: true }).eq("user_id", s.userId).eq("is_read", false);
  return NextResponse.json({ ok: true });
}
