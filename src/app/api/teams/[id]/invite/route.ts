import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { createNotification } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z
  .object({
    email: z.string().email().optional(),
    userId: z.string().uuid().optional(),
  })
  .refine((d) => d.email || d.userId, { message: "email or userId" });

export async function POST(req: Request, { params }: Params) {
  const { id: teamId } = await params;
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabaseAdmin();

  const { data: teamRow } = await sb.from("teams").select("*").eq("id", teamId).maybeSingle();
  if (!teamRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const team = teamRow as Record<string, unknown>;
  if (team.leader_id !== s.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: members } = await sb.from("team_members").select("*").eq("team_id", teamId);
  if ((members ?? []).filter((m) => m.status === "active").length >= 10) {
    return NextResponse.json({ error: "Team is full" }, { status: 400 });
  }

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  let inviteeId = parsed.data.userId;
  if (!inviteeId && parsed.data.email) {
    const { data: u } = await sb.from("users").select("id").eq("email", parsed.data.email.toLowerCase()).maybeSingle();
    inviteeId = u?.id as string | undefined;
  }
  if (!inviteeId) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (inviteeId === s.userId) {
    return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
  }

  const { data: otherPending } = await sb
    .from("team_invites")
    .select("id")
    .eq("invitee_user_id", inviteeId)
    .eq("status", "pending")
    .neq("team_id", teamId)
    .limit(1)
    .maybeSingle();
  if (otherPending) {
    return NextResponse.json(
      { error: "This user already has a pending team invitation" },
      { status: 400 },
    );
  }

  const { data: invitee } = await sb.from("users").select("id, user_type").eq("id", inviteeId).maybeSingle();
  if (!invitee || invitee.user_type !== "employee") {
    return NextResponse.json({ error: "Must be employee" }, { status: 400 });
  }
  const { data: tm } = await sb.from("team_members").select("*").eq("user_id", inviteeId).maybeSingle();
  if (tm && tm.status === "active") {
    return NextResponse.json({ error: "User already in a team" }, { status: 400 });
  }

  const { data: inv, error } = await sb
    .from("team_invites")
    .upsert(
      { team_id: teamId, invitee_user_id: inviteeId, status: "pending" },
      { onConflict: "team_id,invitee_user_id" },
    )
    .select("id")
    .single();
  if (error || !inv) {
    console.error(error);
    return NextResponse.json({ error: "Could not invite" }, { status: 500 });
  }

  const { data: leader } = await sb.from("users").select("full_name").eq("id", team.leader_id as string).maybeSingle();

  await createNotification({
    userId: inviteeId,
    type: "team_invite",
    title: `${(leader?.full_name as string) ?? "Someone"} invited you to join ${team.team_name as string}!`,
    body:
      "You have been invited to join a team on Kadrlar.uz. Review the invitation and accept or decline.",
    relatedId: inv.id as string,
  });

  return NextResponse.json({ ok: true, inviteId: inv.id });
}
