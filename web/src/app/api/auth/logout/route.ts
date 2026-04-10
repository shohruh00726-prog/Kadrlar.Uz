import { NextResponse } from "next/server";
import { clearSessionCookieOnResponse } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  return clearSessionCookieOnResponse(NextResponse.json({ ok: true }));
}
