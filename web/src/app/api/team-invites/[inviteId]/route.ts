import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { createNotification } from "@/lib/notify";
import { parseStringArray } from "@/lib/json-fields";
import { mapTeamRow, mapUserRow, mapEmployeeProfileRow, mapTeamMemberRow } from "@/lib/db/mappers";

type Params = { params: Promise<{ inviteId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { inviteId } = await params;
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: inv } = await sb.from("team_invites").select("*").eq("id", inviteId).maybeSingle();
  if (!inv || inv.invitee_user_id !== s.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (inv.status !== "pending") {
    return NextResponse.json({ error: "This invitation is no longer active" }, { status: 410 });
  }

  const teamId = inv.team_id as string;
  const { data: teamRow } = await sb.from("teams").select("*").eq("id", teamId).maybeSingle();
  if (!teamRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const t = mapTeamRow(teamRow as Record<string, unknown>);

  const { data: leaderRow } = await sb
    .from("users")
    .select("*, employee_profiles(*)")
    .eq("id", t.leaderId)
    .maybeSingle();
  const lr = leaderRow as Record<string, unknown> | null;
  const lEpArr = lr?.employee_profiles as Record<string, unknown>[] | undefined;
  const leaderEp = lEpArr?.[0] ? mapEmployeeProfileRow(lEpArr[0]) : null;
  const leader = lr ? { ...mapUserRow(lr), employeeProfile: leaderEp } : null;

  const { data: memRows } = await sb
    .from("team_members")
    .select("*, users(*, employee_profiles(*))")
    .eq("team_id", teamId)
    .eq("status", "active");

  const members = (memRows ?? []).map((raw) => {
    const row = raw as Record<string, unknown>;
    const uRaw = row.users as Record<string, unknown>;
    const { users: _u, ...memOnly } = row;
    const epArr = uRaw?.employee_profiles as Record<string, unknown>[] | undefined;
    const ep = epArr?.[0] ? mapEmployeeProfileRow(epArr[0]) : null;
    return {
      ...mapTeamMemberRow(memOnly as Record<string, unknown>),
      user: { ...mapUserRow(uRaw), employeeProfile: ep },
    };
  });

  return NextResponse.json({
    invite: {
      id: inv.id,
      team: {
        id: t.id,
        teamName: t.teamName,
        tagline: t.tagline,
        description: t.description,
        category: t.category,
        city: t.city,
        leader: {
          userId: t.leaderId,
          fullName: leader?.fullName ?? "",
          profilePhotoUrl: leader?.profilePhotoUrl,
          jobTitle: leader?.employeeProfile?.jobTitle,
        },
        members: members.map((m) => ({
          userId: m.userId,
          fullName: m.user.fullName,
          profilePhotoUrl: m.user.profilePhotoUrl,
          roleInTeam: m.roleInTeam,
          isLeader: m.isLeader,
          jobTitle: m.user.employeeProfile?.jobTitle,
          skills: m.user.employeeProfile
            ? parseStringArray(m.user.employeeProfile.skills).slice(0, 5)
            : [],
        })),
      },
    },
  });
}

export async function POST(req: Request, { params }: Params) {
  const { inviteId } = await params;
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body?.action as string | undefined;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action must be accept or decline" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data: inv } = await sb.from("team_invites").select("*").eq("id", inviteId).maybeSingle();
  if (!inv || inv.invitee_user_id !== s.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (inv.status !== "pending") {
    return NextResponse.json({ error: "Invitation already used" }, { status: 400 });
  }

  const { data: existingMember } = await sb.from("team_members").select("*").eq("user_id", s.userId).maybeSingle();
  if (existingMember?.status === "active") {
    return NextResponse.json({ error: "You are already in a team" }, { status: 400 });
  }

  const { data: invitee } = await sb.from("users").select("full_name").eq("id", s.userId).maybeSingle();
  const inviteeName = (invitee?.full_name as string) ?? "Someone";

  const teamId = inv.team_id as string;
  const { data: teamRow } = await sb.from("teams").select("team_name, leader_id").eq("id", teamId).maybeSingle();
  const teamName = (teamRow?.team_name as string) ?? "";

  if (action === "decline") {
    await sb.from("team_invites").update({ status: "declined" }).eq("id", inviteId);
    await createNotification({
      userId: teamRow!.leader_id as string,
      type: "team_invite_declined",
      title: `${inviteeName} declined the invitation`,
      body: `They declined to join ${teamName}.`,
      relatedId: teamId,
    });
    return NextResponse.json({ ok: true });
  }

  const { count: activeOnTeam } = await sb
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("status", "active");
  if ((activeOnTeam ?? 0) >= 10) {
    return NextResponse.json({ error: "This team is full" }, { status: 400 });
  }

  await sb.from("team_invites").update({ status: "accepted" }).eq("id", inviteId);
  await sb.from("team_members").upsert(
    {
      team_id: teamId,
      user_id: s.userId,
      role_in_team: "Team member",
      is_leader: false,
      status: "active",
    },
    { onConflict: "user_id" },
  );

  await createNotification({
    userId: teamRow!.leader_id as string,
    type: "team_invite_accepted",
    title: `${inviteeName} accepted your invitation and joined the team!`,
    body: `They are now part of ${teamName}.`,
    relatedId: teamId,
  });

  return NextResponse.json({ ok: true, teamId });
}
