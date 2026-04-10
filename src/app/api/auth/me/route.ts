import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-user";
import { parseLanguageList, parseStringArray } from "@/lib/json-fields";

export async function GET() {
  const ctx = await requireUser();
  if (!ctx) return NextResponse.json({ user: null }, { status: 401 });

  const { user } = ctx;
  const ep = user.employeeProfile;
  const emp = user.employerProfile;
  const tm = user as typeof user & {
    teamMemberships: {
      id: string;
      roleInTeam: string | null;
      isLeader: boolean;
      team: {
        id: string;
        teamName: string;
        teamLogoUrl: string | null;
        isPublic: boolean;
        teamViews: number;
      };
    }[];
  };

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      userType: user.userType,
      fullName: user.fullName,
      phone: user.phone,
      city: user.city,
      profilePhotoUrl: user.profilePhotoUrl,
      preferredLanguage: user.preferredLanguage,
      theme: user.theme,
      onboardingEmployeeCompleted: user.onboardingEmployeeCompleted,
      onboardingEmployerCompleted: user.onboardingEmployerCompleted,
      employeeProfile: ep
        ? {
            ...ep,
            skills: parseStringArray(ep.skills),
            workTypes: parseStringArray(ep.workTypes),
            languages: parseLanguageList(ep.languages),
          }
        : null,
      employerProfile: emp,
      teamMemberships: tm.teamMemberships.map((row) => ({
        id: row.id,
        roleInTeam: row.roleInTeam,
        isLeader: row.isLeader,
        team: row.team
          ? {
              id: row.team.id,
              teamName: row.team.teamName,
              teamLogoUrl: row.team.teamLogoUrl,
              isPublic: row.team.isPublic,
              teamViews: row.team.teamViews,
            }
          : null,
      })),
    },
  });
}
