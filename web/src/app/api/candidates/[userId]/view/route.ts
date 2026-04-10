import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { createNotification } from "@/lib/notify";

type Params = { params: Promise<{ userId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { userId: employeeUserId } = await params;
  const s = await requireSession();
  if (!s || s.role !== "employer") {
    return NextResponse.json({ error: "Only employers track views" }, { status: 403 });
  }
  if (s.userId === employeeUserId) {
    return NextResponse.json({ ok: true });
  }

  const sb = getSupabaseAdmin();
  const { data: profile } = await sb.from("employee_profiles").select("id, profile_views").eq("user_id", employeeUserId).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nextViews = ((profile.profile_views as number) ?? 0) + 1;
  await sb.from("employee_profiles").update({ profile_views: nextViews }).eq("id", profile.id as string);
  await sb.from("profile_view_logs").insert({
    employer_id: s.userId,
    employee_id: employeeUserId,
  });

  const { data: settings } = await sb
    .from("users")
    .select("notification_settings")
    .eq("id", employeeUserId)
    .maybeSingle();
  let allowViewNotif = true;
  if (settings?.notification_settings) {
    try {
      const o = JSON.parse(settings.notification_settings as string) as Record<string, boolean>;
      if (o.profileViewed === false) allowViewNotif = false;
    } catch {
      /* ignore */
    }
  }
  if (allowViewNotif) {
    await createNotification({
      userId: employeeUserId,
      type: "profile_viewed",
      title: "Someone viewed your profile",
      body: "An employer just viewed your profile. Make sure it's complete!",
    });
  }

  return NextResponse.json({ ok: true });
}
