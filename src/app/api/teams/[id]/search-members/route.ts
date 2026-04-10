import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { parseStringArray } from "@/lib/json-fields";
import { mapUserRow, mapEmployeeProfileRow } from "@/lib/db/mappers";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id: teamId } = await params;
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: teamRow } = await sb.from("teams").select("leader_id").eq("id", teamId).maybeSingle();
  if (!teamRow || teamRow.leader_id !== s.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ users: [] });

  const { data: inAnyTeam } = await sb.from("team_members").select("user_id").eq("status", "active");
  const busy = new Set((inAnyTeam ?? []).map((m) => m.user_id as string));

  const { data: pendingAnywhere } = await sb
    .from("team_invites")
    .select("invitee_user_id")
    .eq("status", "pending");
  for (const i of pendingAnywhere ?? []) busy.add(i.invitee_user_id as string);
  busy.add(teamRow.leader_id as string);

  const pattern = `%${q}%`;
  const { data: candidates } = await sb
    .from("users")
    .select("*, employee_profiles(*)")
    .eq("user_type", "employee")
    .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
    .limit(40);

  const users = (candidates ?? [])
    .filter((u) => !busy.has(u.id as string))
    .slice(0, 15)
    .map((u) => {
      const ur = u as Record<string, unknown>;
      const epArr = ur.employee_profiles as Record<string, unknown>[] | undefined;
      const ep = epArr?.[0] ? mapEmployeeProfileRow(epArr[0]) : null;
      const mu = mapUserRow(ur);
      return {
        userId: mu.id,
        fullName: mu.fullName,
        email: mu.email,
        profilePhotoUrl: mu.profilePhotoUrl,
        jobTitle: ep?.jobTitle,
        skills: ep ? parseStringArray(ep.skills).slice(0, 5) : [],
      };
    });

  return NextResponse.json({ users });
}
