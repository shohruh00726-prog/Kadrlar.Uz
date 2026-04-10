import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { createNotification } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id: teamId } = await params;
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: teamRow } = await sb.from("teams").select("*").eq("id", teamId).maybeSingle();
  if (!teamRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const team = teamRow as Record<string, unknown>;
  const teamName = team.team_name as string;

  const { data: members } = await sb.from("team_members").select("*").eq("team_id", teamId);
  const me = (members ?? []).find((m) => m.user_id === s.userId && m.status === "active");
  if (!me) return NextResponse.json({ error: "You are not an active member" }, { status: 400 });

  const activeOthers = (members ?? []).filter((m) => m.status === "active" && m.user_id !== s.userId);

  if (me.is_leader && activeOthers.length > 0) {
    return NextResponse.json(
      { error: "Assign a new leader or remove other members before leaving your team." },
      { status: 400 },
    );
  }

  const { data: leaverRow } = await sb.from("users").select("full_name").eq("id", s.userId).maybeSingle();
  const leaverName = (leaverRow?.full_name as string) ?? "A member";

  if (me.is_leader && activeOthers.length === 0) {
    await sb.from("teams").delete().eq("id", teamId);
    return NextResponse.json({ ok: true, teamDeleted: true });
  }

  await sb.from("team_members").delete().eq("id", me.id as string);

  await createNotification({
    userId: team.leader_id as string,
    type: "team_member_left",
    title: `${leaverName} left the team`,
    body: `They left ${teamName}.`,
    relatedId: teamId,
  });

  const { count: activeLeft } = await sb
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("status", "active");
  if ((activeLeft ?? 0) < 2) {
    await sb.from("teams").update({ is_public: false }).eq("id", teamId);
  }

  return NextResponse.json({ ok: true });
}
