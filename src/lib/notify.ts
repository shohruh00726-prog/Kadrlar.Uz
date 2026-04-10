import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  relatedId?: string | null;
}) {
  const sb = getSupabaseAdmin();
  const { data: row } = await sb
    .from("users")
    .select("notification_settings")
    .eq("id", input.userId)
    .maybeSingle();

  const raw = row?.notification_settings as string | null | undefined;
  if (raw) {
    try {
      const s = JSON.parse(raw) as Record<string, boolean>;
      const key = mapTypeToSettingKey(input.type);
      if (key && s[key] === false) return null;
    } catch {
      /* ignore */
    }
  }

  const { data, error } = await sb
    .from("notifications")
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      related_id: input.relatedId ?? null,
    })
    .select()
    .maybeSingle();
  if (error) return null;
  return data;
}

function mapTypeToSettingKey(type: string): string | null {
  const m: Record<string, string> = {
    new_message: "messages",
    profile_viewed: "profileViewed",
    profile_saved: "profileSaved",
    contact_viewed: "contactViewed",
    team_invite: "teamActivity",
    team_message: "teamActivity",
    candidate_reply: "replies",
    team_viewed: "teamActivity",
    team_saved: "teamActivity",
    team_invite_accepted: "teamActivity",
    team_invite_declined: "teamActivity",
    team_member_left: "teamActivity",
    team_member_removed: "teamActivity",
  };
  return m[type] ?? null;
}
