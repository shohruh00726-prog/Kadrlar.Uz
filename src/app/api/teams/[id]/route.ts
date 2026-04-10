import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { getSession } from "@/lib/session";
import { parseStringArray, stringifyStringArray } from "@/lib/json-fields";
import { createNotification } from "@/lib/notify";
import { teamIsListable } from "@/lib/team-utils";
import { mapTeamRow, mapUserRow, mapEmployeeProfileRow, mapTeamMemberRow } from "@/lib/db/mappers";

type Params = { params: Promise<{ id: string }> };

type MemberVm = ReturnType<typeof mapTeamMemberRow> & {
  user: ReturnType<typeof mapUserRow> & { employeeProfile: ReturnType<typeof mapEmployeeProfileRow> | null };
};

export async function GET(req: Request, { params }: Params) {
  try {
    return await getTeam(req, await params);
  } catch (e) {
    console.error("[api/teams/[id]] GET", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function getTeam(req: Request, params: { id: string }) {
  const { id } = params;
  const { searchParams } = new URL(req.url);
  const manage = searchParams.get("manage") === "1";

  const session = await getSession();
  const sb = getSupabaseAdmin();

  const { data: teamRow } = await sb.from("teams").select("*").eq("id", id).maybeSingle();
  if (!teamRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const teamBase = mapTeamRow(teamRow as Record<string, unknown>);

  const { data: memberRows } = await sb
    .from("team_members")
    .select("*, users(*, employee_profiles(*))")
    .eq("team_id", id);

  const members: MemberVm[] = (memberRows ?? []).map((raw) => {
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

  const { data: leaderRow } = await sb
    .from("users")
    .select("*, employee_profiles(*)")
    .eq("id", teamBase.leaderId)
    .maybeSingle();
  const lr = leaderRow as Record<string, unknown> | null;
  const lepArr = lr?.employee_profiles as Record<string, unknown>[] | undefined;
  const leaderEp = lepArr?.[0] ? mapEmployeeProfileRow(lepArr[0]) : null;
  const leader = lr ? { ...mapUserRow(lr), employeeProfile: leaderEp } : null;

  const { data: projRows } = await sb
    .from("team_projects")
    .select("*")
    .eq("team_id", id)
    .order("sort_order", { ascending: true });
  const projects = (projRows ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    description: (p.description as string | null) ?? null,
    url: (p.url as string | null) ?? null,
    imageUrl: (p.image_url as string | null) ?? null,
    completedAt: p.completed_at ? new Date(p.completed_at as string) : null,
  }));

  const { data: invRows } = await sb.from("team_invites").select("*").eq("team_id", id).eq("status", "pending");
  const invUserIds = [...new Set((invRows ?? []).map((i) => i.invitee_user_id as string))];
  const { data: invUserRows } =
    invUserIds.length > 0
      ? await sb.from("users").select("*, employee_profiles(*)").in("id", invUserIds)
      : { data: [] as Record<string, unknown>[] };
  const invUserById = new Map(
    (invUserRows ?? []).map((u) => {
      const ur = u as Record<string, unknown>;
      const epArr2 = ur.employee_profiles as Record<string, unknown>[] | undefined;
      const ep2 = epArr2?.[0] ? mapEmployeeProfileRow(epArr2[0]) : null;
      return [ur.id as string, { ...mapUserRow(ur), employeeProfile: ep2 }];
    }),
  );
  const invites = (invRows ?? []).map((raw) => {
    const row = raw as Record<string, unknown>;
    const uid = row.invitee_user_id as string;
    const invitee = invUserById.get(uid)!;
    return {
      id: row.id as string,
      inviteeUserId: uid,
      invitee,
    };
  });

  const team = {
    ...teamBase,
    leader: leader!,
    members,
    projects,
    invites,
  };

  const activeMembers = team.members.filter((m) => m.status === "active");
  const listable = teamIsListable(team.isPublic, team.members);

  const isLeader = session?.sub === team.leaderId;
  const isActiveMember = activeMembers.some((m) => m.userId === session?.sub);

  if (manage) {
    if (!session || !isLeader) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const canView = listable || isLeader || isActiveMember;
    if (!canView) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let saved = false;
  if (session?.typ === "employer") {
    const { data: st } = await sb
      .from("saved_teams")
      .select("id")
      .eq("employer_id", session.sub)
      .eq("team_id", id)
      .maybeSingle();
    saved = !!st;
  }

  let viewsIncremented = false;
  let displayViews = team.teamViews;
  if (!manage) {
    const shouldCountView = !isLeader && !isActiveMember;

    if (shouldCountView) {
      const next = team.teamViews + 1;
      await sb.from("teams").update({ team_views: next }).eq("id", id);
      displayViews = next;
      viewsIncremented = true;
    }

    if (shouldCountView && session?.typ === "employer" && session.sub) {
      const { data: existing } = await sb
        .from("team_employer_views")
        .select("team_id")
        .eq("team_id", id)
        .eq("employer_id", session.sub)
        .maybeSingle();
      if (!existing) {
        await sb.from("team_employer_views").insert({ team_id: id, employer_id: session.sub });
        const { data: empRow } = await sb
          .from("users")
          .select("*, employer_profiles(*)")
          .eq("id", session.sub)
          .maybeSingle();
        const er = empRow as Record<string, unknown> | null;
        const erA = er?.employer_profiles as Record<string, unknown>[] | undefined;
        const company = (erA?.[0]?.company_name as string) ?? (er?.full_name as string) ?? "An employer";
        await createNotification({
          userId: team.leaderId,
          type: "team_viewed",
          title: "An employer viewed your team profile",
          body: `${company} opened ${team.teamName}.`,
          relatedId: id,
        });
        for (const m of activeMembers) {
          if (m.userId === team.leaderId) continue;
          await createNotification({
            userId: m.userId,
            type: "team_viewed",
            title: `Your team ${team.teamName} was viewed by an employer`,
            body: `${company} viewed your team's profile.`,
            relatedId: id,
          });
        }
      }
    }
  }

  const fresh = { ...team, teamViews: displayViews };
  const act = fresh.members.filter((x) => x.status === "active");

  const mapMember = (m: MemberVm) => {
    const skills = m.user.employeeProfile ? parseStringArray(m.user.employeeProfile.skills) : [];
    return {
      userId: m.userId,
      fullName: m.user.fullName,
      profilePhotoUrl: m.user.profilePhotoUrl,
      roleInTeam: m.roleInTeam,
      isLeader: m.isLeader,
      status: m.status,
      joinedAt: m.joinedAt,
      jobTitle: m.user.employeeProfile?.jobTitle,
      salaryMin: m.user.employeeProfile?.salaryMin,
      salaryMax: m.user.employeeProfile?.salaryMax,
      salaryNegotiable: m.user.employeeProfile?.salaryNegotiable,
      skillsTop: skills.slice(0, 3),
    };
  };

  return NextResponse.json({
    team: {
      id: fresh.id,
      teamName: fresh.teamName,
      teamLogoUrl: fresh.teamLogoUrl,
      tagline: fresh.tagline,
      description: fresh.description,
      category: fresh.category,
      skills: parseStringArray(fresh.skills),
      priceMin: fresh.priceMin,
      priceMax: fresh.priceMax,
      priceNegotiable: fresh.priceNegotiable,
      priceType: fresh.priceType,
      workTypes: parseStringArray(fresh.workTypes),
      availability: fresh.availability,
      city: fresh.city,
      isPublic: fresh.isPublic,
      teamViews: fresh.teamViews,
      listable: teamIsListable(fresh.isPublic, fresh.members),
      leader: {
        userId: fresh.leaderId,
        fullName: fresh.leader.fullName,
        profilePhotoUrl: fresh.leader.profilePhotoUrl,
        jobTitle: fresh.leader.employeeProfile?.jobTitle,
      },
      members: act.map(mapMember),
      allMembers: manage ? fresh.members.map(mapMember) : undefined,
      projects: fresh.projects,
      pendingInvites: manage
        ? fresh.invites.map((inv) => ({
            id: inv.id,
            userId: inv.inviteeUserId,
            fullName: inv.invitee.fullName,
            profilePhotoUrl: inv.invitee.profilePhotoUrl,
            jobTitle: inv.invitee.employeeProfile?.jobTitle,
          }))
        : undefined,
      saved,
    },
  });
}

const patchSchema = z.object({
  teamName: z.string().min(2).max(120).optional(),
  tagline: z.string().max(100).nullable().optional(),
  description: z.string().max(600).nullable().optional(),
  category: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  availability: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  skills: z.array(z.string()).max(20).optional(),
  workTypes: z.array(z.string()).optional(),
  priceMin: z.number().nullable().optional(),
  priceMax: z.number().nullable().optional(),
  priceNegotiable: z.boolean().optional(),
  priceType: z.enum(["monthly", "project"]).optional(),
  teamLogoUrl: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabaseAdmin();
  const { data: teamRow } = await sb.from("teams").select("*").eq("id", id).maybeSingle();
  if (!teamRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const team = mapTeamRow(teamRow as Record<string, unknown>);
  if (team.leaderId !== s.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data: mems } = await sb.from("team_members").select("*").eq("team_id", id);

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const b = parsed.data;

  if (b.isPublic === true) {
    const n = (mems ?? []).filter((m) => m.status === "active").length;
    if (n < 2) {
      return NextResponse.json(
        { error: "Add at least one more active member before making the team public." },
        { status: 400 },
      );
    }
  }

  const patchDb: Record<string, unknown> = {};
  if (b.teamName !== undefined) patchDb.team_name = b.teamName;
  if (b.tagline !== undefined) patchDb.tagline = b.tagline;
  if (b.description !== undefined) patchDb.description = b.description;
  if (b.category !== undefined) patchDb.category = b.category;
  if (b.city !== undefined) patchDb.city = b.city;
  if (b.availability !== undefined) patchDb.availability = b.availability;
  if (b.isPublic !== undefined) patchDb.is_public = b.isPublic;
  if (b.skills) patchDb.skills = stringifyStringArray(b.skills);
  if (b.workTypes) patchDb.work_types = stringifyStringArray(b.workTypes);
  if (b.priceMin !== undefined) patchDb.price_min = b.priceMin;
  if (b.priceMax !== undefined) patchDb.price_max = b.priceMax;
  if (b.priceNegotiable !== undefined) patchDb.price_negotiable = b.priceNegotiable;
  if (b.priceType !== undefined) patchDb.price_type = b.priceType;
  if (b.teamLogoUrl !== undefined) patchDb.team_logo_url = b.teamLogoUrl;

  await sb.from("teams").update(patchDb).eq("id", id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabaseAdmin();
  const { data: teamRow } = await sb.from("teams").select("leader_id").eq("id", id).maybeSingle();
  if (!teamRow || teamRow.leader_id !== s.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await sb.from("teams").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
