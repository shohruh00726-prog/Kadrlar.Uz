import { NextResponse } from "next/server";
import { z } from "zod";
import { createNotification } from "@/lib/notify";
import { requireUser } from "@/lib/auth-user";
import { encryptText } from "@/lib/verification-crypto";

const bodySchema = z.object({
  documentUrl: z.string().min(1),
});

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (!ctx || ctx.user.userType !== "employer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  await createNotification({
    userId: ctx.user.id,
    type: "employer_business_verification",
    title: "Business verification submitted",
    body: JSON.stringify({
      status: "pending",
      submittedAt: new Date().toISOString(),
      documentEncrypted: encryptText(parsed.data.documentUrl),
    }),
  });

  return NextResponse.json({ ok: true, status: "pending" });
}
