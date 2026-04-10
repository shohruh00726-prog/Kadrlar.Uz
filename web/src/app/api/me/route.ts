import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth-user";
import { clearSessionCookieOnResponse } from "@/lib/session";
import { withErrorHandler } from "@/lib/api-utils";
import { unmapUserPatch } from "@/lib/db/mappers";

const patchSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  preferredLanguage: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  notificationSettings: z.record(z.string(), z.boolean()).optional(),
  isProfilePublic: z.boolean().optional(),
  contactVisible: z.boolean().optional(),
  showProfileViews: z.boolean().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

export const PATCH = withErrorHandler(async (req: Request) => {
  const ctx = await requireUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const b = parsed.data;
  const sb = getSupabaseAdmin();

  const updateUserData: Record<string, unknown> = {
    fullName: b.fullName,
    phone: b.phone === undefined ? undefined : b.phone,
    city: b.city === undefined ? undefined : b.city,
    preferredLanguage: b.preferredLanguage,
    theme: b.theme,
    notificationSettings:
      b.notificationSettings === undefined ? undefined : JSON.stringify(b.notificationSettings),
  };

  if (b.newPassword) {
    if (!b.currentPassword) {
      return NextResponse.json({ error: "Current password required" }, { status: 400 });
    }
    const match = await bcrypt.compare(b.currentPassword, ctx.user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: "Invalid current password" }, { status: 400 });
    }
    updateUserData.passwordHash = await bcrypt.hash(b.newPassword, 10);
    const { error: authErr } = await sb.auth.admin.updateUserById(ctx.user.id, { password: b.newPassword });
    if (authErr) {
      return NextResponse.json({ error: authErr.message || "Could not update password" }, { status: 400 });
    }
  }

  const dbPatch = unmapUserPatch(updateUserData);
  const cleanPatch = Object.fromEntries(Object.entries(dbPatch).filter(([, v]) => v !== undefined));
  if (Object.keys(cleanPatch).length) {
    await sb.from("users").update(cleanPatch).eq("id", ctx.user.id);
  }

  if (
    ctx.user.userType === "employee" &&
    ctx.user.employeeProfile &&
    (b.isProfilePublic !== undefined || b.contactVisible !== undefined || b.showProfileViews !== undefined)
  ) {
    const epPatch: Record<string, unknown> = {};
    if (b.isProfilePublic !== undefined) epPatch.is_profile_public = b.isProfilePublic;
    if (b.contactVisible !== undefined) epPatch.contact_visible = b.contactVisible;
    if (b.showProfileViews !== undefined) epPatch.show_profile_views = b.showProfileViews;
    await sb.from("employee_profiles").update(epPatch).eq("user_id", ctx.user.id);
  }

  return NextResponse.json({ ok: true });
});

const deleteSchema = z.object({ email: z.string().email() });

export const DELETE = withErrorHandler(async (req: Request) => {
  const ctx = await requireUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json();
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success || parsed.data.email.toLowerCase() !== ctx.user.email.toLowerCase()) {
    return NextResponse.json({ error: "Confirmation failed" }, { status: 400 });
  }
  const sb = getSupabaseAdmin();
  const { error } = await sb.auth.admin.deleteUser(ctx.user.id);
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not delete account" }, { status: 500 });
  }
  return clearSessionCookieOnResponse(NextResponse.json({ ok: true }));
});
