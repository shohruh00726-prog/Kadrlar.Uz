import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession, type UserRole } from "@/lib/session";
import { mapEmployeeProfileRow, mapEmployerProfileRow, mapTeamMemberRow, mapUserRow } from "@/lib/db/mappers";

export async function requireSession(): Promise<{ userId: string; role: UserRole } | null> {
  const s = await getSession();
  if (!s) return null;
  return { userId: s.sub, role: s.typ };
}

export async function getUserWithProfiles(userId: string) {
  const sb = getSupabaseAdmin();
  const { data: userRow, error: uErr } = await sb.from("users").select("*").eq("id", userId).maybeSingle();
  if (uErr || !userRow) return null;

  const [epRes, erRes, tmRes] = await Promise.all([
    sb.from("employee_profiles").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("employer_profiles").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("team_members").select("*, teams(*)").eq("user_id", userId).eq("status", "active"),
  ]);

  const user = mapUserRow(userRow as Record<string, unknown>);
  const employeeProfile = epRes.data ? mapEmployeeProfileRow(epRes.data as Record<string, unknown>) : null;
  const employerProfile = erRes.data ? mapEmployerProfileRow(erRes.data as Record<string, unknown>) : null;

  const teamMemberships = (tmRes.data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>;
    const tr = row.teams as Record<string, unknown> | undefined | null;
    const { teams: _x, ...memberFields } = row;
    return tr ? mapTeamMemberRow(memberFields, tr) : mapTeamMemberRow(memberFields);
  });

  return {
    ...user,
    employeeProfile,
    employerProfile,
    teamMemberships,
  };
}

export async function requireUser() {
  const s = await requireSession();
  if (!s) return null;
  const user = await getUserWithProfiles(s.userId);
  if (!user) return null;
  return { session: s, user };
}
