import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { createNotification } from "@/lib/notify";
import { parseStringArray } from "@/lib/json-fields";
import { teamIsListable } from "@/lib/team-utils";
import { mapTeamRow } from "@/lib/db/mappers";

export async function GET() {
  const s = await requireSession();
  if (!s || s.role !== "employer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: rows } = await sb
    .from("saved_teams")
    .select("*")
    .eq("employer_id", s.userId)
    .order("saved_at", { ascending: false });

  const teamIds = [...new Set((rows ?? []).map((r) => r.team_id as string))];
  const { data: teamsRaw } =
    teamIds.length > 0 ? await sb.from("teams").select("*").in("id", teamIds) : { data: [] };
  const teamsById = new Map((teamsRaw ?? []).map((t) => [t.id as string, mapTeamRow(t as Record<string, unknown>)]));

  const { data: allMembers } =
    teamIds.length > 0
      ? await sb.from("team_members").select("*").in("team_id", teamIds).eq("status", "active")
      : { data: [] as Record<string, unknown>[] };
  const membersByTeam = new Map<string, { status: string }[]>();
  for (const m of allMembers ?? []) {
    const tid = m.team_id as string;
    if (!membersByTeam.has(tid)) membersByTeam.set(tid, []);
    membersByTeam.get(tid)!.push({ status: m.status as string });
  }

  type SavedRow = {
    teamId: string;
    teamName: string;
    tagline: string | null;
    city: string | null;
    category: string | null;
    memberCount: number;
    skills: string[];
    priceMin: number | null;
    priceMax: number | null;
    priceNegotiable: boolean;
    savedAt: Date;
  };
  const list: SavedRow[] = [];
  for (const r of rows ?? []) {
    const t = teamsById.get(r.team_id as string);
    if (!t) continue;
    const members = membersByTeam.get(t.id) ?? [];
    if (!teamIsListable(t.isPublic, members)) continue;
    list.push({
      teamId: t.id,
      teamName: t.teamName,
      tagline: t.tagline,
      city: t.city,
      category: t.category,
      memberCount: members.length,
      skills: parseStringArray(t.skills).slice(0, 5),
      priceMin: t.priceMin,
      priceMax: t.priceMax,
      priceNegotiable: t.priceNegotiable,
      savedAt: new Date(r.saved_at as string),
    });
  }

  return NextResponse.json({ saved: list });
}

const postSchema = z.object({ teamId: z.string().uuid() });

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s || s.role !== "employer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json();
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: teamRow } = await sb.from("teams").select("*").eq("id", parsed.data.teamId).maybeSingle();
  if (!teamRow) return NextResponse.json({ error: "Team not available" }, { status: 400 });
  const team = mapTeamRow(teamRow as Record<string, unknown>);
  const { data: members } = await sb
    .from("team_members")
    .select("*")
    .eq("team_id", parsed.data.teamId)
    .eq("status", "active");
  const memList = (members ?? []).map((m) => ({ status: m.status as string }));
  if (!teamIsListable(team.isPublic, memList)) {
    return NextResponse.json({ error: "Team not available" }, { status: 400 });
  }

  await sb.from("saved_teams").upsert(
    { employer_id: s.userId, team_id: parsed.data.teamId },
    { onConflict: "employer_id,team_id" },
  );

  const { data: empRow } = await sb
    .from("users")
    .select("*, employer_profiles(*)")
    .eq("id", s.userId)
    .maybeSingle();
  const er = empRow as Record<string, unknown> | null;
  const erArr = er?.employer_profiles as Record<string, unknown>[] | undefined;
  const company =
    (erArr?.[0]?.company_name as string) ?? (er?.full_name as string) ?? "An employer";

  await createNotification({
    userId: team.leaderId,
    type: "team_saved",
    title: "An employer saved your team",
    body: `${company} bookmarked ${team.teamName}.`,
    relatedId: team.id,
  });
  for (const m of members ?? []) {
    if ((m.user_id as string) === team.leaderId) continue;
    await createNotification({
      userId: m.user_id as string,
      type: "team_saved",
      title: `${team.teamName} was saved by an employer`,
      body: `${company} added your team to saved list.`,
      relatedId: team.id,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const s = await requireSession();
  if (!s || s.role !== "employer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  const sb = getSupabaseAdmin();
  await sb.from("saved_teams").delete().eq("employer_id", s.userId).eq("team_id", teamId);
  return NextResponse.json({ ok: true });
}
