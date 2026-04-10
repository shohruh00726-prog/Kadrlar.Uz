import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth-user";

async function countEmployerMessages(
  employeeUserId: string,
  range?: { gte?: Date; lt?: Date },
) {
  const sb = getSupabaseAdmin();
  const { data: convs } = await sb.from("conversations").select("id").eq("employee_id", employeeUserId);
  const cids = (convs ?? []).map((c) => c.id as string);
  if (!cids.length) return 0;
  let q = sb.from("messages").select("sender_id, sent_at").in("conversation_id", cids);
  if (range?.gte) q = q.gte("sent_at", range.gte.toISOString());
  if (range?.lt) q = q.lt("sent_at", range.lt.toISOString());
  const { data: msgs } = await q;
  if (!msgs?.length) return 0;
  const sids = [...new Set(msgs.map((m) => m.sender_id as string))];
  const { data: senders } = await sb.from("users").select("id, user_type").in("id", sids);
  const employerIds = new Set(
    (senders ?? []).filter((u) => u.user_type === "employer").map((u) => u.id as string),
  );
  return msgs.filter((m) => employerIds.has(m.sender_id as string)).length;
}

export async function GET() {
  const ctx = await requireUser();
  if (!ctx || ctx.user.userType !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = ctx.user;
  const ep = user.employeeProfile;
  if (!ep) {
    return NextResponse.json({ error: "No employee profile" }, { status: 400 });
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const sb = getSupabaseAdmin();

  const [
    { count: viewsWeek },
    { count: prevViewsWeek },
    { count: viewsMonth },
    { data: recentViews },
    { count: timesSaved },
    messagesReceived,
    prevMessagesReceived,
    { count: searchWeek },
    { count: prevTimesSaved },
    { count: workExpCount },
  ] = await Promise.all([
    sb
      .from("profile_view_logs")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", user.id)
      .gte("viewed_at", weekAgo.toISOString()),
    sb
      .from("profile_view_logs")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", user.id)
      .gte("viewed_at", twoWeeksAgo.toISOString())
      .lt("viewed_at", weekAgo.toISOString()),
    sb
      .from("profile_view_logs")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", user.id)
      .gte("viewed_at", monthAgo.toISOString()),
    sb
      .from("profile_view_logs")
      .select("*")
      .eq("employee_id", user.id)
      .gte("viewed_at", monthAgo.toISOString())
      .order("viewed_at", { ascending: true }),
    sb
      .from("saved_candidates")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", user.id),
    countEmployerMessages(user.id),
    countEmployerMessages(user.id, { gte: twoWeeksAgo, lt: weekAgo }),
    sb
      .from("profile_search_appearances")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", user.id)
      .gte("appeared_at", weekAgo.toISOString()),
    sb
      .from("saved_candidates")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", user.id)
      .gte("saved_at", twoWeeksAgo.toISOString())
      .lt("saved_at", weekAgo.toISOString()),
    sb
      .from("work_experiences")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", ep.id),
  ]);

  const byDate = new Map<string, number>();
  for (const row of recentViews ?? []) {
    const d = new Date(row.viewed_at as string);
    const key = d.toISOString().slice(0, 10);
    byDate.set(key, (byDate.get(key) || 0) + 1);
  }
  const dailyViews: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyViews.push({ date: key, count: byDate.get(key) || 0 });
  }

  const { data: lastView } = await sb
    .from("profile_view_logs")
    .select("*")
    .eq("employee_id", user.id)
    .order("viewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: lastSave } = await sb
    .from("saved_candidates")
    .select("saved_at, employer_id")
    .eq("employee_id", user.id)
    .order("saved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: convsForEmployee } = await sb.from("conversations").select("id").eq("employee_id", user.id);
  const ecids = (convsForEmployee ?? []).map((c) => c.id as string);
  let lastMessage: { sent_at: string; conversation_id: string } | null = null;
  if (ecids.length) {
    const { data: candMsgs } = await sb
      .from("messages")
      .select("sender_id, sent_at, conversation_id")
      .in("conversation_id", ecids)
      .order("sent_at", { ascending: false })
      .limit(80);
    const sids = [...new Set((candMsgs ?? []).map((m) => m.sender_id as string))];
    const { data: senders } =
      sids.length > 0 ? await sb.from("users").select("id, user_type").in("id", sids) : { data: [] };
    const employerIds = new Set(
      (senders ?? []).filter((u) => u.user_type === "employer").map((u) => u.id as string),
    );
    lastMessage =
      (candMsgs ?? []).find((m) => employerIds.has(m.sender_id as string)) ?? null;
  }

  const activity: { label: string; timestamp: string | null }[] = [];
  if (lastView) {
    let city = "";
    try {
      const { data: viewer } = await sb
        .from("users")
        .select("city")
        .eq("id", lastView.employer_id as string)
        .maybeSingle();
      city = (viewer?.city as string) || "";
    } catch {
      city = "";
    }
    activity.push({
      label: `An employer from ${city || "Uzbekistan"} viewed your profile`,
      timestamp: new Date(lastView.viewed_at as string).toISOString(),
    });
  }
  if (lastSave) {
    const { data: emp } = await sb.from("users").select("city").eq("id", lastSave.employer_id as string).maybeSingle();
    activity.push({
      label: `An employer from ${(emp?.city as string) || "Uzbekistan"} saved your profile`,
      timestamp: new Date(lastSave.saved_at as string).toISOString(),
    });
  }
  activity.push({
    label: `Your profile appeared in ${searchWeek ?? 0} searches this week`,
    timestamp: null,
  });
  if (lastMessage) {
    const { data: conv } = await sb
      .from("conversations")
      .select("employer_id")
      .eq("id", lastMessage.conversation_id)
      .maybeSingle();
    const { data: empu } = await sb
      .from("users")
      .select("city")
      .eq("id", (conv?.employer_id as string) ?? "")
      .maybeSingle();
    const city = (empu?.city as string) || "Tashkent";
    activity.push({
      label: `You received a message from an employer from ${city}`,
      timestamp: new Date(lastMessage.sent_at).toISOString(),
    });
  }

  const tips: string[] = [];
  if (!user.profilePhotoUrl) {
    tips.push("Add a photo — profiles with photos get 3x more views.");
  }
  if (ep.salaryMin == null || ep.salaryMax == null) {
    tips.push("Set your salary expectation to appear in salary filter searches.");
  }
  if (!ep.bio || ep.bio.length < 100) {
    tips.push("Write a longer bio — employers read it before deciding to message.");
  }
  if (!ep.cvUrl) {
    tips.push("Upload your CV — 40% of employers download it before deciding.");
  }
  if ((workExpCount ?? 0) === 0) {
    tips.push("Add your work history — even 1 entry increases views by 25%.");
  }
  if (ep.profileStrength < 60) {
    tips.push("You are not appearing in some employer filter searches right now.");
  }

  return NextResponse.json({
    stats: {
      viewsWeek: viewsWeek ?? 0,
      prevViewsWeek: prevViewsWeek ?? 0,
      viewsMonth: viewsMonth ?? 0,
      timesSaved: timesSaved ?? 0,
      prevTimesSaved: prevTimesSaved ?? 0,
      messagesReceived,
      prevMessagesReceived,
      searchWeek: searchWeek ?? 0,
      totalViews: ep.profileViews,
    },
    chart: {
      dailyViews,
    },
    activity,
    tips,
  });
}
