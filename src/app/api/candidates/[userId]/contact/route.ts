import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { createNotification } from "@/lib/notify";
import { mapUserRow, mapEmployeeProfileRow } from "@/lib/db/mappers";

type Params = { params: Promise<{ userId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { userId: employeeUserId } = await params;
  const s = await requireSession();
  if (!s || s.role !== "employer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sb = getSupabaseAdmin();
  const { data: epRow } = await sb.from("employee_profiles").select("*").eq("user_id", employeeUserId).maybeSingle();
  if (!epRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = mapEmployeeProfileRow(epRow as Record<string, unknown>);
  if (!row.contactVisible) {
    return NextResponse.json(
      { error: "Candidate prefers in-app chat", showChat: true },
      { status: 403 },
    );
  }

  const { data: uRow } = await sb.from("users").select("*").eq("id", employeeUserId).maybeSingle();
  if (!uRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = mapUserRow(uRow as Record<string, unknown>);

  await createNotification({
    userId: employeeUserId,
    type: "contact_viewed",
    title: "Your contact info was viewed",
    body: "An employer viewed your contact information.",
  });

  return NextResponse.json({
    email: user.email,
    phone: user.phone,
  });
}
