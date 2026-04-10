import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";

const bodySchema = z.object({
  role: z.enum(["employee", "employer"]),
});

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  if (parsed.data.role === "employee" && s.role !== "employee") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (parsed.data.role === "employer" && s.role !== "employer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sb = getSupabaseAdmin();
  await sb
    .from("users")
    .update(
      parsed.data.role === "employee"
        ? { onboarding_employee_completed: true }
        : { onboarding_employer_completed: true },
    )
    .eq("id", s.userId);

  return NextResponse.json({ ok: true });
}
