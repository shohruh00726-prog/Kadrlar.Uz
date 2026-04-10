import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth-user";

function parseStatus(body: string | null) {
  if (!body) return { status: "none", reason: null as string | null };
  try {
    const o = JSON.parse(body) as { status?: string; reason?: string | null };
    return { status: o.status ?? "none", reason: o.reason ?? null };
  } catch {
    return { status: "none", reason: null };
  }
}

export async function GET() {
  const ctx = await requireUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const [empRes, empBizRes, phoneRes] = await Promise.all([
    sb
      .from("notifications")
      .select("body")
      .eq("user_id", ctx.user.id)
      .eq("type", "employee_id_verification")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from("notifications")
      .select("body")
      .eq("user_id", ctx.user.id)
      .eq("type", "employer_business_verification")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .from("notifications")
      .select("body")
      .eq("user_id", ctx.user.id)
      .eq("type", "phone_verification")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const employeeIdRow = empRes.data;
  const employerBizRow = empBizRes.data;
  const phoneRow = phoneRes.data;

  const emailDomain = ctx.user.email.split("@")[1]?.toLowerCase() ?? "";
  const isPublicMail = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"].includes(emailDomain);

  return NextResponse.json({
    verification: {
      role: ctx.user.userType,
      employee: {
        emailVerified: !!ctx.user.isVerified,
        phoneVerified: parseStatus((phoneRow?.body as string) ?? null).status === "approved",
        idVerification: parseStatus((employeeIdRow?.body as string) ?? null),
      },
      employer: {
        emailVerified: !!ctx.user.isVerified && !isPublicMail,
        businessVerification: parseStatus((employerBizRow?.body as string) ?? null),
        featuredEmployer: false,
      },
    },
  });
}
