import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/session";
import { parseLanguageList, parseStringArray } from "@/lib/json-fields";
import {
  mapUserRow,
  mapEmployeeProfileRow,
  mapWorkExperienceRow,
  mapEmployeeProjectRow,
  mapCertificationRow,
  mapTeamRow,
  mapTeamMemberRow,
} from "@/lib/db/mappers";

type Params = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { userId } = await params;
  const sb = getSupabaseAdmin();

  const { data: epRow } = await sb.from("employee_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (!epRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const epBase = mapEmployeeProfileRow(epRow as Record<string, unknown>);
  if (!epBase.published || !epBase.isProfilePublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: uRow } = await sb.from("users").select("*").eq("id", userId).maybeSingle();
  if (!uRow || (uRow as Record<string, unknown>).is_suspended) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const user = mapUserRow(uRow as Record<string, unknown>);

  const epId = epBase.id;
  const [{ data: wex }, { data: proj }, { data: certs }] = await Promise.all([
    sb.from("work_experiences").select("*").eq("employee_id", epId).order("sort_order", { ascending: true }),
    sb.from("employee_projects").select("*").eq("employee_id", epId).order("sort_order", { ascending: true }),
    sb.from("certifications").select("*").eq("employee_id", epId),
  ]);
  const workExperiences = (wex ?? []).map((r) => mapWorkExperienceRow(r as Record<string, unknown>));
  const projects = (proj ?? []).map((r) => mapEmployeeProjectRow(r as Record<string, unknown>));
  const certifications = (certs ?? []).map((r) => mapCertificationRow(r as Record<string, unknown>));

  const session = await getSession();
  const viewerIsEmployer = session?.typ === "employer";
  const viewerId = session?.sub;
  const isOwn = viewerId === userId;

  const { data: saved } =
    viewerIsEmployer && viewerId
      ? await sb
          .from("saved_candidates")
          .select("*")
          .eq("employer_id", viewerId)
          .eq("employee_id", userId)
          .maybeSingle()
      : { data: null };

  const { data: tmRaw } = await sb
    .from("team_members")
    .select("*, teams(*)")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  let teamMember: ReturnType<typeof mapTeamMemberRow> | null = null;
  let teamMapped: ReturnType<typeof mapTeamRow> | null = null;
  if (tmRaw) {
    const row = tmRaw as Record<string, unknown>;
    const teamR = row.teams as Record<string, unknown>;
    const { teams: _t, ...mem } = row;
    teamMember = mapTeamMemberRow(mem, teamR);
    teamMapped = teamR ? mapTeamRow(teamR) : null;
  }

  const { data: idVerification } = await sb
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "employee_id_verification")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: phoneVerification } = await sb
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "phone_verification")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let idStatus = "none";
  if (idVerification?.body) {
    try {
      idStatus = (JSON.parse(idVerification.body as string) as { status?: string }).status ?? "none";
    } catch {
      idStatus = "none";
    }
  }
  let phoneStatus = "none";
  if (phoneVerification?.body) {
    try {
      phoneStatus = (JSON.parse(phoneVerification.body as string) as { status?: string }).status ?? "none";
    } catch {
      phoneStatus = "none";
    }
  }

  const profileData = {
    ...epBase,
    workExperiences,
    projects,
    certifications,
  };

  return NextResponse.json({
    candidate: {
      userId: epBase.userId,
      fullName: user.fullName,
      verification: {
        emailVerified: user.isVerified,
        phoneVerified: phoneStatus === "approved",
        idVerified: idStatus === "approved",
      },
      city: user.city,
      profilePhotoUrl: user.profilePhotoUrl,
      contactVisible: epBase.contactVisible,
      showProfileViews: epBase.showProfileViews,
      email: isOwn || (viewerIsEmployer && epBase.contactVisible) ? user.email : null,
      phone: isOwn || (viewerIsEmployer && epBase.contactVisible) ? user.phone : null,
      profile: {
        ...profileData,
        skills: parseStringArray(epBase.skills),
        workTypes: parseStringArray(epBase.workTypes),
        languages: parseLanguageList(epBase.languages),
        profileViews: epBase.showProfileViews || isOwn ? epBase.profileViews : null,
      },
      saved: !!saved,
      savedNotes: saved?.notes ?? null,
      team:
        teamMember && teamMapped
          ? {
              id: teamMapped.id,
              name: teamMapped.teamName,
              role: teamMember.roleInTeam,
              logoUrl: teamMapped.teamLogoUrl,
              isPublic: teamMapped.isPublic,
            }
          : null,
    },
    viewer: { role: session?.typ ?? null, userId: viewerId ?? null },
  });
}
