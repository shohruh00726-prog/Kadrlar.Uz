import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { mapUserRow, mapEmployeeProfileRow } from "@/lib/db/mappers";

function parseStatus(notes: string | null) {
  if (!notes) return "Interested";
  try {
    const j = JSON.parse(notes) as { status?: string };
    return j.status || "Interested";
  } catch {
    return "Interested";
  }
}

export async function GET() {
  const s = await requireSession();
  if (!s || s.role !== "employer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(startToday);
  weekAgo.setDate(weekAgo.getDate() - 6);

  const sb = getSupabaseAdmin();

  const [{ count: viewsToday }, { data: viewsWeekRows }, { count: messagesSent }, { count: candidatesSaved }, { data: recentViews }, { data: savedRows }] =
    await Promise.all([
      sb
        .from("profile_view_logs")
        .select("*", { count: "exact", head: true })
        .eq("employer_id", s.userId)
        .gte("viewed_at", startToday.toISOString()),
      sb
        .from("profile_view_logs")
        .select("*")
        .eq("employer_id", s.userId)
        .gte("viewed_at", weekAgo.toISOString())
        .order("viewed_at", { ascending: true }),
      sb
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", s.userId)
        .gte("sent_at", startToday.toISOString()),
      sb
        .from("saved_candidates")
        .select("*", { count: "exact", head: true })
        .eq("employer_id", s.userId),
      sb
        .from("profile_view_logs")
        .select("employee_id, viewed_at")
        .eq("employer_id", s.userId)
        .order("viewed_at", { ascending: false })
        .limit(80),
      sb
        .from("saved_candidates")
        .select("employee_id, notes, saved_at")
        .eq("employer_id", s.userId)
        .order("saved_at", { ascending: false })
        .limit(4),
    ]);

  let searchesRun = 0;
  let lastAt: Date | null = null;
  for (const row of viewsWeekRows ?? []) {
    const viewedAt = new Date(row.viewed_at as string);
    if (!lastAt || viewedAt.getTime() - lastAt.getTime() > 20 * 60 * 1000) {
      searchesRun += 1;
    }
    lastAt = viewedAt;
  }

  const days: { date: string; count: number }[] = [];
  const map = new Map<string, number>();
  for (const row of viewsWeekRows ?? []) {
    const key = new Date(row.viewed_at as string).toISOString().slice(0, 10);
    map.set(key, (map.get(key) || 0) + 1);
  }
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(startToday);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: map.get(key) || 0 });
  }

  const recentIds = Array.from(new Set((recentViews ?? []).map((x) => x.employee_id as string))).slice(0, 16);
  const { data: recentUsers } =
    recentIds.length > 0
      ? await sb.from("users").select("*, employee_profiles(*)").in("id", recentIds)
      : { data: [] as Record<string, unknown>[] };
  const byUserId = new Map(
    (recentUsers ?? []).map((u) => {
      const ur = u as Record<string, unknown>;
      const epArr = ur.employee_profiles as Record<string, unknown>[] | undefined;
      const ep = epArr?.[0] ? mapEmployeeProfileRow(epArr[0]) : null;
      return [ur.id as string, { user: mapUserRow(ur), ep }];
    }),
  );
  const recentCandidates = recentIds
    .map((id) => byUserId.get(id))
    .filter(Boolean)
    .map((pack) => ({
      userId: pack!.user.id,
      fullName: pack!.user.fullName,
      jobTitle: pack!.ep?.jobTitle || "Professional",
      city: pack!.user.city || "",
    }));

  const savedEmpIds = [...new Set((savedRows ?? []).map((x) => x.employee_id as string))];
  const { data: savedEmpUsers } =
    savedEmpIds.length > 0
      ? await sb.from("users").select("id, full_name, employee_profiles(job_title)").in("id", savedEmpIds)
      : { data: [] as Record<string, unknown>[] };
  const savedById = new Map(
    (savedEmpUsers ?? []).map((u) => {
      const ur = u as Record<string, unknown>;
      const epArr = ur.employee_profiles as Record<string, unknown>[] | undefined;
      const jt = (epArr?.[0]?.job_title as string) || "Professional";
      return [ur.id as string, { fullName: ur.full_name as string, jobTitle: jt }];
    }),
  );
  const savedMini = (savedRows ?? []).map((x) => {
    const row = x as Record<string, unknown>;
    const pack = savedById.get(row.employee_id as string);
    return {
      employeeId: row.employee_id as string,
      fullName: pack?.fullName ?? "",
      jobTitle: pack?.jobTitle ?? "Professional",
      status: parseStatus((row.notes as string) ?? null),
    };
  });

  const weekBrowsed = viewsWeekRows?.length ?? 0;
  return NextResponse.json({
    stats: {
      candidatesBrowsedToday: viewsToday ?? 0,
      messagesSent: messagesSent ?? 0,
      candidatesSaved: candidatesSaved ?? 0,
      searchesRun,
      weekBrowsed,
    },
    activity: {
      dailyBrowse: days,
      summary: `This week you browsed ${weekBrowsed} candidates and sent ${messagesSent ?? 0} messages.`,
    },
    recentCandidates,
    savedMini,
  });
}
