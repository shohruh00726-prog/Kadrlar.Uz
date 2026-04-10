import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";

const defaults: Record<string, string> = {
  usd_to_uzs_rate: "12500",
  max_skills_per_profile: "15",
  max_team_size: "10",
  maintenance_mode: "false",
  ff_teams: "true",
  ff_reviews: "true",
  ff_verification: "true",
};

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabaseAdmin();
  const { data: rows } = await sb.from("app_settings").select("*").in("key", Object.keys(defaults));
  const merged = { ...defaults };
  for (const r of rows ?? []) merged[r.key as string] = r.value as string;
  return NextResponse.json({ settings: merged });
}

const patchSchema = z.object({
  settings: z.record(z.string(), z.string()),
});

export async function PATCH(req: Request) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(parsed.data.settings)) {
    await sb.from("app_settings").upsert(
      { key, value, updated_by: ctx.admin.id, updated_at: now },
      { onConflict: "key" },
    );
  }
  await logAdminAction({
    adminId: ctx.admin.id,
    actionType: "update_platform_settings",
    notes: JSON.stringify(parsed.data.settings),
  });
  return NextResponse.json({ ok: true });
}
