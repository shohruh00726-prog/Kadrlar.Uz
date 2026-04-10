import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { createNotification } from "@/lib/notify";
import { requireUser } from "@/lib/auth-user";

export async function POST() {
  const ctx = await requireUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const otp = String(randomInt(100000, 999999));
  const expiresAt = Date.now() + 10 * 60 * 1000;
  await createNotification({
    userId: ctx.user.id,
    type: "phone_otp",
    title: "Phone OTP generated",
    body: JSON.stringify({ otp, expiresAt }),
  });
  return NextResponse.json({ ok: true });
}
