import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import {
  mapUserRow,
  mapEmployeeProfileRow,
  mapEmployerProfileRow,
  mapWorkExperienceRow,
  mapEmployeeProjectRow,
  mapCertificationRow,
  mapAdminUserRow,
} from "@/lib/db/mappers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const sb = getSupabaseAdmin();
  const { data: userRow } = await sb
    .from("users")
    .select("*, employee_profiles(*), employer_profiles(*)")
    .eq("id", id)
    .maybeSingle();
  if (!userRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ur = userRow as Record<string, unknown>;
  const userBase = mapUserRow(ur);
  const epA = ur.employee_profiles as Record<string, unknown>[] | undefined;
  const erA = ur.employer_profiles as Record<string, unknown>[] | undefined;

  let employeeProfile: ReturnType<typeof mapEmployeeProfileRow> & {
    workExperiences: ReturnType<typeof mapWorkExperienceRow>[];
    projects: ReturnType<typeof mapEmployeeProjectRow>[];
    certifications: ReturnType<typeof mapCertificationRow>[];
  } | null = null;

  if (epA?.[0]) {
    const ep = mapEmployeeProfileRow(epA[0]);
    const [{ data: wex }, { data: proj }, { data: certs }] = await Promise.all([
      sb.from("work_experiences").select("*").eq("employee_id", ep.id).order("sort_order", { ascending: true }),
      sb.from("employee_projects").select("*").eq("employee_id", ep.id).order("sort_order", { ascending: true }),
      sb.from("certifications").select("*").eq("employee_id", ep.id),
    ]);
    employeeProfile = {
      ...ep,
      workExperiences: (wex ?? []).map((r) => mapWorkExperienceRow(r as Record<string, unknown>)),
      projects: (proj ?? []).map((r) => mapEmployeeProjectRow(r as Record<string, unknown>)),
      certifications: (certs ?? []).map((r) => mapCertificationRow(r as Record<string, unknown>)),
    };
  }

  const employerProfile = erA?.[0] ? mapEmployerProfileRow(erA[0]) : null;

  const { passwordHash: _omit, ...safeUserCore } = userBase;
  const safeUser = {
    ...safeUserCore,
    employeeProfile,
    employerProfile,
    conversationsAsEmployer: [] as unknown[],
    conversationsAsEmployee: [] as unknown[],
  };

  const [{ count: viewLogs }, { data: adminNotesRows }, { count: messageCount }] = await Promise.all([
    sb.from("profile_view_logs").select("*", { count: "exact", head: true }).eq("employee_id", id),
    sb
      .from("admin_actions_log")
      .select("*, admin_users(*)")
      .eq("target_id", id)
      .eq("action_type", "admin_note")
      .order("performed_at", { ascending: false })
      .limit(20),
    sb.from("messages").select("*", { count: "exact", head: true }).eq("sender_id", id),
  ]);

  const adminNotes = (adminNotesRows ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const adm = r.admin_users as Record<string, unknown> | undefined;
    const adminMapped = adm ? mapAdminUserRow(adm) : null;
    return {
      id: r.id,
      notes: r.notes,
      performedAt: new Date(r.performed_at as string),
      by: adminMapped?.fullName ?? adminMapped?.email ?? "",
    };
  });

  return NextResponse.json({
    user: safeUser,
    stats: {
      profileViews: viewLogs ?? 0,
      messagesSent: messageCount ?? 0,
    },
    adminNotes,
  });
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("verify_user"), notes: z.string().optional() }),
  z.object({ action: z.literal("suspend_user"), reason: z.string().min(3), notes: z.string().optional() }),
  z.object({ action: z.literal("unsuspend_user"), notes: z.string().optional() }),
  z.object({ action: z.literal("delete_user"), confirm: z.literal("DELETE"), notes: z.string().optional() }),
  z.object({ action: z.literal("admin_note"), notes: z.string().min(1) }),
]);

export async function PATCH(req: Request, { params }: Params) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const body = parsed.data;
  if (body.action === "verify_user") {
    await sb.from("users").update({ is_verified: true }).eq("id", id);
    await logAdminAction({ adminId: ctx.admin.id, actionType: "verify_user", targetId: id, notes: body.notes });
  } else if (body.action === "suspend_user") {
    await sb
      .from("users")
      .update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspended_reason: body.reason,
      })
      .eq("id", id);
    await logAdminAction({
      adminId: ctx.admin.id,
      actionType: "suspend_user",
      targetId: id,
      notes: [body.reason, body.notes].filter(Boolean).join(" | "),
    });
  } else if (body.action === "unsuspend_user") {
    await sb
      .from("users")
      .update({ is_suspended: false, suspended_at: null, suspended_reason: null })
      .eq("id", id);
    await logAdminAction({ adminId: ctx.admin.id, actionType: "unsuspend_user", targetId: id, notes: body.notes });
  } else if (body.action === "delete_user") {
    const { error } = await sb.auth.admin.deleteUser(id);
    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await logAdminAction({ adminId: ctx.admin.id, actionType: "delete_user", targetId: id, notes: body.notes });
  } else {
    await logAdminAction({ adminId: ctx.admin.id, actionType: "admin_note", targetId: id, notes: body.notes });
  }

  return NextResponse.json({ ok: true });
}
