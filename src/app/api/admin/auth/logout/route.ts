import { NextResponse } from "next/server";
import { clearAdminSessionOnResponse } from "@/lib/admin-session";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";

export async function POST() {
  const ctx = await requireAdmin();
  if (ctx) {
    await logAdminAction({ adminId: ctx.admin.id, actionType: "admin_logout" });
  }
  return clearAdminSessionOnResponse(NextResponse.json({ ok: true }));
}
