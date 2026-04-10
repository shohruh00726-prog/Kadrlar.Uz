import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth-user";
import { mapEmployerProfileRow } from "@/lib/db/mappers";

const patchSchema = z.object({
  companyName: z.string().min(2).optional(),
  companyDescription: z.string().nullable().optional(),
  industry: z.string().min(1).nullable().optional(),
  companySize: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  companyLogoUrl: z.string().nullable().optional(),
  contactPerson: z.string().min(2).optional(),
  city: z.string().nullable().optional(),
});

export async function GET() {
  const ctx = await requireUser();
  if (!ctx || ctx.user.userType !== "employer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const { data: row } = await sb.from("employer_profiles").select("*").eq("user_id", ctx.user.id).maybeSingle();
  const p = row ? mapEmployerProfileRow(row as Record<string, unknown>) : null;
  return NextResponse.json({
    profile: p,
    user: {
      contactPerson: ctx.user.fullName,
      city: ctx.user.city,
      verified: p?.isVerified ?? false,
    },
  });
}

export async function PATCH(req: Request) {
  const ctx = await requireUser();
  if (!ctx || ctx.user.userType !== "employer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const b = parsed.data;
  if (b.companyDescription && b.companyDescription.length > 800) {
    return NextResponse.json({ error: "Company description max length is 800." }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const epPatch: Record<string, unknown> = {};
  if (b.companyName !== undefined) epPatch.company_name = b.companyName;
  if (b.companyDescription !== undefined) epPatch.company_description = b.companyDescription;
  if (b.industry !== undefined) epPatch.industry = b.industry;
  if (b.companySize !== undefined) epPatch.company_size = b.companySize;
  if (b.website !== undefined) epPatch.website = b.website;
  if (b.companyLogoUrl !== undefined) epPatch.company_logo_url = b.companyLogoUrl;
  if (Object.keys(epPatch).length) {
    await sb.from("employer_profiles").update(epPatch).eq("user_id", ctx.user.id);
  }
  if (b.contactPerson !== undefined || b.city !== undefined) {
    const uPatch: Record<string, unknown> = {};
    if (b.contactPerson !== undefined) uPatch.full_name = b.contactPerson;
    if (b.city !== undefined) uPatch.city = b.city;
    await sb.from("users").update(uPatch).eq("id", ctx.user.id);
  }
  return NextResponse.json({ ok: true });
}
