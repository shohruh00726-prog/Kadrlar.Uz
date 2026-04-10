import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { createNotification } from "@/lib/notify";

type Params = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { id: teamId, userId: targetUserId } = await params;
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: teamRow } = await sb.from("teams").select("*").eq("id", teamId).maybeSingle();
  if (!teamRow || teamRow.leader_id !== s.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (targetUserId === s.userId) {
    return NextResponse.json({ error: "Use leave endpoint to remove yourself" }, { status: 400 });
  }

  const { data: member } = await sb
    .from("team_members")
    .select("*")
    .eq("team_id", teamId)
    .eq("user_id", targetUserId)
    .eq("status", "active")
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  await sb.from("team_members").delete().eq("id", member.id as string);

  await createNotification({
    userId: targetUserId,
    type: "team_member_removed",
    title: `You were removed from ${teamRow.team_name as string}`,
    body: "Your individual profile on Kadrlar.uz is unchanged.",
    relatedId: teamId,
  });

  const { count: activeLeft } = await sb
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("status", "active");
  if ((activeLeft ?? 0) < 2 && teamRow.is_public) {
    await sb.from("teams").update({ is_public: false }).eq("id", teamId);
  }

  return NextResponse.json({ ok: true });
}
