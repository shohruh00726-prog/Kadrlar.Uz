import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { mapUserRow, mapEmployeeProfileRow } from "@/lib/db/mappers";

function groupLabel(d: Date) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  const startWeek = new Date(startToday);
  startWeek.setDate(startWeek.getDate() - 7);
  if (d >= startToday) return "Today";
  if (d >= startYesterday) return "Yesterday";
  if (d >= startWeek) return "This Week";
  return "Earlier";
}

export async function GET() {
  const s = await requireSession();
  if (!s || s.role !== "employer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  const { data: rows } = await sb
    .from("profile_view_logs")
    .select("*")
    .eq("employer_id", s.userId)
    .order("viewed_at", { ascending: false })
    .limit(50);

  const ids = [...new Set((rows ?? []).map((r) => r.employee_id as string))];
  const { data: userRows } =
    ids.length > 0
      ? await sb.from("users").select("*, employee_profiles(*)").in("id", ids)
      : { data: [] as Record<string, unknown>[] };
  const byId = new Map(
    (userRows ?? []).map((u) => {
      const ur = u as Record<string, unknown>;
      const epArr = ur.employee_profiles as Record<string, unknown>[] | undefined;
      const ep = epArr?.[0] ? mapEmployeeProfileRow(epArr[0]) : null;
      return [ur.id as string, { user: mapUserRow(ur), ep }];
    }),
  );

  type Enriched = {
    employeeId: string;
    fullName: string;
    jobTitle: string;
    viewedAt: Date;
  };
  const enriched = (rows ?? [])
    .map((r) => {
      const pack = byId.get(r.employee_id as string);
      if (!pack) return null;
      return {
        employeeId: r.employee_id as string,
        fullName: pack.user.fullName,
        jobTitle: pack.ep?.jobTitle ?? "Professional",
        viewedAt: new Date(r.viewed_at as string),
      };
    })
    .filter(Boolean) as Enriched[];

  const grouped: Record<string, Enriched[]> = {};
  for (const row of enriched) {
    const key = groupLabel(row.viewedAt);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }

  return NextResponse.json({ grouped });
}
