import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { withErrorHandler } from "@/lib/api-utils";
import { mapUserRow, mapEmployerProfileRow } from "@/lib/db/mappers";

function mapNotificationRow(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    type: r.type as string,
    title: r.title as string,
    body: r.body as string,
    isRead: Boolean(r.is_read),
    relatedId: (r.related_id as string | null) ?? null,
    createdAt: new Date(r.created_at as string),
  };
}

export const GET = withErrorHandler(async () => {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();

  if (s.role === "employer") {
    const { data: savedRows } = await sb
      .from("saved_candidates")
      .select("employee_id, notes")
      .eq("employer_id", s.userId);

    const now = new Date();
    const eligibleEmployeeIds: string[] = [];
    for (const row of savedRows ?? []) {
      let meta: { status?: string; hiredAt?: string } = {};
      try {
        meta = row.notes ? (JSON.parse(row.notes as string) as { status?: string; hiredAt?: string }) : {};
      } catch {
        meta = {};
      }
      if (meta.status !== "Hired" || !meta.hiredAt) continue;
      const hiredAt = new Date(meta.hiredAt);
      const openAt = new Date(hiredAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      const closeAt = new Date(openAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (now < openAt || now > closeAt) continue;
      eligibleEmployeeIds.push(row.employee_id as string);
    }

    if (eligibleEmployeeIds.length > 0) {
      const { data: convs } = await sb
        .from("conversations")
        .select("*")
        .eq("employer_id", s.userId)
        .in("employee_id", eligibleEmployeeIds);

      const { data: existingPrompts } = await sb
        .from("notifications")
        .select("user_id, related_id")
        .eq("type", "review_request")
        .in("user_id", [s.userId, ...eligibleEmployeeIds]);

      const { data: employerRow } = await sb
        .from("users")
        .select("*, employer_profiles(*)")
        .eq("id", s.userId)
        .maybeSingle();
      const er = employerRow as Record<string, unknown> | null;
      const employerUser = er ? mapUserRow(er) : null;
      const erArr = er?.employer_profiles as Record<string, unknown>[] | undefined;
      const erProf = erArr?.[0] ? mapEmployerProfileRow(erArr[0]) : null;
      const companyName = erProf?.companyName ?? employerUser?.fullName ?? "Employer";

      const convList = convs ?? [];
      const empIdsForNames = [...new Set(convList.map((c) => c.employee_id as string))];
      const { data: empUsers } =
        empIdsForNames.length > 0
          ? await sb.from("users").select("id, full_name").in("id", empIdsForNames)
          : { data: [] };
      const nameByEmp = new Map((empUsers ?? []).map((u) => [u.id as string, u.full_name as string]));

      const promptSet = new Set((existingPrompts ?? []).map((p) => `${p.user_id}:${p.related_id}`));

      const toCreate: {
        user_id: string;
        type: string;
        title: string;
        body: string;
        related_id: string;
      }[] = [];

      for (const conv of convList) {
        const empName = nameByEmp.get(conv.employee_id as string) ?? "Candidate";
        if (!promptSet.has(`${s.userId}:${conv.id}`)) {
          toCreate.push({
            user_id: s.userId,
            type: "review_request",
            title: `Leave a review for ${empName}`,
            body: "You can now leave a review. Window closes in 30 days.",
            related_id: conv.id as string,
          });
        }
        if (!promptSet.has(`${conv.employee_id}:${conv.id}`)) {
          toCreate.push({
            user_id: conv.employee_id as string,
            type: "review_request",
            title: `Leave a review for ${companyName}`,
            body: "You can now leave a review. Window closes in 30 days.",
            related_id: conv.id as string,
          });
        }
      }

      if (toCreate.length > 0) {
        await sb.from("notifications").insert(toCreate);
      }
    }
  }

  const { data: rows } = await sb
    .from("notifications")
    .select("*")
    .eq("user_id", s.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  const mapped = (rows ?? []).map((r) => mapNotificationRow(r as Record<string, unknown>));
  const unread = mapped.filter((r) => !r.isRead).length;
  return NextResponse.json({ notifications: mapped, unread });
});
