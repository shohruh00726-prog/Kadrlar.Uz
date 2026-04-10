import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { mapUserRow, mapEmployeeProfileRow, mapEmployerProfileRow } from "@/lib/db/mappers";

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: rows } = await sb
    .from("notifications")
    .select("*")
    .in("type", ["employee_id_verification", "employer_business_verification"])
    .order("created_at", { ascending: false })
    .limit(300);

  const pending = (rows ?? []).filter((r) => (r.body as string).includes('"status":"pending"'));
  const userIds = [...new Set(pending.map((r) => r.user_id as string))];
  const { data: userRows } =
    userIds.length > 0
      ? await sb.from("users").select("*, employee_profiles(*), employer_profiles(*)").in("id", userIds)
      : { data: [] as Record<string, unknown>[] };

  const byId = new Map(
    (userRows ?? []).map((u) => {
      const ur = u as Record<string, unknown>;
      const epA = ur.employee_profiles as Record<string, unknown>[] | undefined;
      const erA = ur.employer_profiles as Record<string, unknown>[] | undefined;
      const user = mapUserRow(ur);
      return [
        user.id,
        {
          user,
          employeeProfile: epA?.[0] ? mapEmployeeProfileRow(epA[0]) : null,
          employerProfile: erA?.[0] ? mapEmployerProfileRow(erA[0]) : null,
        },
      ];
    }),
  );

  return NextResponse.json({
    items: pending.map((r) => {
      const u = byId.get(r.user_id as string);
      const waitingHours = Math.floor(
        (Date.now() - new Date(r.created_at as string).getTime()) / (60 * 60 * 1000),
      );
      return {
        notificationId: r.id,
        userId: r.user_id,
        userName: u?.user.fullName ?? "Unknown",
        userType: u?.user.userType ?? "unknown",
        submittedAt: new Date(r.created_at as string),
        type: r.type,
        waitingHours,
        slaBreached: waitingHours > 24,
      };
    }),
  });
}

export async function PATCH(req: Request) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as
    | { notificationId?: string; action?: "approve" | "reject" | "request_more_info"; reason?: string }
    | null;
  if (!body?.notificationId || !body?.action) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data: existing } = await sb.from("notifications").select("*").eq("id", body.notificationId).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = (() => {
    try {
      return JSON.parse(existing.body as string) as Record<string, unknown>;
    } catch {
      return {};
    }
  })();
  const nextBody = JSON.stringify({
    ...parsed,
    status:
      body.action === "approve"
        ? "approved"
        : body.action === "reject"
          ? "rejected"
          : "needs_more_info",
    reviewedAt: new Date().toISOString(),
    reviewReason: body.reason ?? null,
  });
  await sb.from("notifications").update({ body: nextBody }).eq("id", existing.id as string);
  await logAdminAction({
    adminId: ctx.admin.id,
    actionType: `${body.action}_verification`,
    targetId: existing.user_id as string,
    notes: body.reason ?? null,
  });

  return NextResponse.json({ ok: true });
}
