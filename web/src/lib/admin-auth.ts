import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { mapAdminUserRow } from "@/lib/db/mappers";
import { getAdminSession } from "@/lib/admin-session";

export async function requireAdmin() {
  const s = await getAdminSession();
  if (!s) return null;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from("admin_users").select("*").eq("id", s.sub).maybeSingle();
  if (error || !data) return null;
  const admin = mapAdminUserRow(data as Record<string, unknown>);
  return { session: s, admin };
}

export async function logAdminAction(input: {
  adminId: string;
  actionType: string;
  targetId?: string | null;
  notes?: string | null;
}) {
  const sb = getSupabaseAdmin();
  await sb.from("admin_actions_log").insert({
    admin_id: input.adminId,
    action_type: input.actionType,
    target_id: input.targetId ?? null,
    notes: input.notes ?? null,
  });
}
