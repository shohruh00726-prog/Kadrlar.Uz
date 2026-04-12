import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { isSignUpDuplicateError, tryClearOrphanAuthUser } from "@/lib/auth-orphan";
import { getSupabaseAdmin, isPostgresUniqueViolation } from "@/lib/supabase/admin";
import { attachSessionToResponse } from "@/lib/session";
import { INDUSTRIES } from "@/lib/constants";

/** If "true"/"1", Auth users stay unconfirmed until they click the email link (stricter). Default: auto-confirm so login works like manually added users. */
function registerRequiresEmailVerification(): boolean {
  const v = (process.env.AUTH_REGISTER_REQUIRE_EMAIL_VERIFICATION ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

const bodySchema = z.object({
  userType: z.enum(["employee", "employer"]),
  fullName: z.string().min(2),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email()
    .transform((s) => s.toLowerCase()),
  password: z.string().min(8),
  phone: z.string().optional(),
  city: z.string().min(1),
  companyName: z.string().optional(),
  industry: z.string().optional(),
  agree: z.literal(true),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }
    const b = parsed.data;
    const email = b.email;

    if (b.userType === "employer" && (!b.companyName || b.companyName.length < 2)) {
      return NextResponse.json({ error: "Company name required" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const { data: existing } = await sb.from("users").select("id").eq("email", email).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const mustVerifyEmail = registerRequiresEmailVerification();

    let created: { user: { id: string } | null } | null = null;
    let createError: { message: string; status?: number; code?: string } | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await sb.auth.admin.createUser({
        email,
        password: b.password,
        email_confirm: !mustVerifyEmail,
        user_metadata: {
          full_name: b.fullName,
          user_type: b.userType,
        },
      });
      created = res.data;
      createError = res.error;
      if (!createError) break;

      const dupCode = String((createError as { code?: string }).code ?? "");
      if (
        attempt === 0 &&
        isSignUpDuplicateError(createError.message, createError.status, dupCode) &&
        (await tryClearOrphanAuthUser(sb, email))
      ) {
        console.warn("[auth/register] cleared orphan auth user; retrying createUser", { email });
        continue;
      }
      break;
    }

    if (createError) {
      const dupCode = String((createError as { code?: string }).code ?? "");
      if (isSignUpDuplicateError(createError.message, createError.status, dupCode)) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
      console.error("[auth/register] createUser failed", createError.message, createError);
      return NextResponse.json({ error: createError.message || "Could not create account" }, { status: 400 });
    }

    const authId = created?.user?.id;
    if (!authId) {
      console.error("[auth/register] createUser returned no user id", { email, created });
      return NextResponse.json({ error: "Could not create account" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(b.password, 10);
    const defaultNotif = JSON.stringify({
      messages: true,
      profileViewed: true,
      profileSaved: true,
      contactViewed: true,
      teamActivity: true,
      replies: true,
      digest: true,
    });

    const userBase = {
      id: authId,
      email,
      password_hash: passwordHash,
      full_name: b.fullName,
      phone: b.phone ?? null,
      city: b.city,
      notification_settings: defaultNotif,
    };

    if (b.userType === "employee") {
      const { error: uErr } = await sb.from("users").insert({ ...userBase, user_type: "employee" });
      if (uErr) {
        await sb.auth.admin.deleteUser(authId);
        if (isPostgresUniqueViolation(uErr)) {
          return NextResponse.json({ error: "Email already in use" }, { status: 409 });
        }
        console.error("[auth/register] users insert failed", uErr);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
      }
      const { error: pErr } = await sb.from("employee_profiles").insert({
        id: randomUUID(),
        user_id: authId,
        skills: "[]",
        work_types: "[]",
        languages: "[]",
      });
      if (pErr) {
        await sb.from("users").delete().eq("id", authId);
        await sb.auth.admin.deleteUser(authId);
        console.error(pErr);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
      }
      const result = await attachSessionToResponse(
        NextResponse.json({ ok: true, userId: authId, userType: "employee" }),
        authId,
        "employee",
      );
      if (mustVerifyEmail) {
        result.headers.set("x-email-confirmation-required", "true");
      }
      return result;
    }

    const { error: uErr } = await sb.from("users").insert({ ...userBase, user_type: "employer" });
    if (uErr) {
      await sb.auth.admin.deleteUser(authId);
      if (isPostgresUniqueViolation(uErr)) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
      console.error("[auth/register] users insert failed (employer)", uErr);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
    const industry =
      b.industry && (INDUSTRIES as readonly string[]).includes(b.industry) ? b.industry : "Other";
    const { error: pErr } = await sb.from("employer_profiles").insert({
      id: randomUUID(),
      user_id: authId,
      company_name: b.companyName!,
      industry,
    });
    if (pErr) {
      await sb.from("users").delete().eq("id", authId);
      await sb.auth.admin.deleteUser(authId);
      console.error(pErr);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
    const result = await attachSessionToResponse(
      NextResponse.json({ ok: true, userId: authId, userType: "employer" }),
      authId,
      "employer",
    );
    if (mustVerifyEmail) {
      result.headers.set("x-email-confirmation-required", "true");
    }
    return result;
  } catch (e: unknown) {
    if (isPostgresUniqueViolation(e)) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
