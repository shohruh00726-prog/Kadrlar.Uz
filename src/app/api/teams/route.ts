import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { parseStringArray, stringifyStringArray } from "@/lib/json-fields";
import { JOB_CATEGORIES } from "@/lib/constants";
import { teamIsListable } from "@/lib/team-utils";
import { initialFromName } from "@/lib/avatar-style";
import { mapTeamRow, mapUserRow, mapTeamMemberRow } from "@/lib/db/mappers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const category = searchParams.get("category") || "";
  const city = searchParams.get("city") || "";
  const availability = searchParams.get("availability") || "";
  const workType = searchParams.get("workType") || "";
  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");
  const memberSize = searchParams.get("memberSize") || "";

  const sb = getSupabaseAdmin();
  const { data: teamRows } = await sb
    .from("teams")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const teams = (teamRows ?? []).map((r) => mapTeamRow(r as Record<string, unknown>));
  const teamIds = teams.map((t) => t.id);
  const { data: allMembers } =
    teamIds.length > 0
      ? await sb
          .from("team_members")
          .select("*, users(*)")
          .in("team_id", teamIds)
          .eq("status", "active")
          .order("joined_at", { ascending: true })
      : { data: [] as Record<string, unknown>[] };

  const membersByTeam = new Map<string, { member: ReturnType<typeof mapTeamMemberRow>; user: ReturnType<typeof mapUserRow> }[]>();
  for (const raw of allMembers ?? []) {
    const row = raw as Record<string, unknown>;
    const uRaw = row.users as Record<string, unknown>;
    const { users: _u, ...memOnly } = row;
    const tid = memOnly.team_id as string;
    if (!membersByTeam.has(tid)) membersByTeam.set(tid, []);
    membersByTeam.get(tid)!.push({
      member: mapTeamMemberRow(memOnly as Record<string, unknown>),
      user: mapUserRow(uRaw),
    });
  }

  let rows = teams
    .map((t) => ({
      ...t,
      members: (membersByTeam.get(t.id) ?? []).map((x) => ({ ...x.member, user: x.user })),
    }))
    .filter((t) => teamIsListable(t.isPublic, t.members));

  if (q) {
    rows = rows.filter((t) => {
      const skills = parseStringArray(t.skills).join(" ").toLowerCase();
      const hay = `${t.teamName} ${t.tagline ?? ""} ${t.description ?? ""} ${skills}`.toLowerCase();
      return hay.includes(q);
    });
  }
  if (category && JOB_CATEGORIES.includes(category as (typeof JOB_CATEGORIES)[number])) {
    rows = rows.filter((t) => t.category === category);
  }
  if (city) rows = rows.filter((t) => (t.city || "").toLowerCase() === city.toLowerCase());
  if (availability) rows = rows.filter((t) => t.availability === availability);
  if (workType) {
    rows = rows.filter((t) => parseStringArray(t.workTypes).includes(workType));
  }
  const pMin = priceMin ? Number(priceMin) : null;
  const pMax = priceMax ? Number(priceMax) : null;
  if (pMin != null && !Number.isNaN(pMin)) {
    rows = rows.filter((t) => t.priceNegotiable || (t.priceMax ?? 0) >= pMin);
  }
  if (pMax != null && !Number.isNaN(pMax)) {
    rows = rows.filter((t) => t.priceNegotiable || (t.priceMin ?? 0) <= pMax);
  }
  if (memberSize === "2-3") rows = rows.filter((t) => t.members.length >= 2 && t.members.length <= 3);
  if (memberSize === "4-5") rows = rows.filter((t) => t.members.length >= 4 && t.members.length <= 5);
  if (memberSize === "6+") rows = rows.filter((t) => t.members.length >= 6);

  return NextResponse.json({
    teams: rows.map((t) => {
      const skills = parseStringArray(t.skills);
      const preview = t.members.slice(0, 4).map((m) => ({
        fullName: m.user.fullName,
        initial: initialFromName(m.user.fullName),
      }));
      return {
        id: t.id,
        teamName: t.teamName,
        teamLogoUrl: t.teamLogoUrl,
        tagline: t.tagline,
        category: t.category,
        city: t.city,
        availability: t.availability,
        priceMin: t.priceMin,
        priceMax: t.priceMax,
        priceNegotiable: t.priceNegotiable,
        priceType: t.priceType,
        workTypes: parseStringArray(t.workTypes),
        skills,
        memberCount: t.members.length,
        memberPreview: preview,
        teamViews: t.teamViews,
      };
    }),
  });
}

const createSchema = z.object({
  teamName: z.string().min(2).max(120),
  tagline: z.string().max(100).optional().nullable(),
  description: z.string().max(600).optional().nullable(),
  category: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  availability: z.string().optional().nullable(),
  skills: z.array(z.string()).max(20).default([]),
  workTypes: z.array(z.string()).default([]),
  priceMin: z.number().nullable().optional(),
  priceMax: z.number().nullable().optional(),
  priceNegotiable: z.boolean().optional(),
  priceType: z.enum(["monthly", "project"]).optional(),
  teamLogoUrl: z.string().max(2048).optional().nullable(),
});

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s || s.role !== "employee") {
    return NextResponse.json({ error: "Only employees create teams" }, { status: 403 });
  }
  const sb = getSupabaseAdmin();
  const { data: member } = await sb.from("team_members").select("*").eq("user_id", s.userId).maybeSingle();
  if (member && member.status === "active") {
    return NextResponse.json({ error: "Already in a team" }, { status: 400 });
  }

  const json = await req.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid", details: parsed.error.flatten() }, { status: 400 });
  const b = parsed.data;

  const { data: team, error } = await sb
    .from("teams")
    .insert({
      team_name: b.teamName,
      tagline: b.tagline ?? null,
      description: b.description ?? null,
      category: b.category ?? null,
      city: b.city ?? null,
      availability: b.availability ?? null,
      skills: stringifyStringArray(b.skills),
      work_types: stringifyStringArray(b.workTypes),
      price_min: b.priceMin ?? null,
      price_max: b.priceMax ?? null,
      price_negotiable: b.priceNegotiable ?? false,
      price_type: b.priceType ?? "monthly",
      team_logo_url: b.teamLogoUrl ?? null,
      leader_id: s.userId,
      is_public: false,
    })
    .select("id")
    .single();
  if (error || !team) {
    console.error(error);
    return NextResponse.json({ error: "Could not create team" }, { status: 500 });
  }

  await sb.from("team_members").insert({
    team_id: team.id as string,
    user_id: s.userId,
    is_leader: true,
    role_in_team: "Team lead",
    status: "active",
  });

  return NextResponse.json({ ok: true, teamId: team.id });
}
