import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

function pctChange(current: number, prev: number) {
  if (prev <= 0) return current > 0 ? 100 : 0;
  return ((current - prev) / prev) * 100;
}

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const sb = getSupabaseAdmin();

  const [
    { count: totalEmployees },
    { count: totalEmployers },
    { count: newEmployeesToday },
    { count: newEmployersToday },
    { count: activeProfiles },
    { data: strengthRows },
    { data: verifRows },
    { count: flaggedContent },
    { count: messagesToday },
    { count: usersThisWeek },
    { count: usersPrevWeek },
    { count: employeeProfilesThisWeek },
    { count: employeeProfilesPrevWeek },
  ] = await Promise.all([
    sb.from("users").select("*", { count: "exact", head: true }).eq("user_type", "employee"),
    sb.from("users").select("*", { count: "exact", head: true }).eq("user_type", "employer"),
    sb.from("users").select("*", { count: "exact", head: true }).eq("user_type", "employee").gte("created_at", dayAgo),
    sb.from("users").select("*", { count: "exact", head: true }).eq("user_type", "employer").gte("created_at", dayAgo),
    sb.from("employee_profiles").select("*", { count: "exact", head: true }).eq("is_profile_public", true),
    sb.from("employee_profiles").select("profile_strength").limit(10000),
    sb
      .from("notifications")
      .select("body")
      .in("type", ["employee_id_verification", "employer_business_verification"])
      .limit(2000),
    sb
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .in("type", ["reported_profile", "reported_review", "review_flagged"]),
    sb.from("messages").select("*", { count: "exact", head: true }).gte("sent_at", dayAgo),
    sb.from("users").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    sb
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twoWeeksAgo)
      .lt("created_at", weekAgo),
    sb
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("user_type", "employee")
      .gte("created_at", weekAgo),
    sb
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("user_type", "employee")
      .gte("created_at", twoWeeksAgo)
      .lt("created_at", weekAgo),
  ]);

  const pendingVerifications = (verifRows ?? []).filter(
    (r) => typeof r.body === "string" && r.body.includes('"status":"pending"'),
  ).length;

  const strengths = (strengthRows ?? []).map((r) => Number(r.profile_strength));
  const avgCompletion =
    strengths.length > 0 ? strengths.reduce((a, b) => a + b, 0) / strengths.length : 0;

  return NextResponse.json({
    metrics: {
      totalUsers: (totalEmployees ?? 0) + (totalEmployers ?? 0),
      totalUsersBreakdown: { employees: totalEmployees ?? 0, employers: totalEmployers ?? 0 },
      newToday: (newEmployeesToday ?? 0) + (newEmployersToday ?? 0),
      newTodayBreakdown: { employees: newEmployeesToday ?? 0, employers: newEmployersToday ?? 0 },
      activeProfiles: activeProfiles ?? 0,
      avgCompletionRate: Math.round(avgCompletion),
      pendingVerifications,
      flaggedContent: flaggedContent ?? 0,
      messagesToday: messagesToday ?? 0,
      weeklyGrowth: {
        usersPercent: Number(pctChange(usersThisWeek ?? 0, usersPrevWeek ?? 0).toFixed(1)),
        profilesPercent: Number(
          pctChange(employeeProfilesThisWeek ?? 0, employeeProfilesPrevWeek ?? 0).toFixed(1),
        ),
      },
    },
  });
}
