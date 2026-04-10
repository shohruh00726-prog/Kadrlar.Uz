import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";

type Params = { params: Promise<{ id: string; inviteId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { id: teamId, inviteId } = await params;
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: team } = await sb.from("teams").select("leader_id").eq("id", teamId).maybeSingle();
  if (!team || team.leader_id !== s.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: inv } = await sb.from("team_invites").select("*").eq("id", inviteId).eq("team_id", teamId).maybeSingle();
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (inv.status !== "pending") {
    return NextResponse.json({ error: "Only pending invites can be cancelled" }, { status: 400 });
  }

  await sb.from("team_invites").update({ status: "cancelled" }).eq("id", inviteId);
  return NextResponse.json({ ok: true });
}
