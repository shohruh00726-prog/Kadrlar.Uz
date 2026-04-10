import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth-user";

const usdToUzsKey = "usd_to_uzs_rate";

function getRateOrDefault(rateRow: { value: string; updated_at: string } | null | undefined) {
  const defaultRate = 12500;
  if (!rateRow) return { rate: defaultRate, updatedAt: null as string | null };
  const parsed = Number(rateRow.value);
  if (!Number.isFinite(parsed) || parsed <= 0) return { rate: defaultRate, updatedAt: null as string | null };
  return { rate: parsed, updatedAt: new Date(rateRow.updated_at).toISOString().slice(0, 10) };
}

export async function GET() {
  const sb = getSupabaseAdmin();
  const { data: rateRow } = await sb
    .from("app_settings")
    .select("value, updated_at")
    .eq("key", usdToUzsKey)
    .maybeSingle();
  const { rate, updatedAt } = getRateOrDefault(rateRow as { value: string; updated_at: string } | undefined);
  return NextResponse.json({
    appSettings: { usdToUzsRate: rate, usdToUzsRateUpdatedAt: updatedAt },
  });
}

const patchSchema = z.object({
  key: z.literal(usdToUzsKey),
  value: z.number().int().min(1),
});

export async function PATCH(req: Request) {
  const adminSecret = process.env.APP_SETTINGS_ADMIN_SECRET;
  const provided = req.headers.get("x-admin-secret");
  if (!adminSecret || !provided) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const secretsMatch =
    adminSecret.length === provided.length &&
    timingSafeEqual(Buffer.from(adminSecret), Buffer.from(provided));
  if (!secretsMatch) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ctx = await requireUser();
  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const sb = getSupabaseAdmin();
  await sb.from("app_settings").upsert(
    {
      key: usdToUzsKey,
      value: String(parsed.data.value),
      updated_by: ctx?.user.id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  return NextResponse.json({ ok: true });
}
