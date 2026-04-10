import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notify";
import { requireUser } from "@/lib/auth-user";

const bodySchema = z.object({
  otp: z.string().length(6),
});

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: row } = await sb
    .from("notifications")
    .select("*")
    .eq("user_id", ctx.user.id)
    .eq("type", "phone_otp")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "No OTP requested" }, { status: 400 });
  let payload: { otp?: string; expiresAt?: number } = {};
  try {
    payload = JSON.parse(row.body as string) as { otp?: string; expiresAt?: number };
  } catch {
    return NextResponse.json({ error: "Invalid OTP state" }, { status: 400 });
  }
  if (!payload.otp || !payload.expiresAt || Date.now() > payload.expiresAt) {
    return NextResponse.json({ error: "OTP expired" }, { status: 400 });
  }
  const otpMatch = timingSafeEqual(Buffer.from(payload.otp), Buffer.from(parsed.data.otp));
  if (!otpMatch) {
    return NextResponse.json({ error: "Incorrect OTP" }, { status: 400 });
  }

  await sb.from("notifications").delete().eq("id", row.id as string);

  await createNotification({
    userId: ctx.user.id,
    type: "phone_verification",
    title: "Phone verified",
    body: JSON.stringify({ status: "approved", verifiedAt: new Date().toISOString() }),
  });

  return NextResponse.json({ ok: true });
}
