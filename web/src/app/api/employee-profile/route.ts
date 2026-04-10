import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth-user";
import {
  mapCertificationRow,
  mapEmployeeProfileRow,
  mapEmployeeProjectRow,
  mapWorkExperienceRow,
} from "@/lib/db/mappers";
import {
  parseLanguageList,
  parseStringArray,
  stringifyLanguageList,
  stringifyStringArray,
} from "@/lib/json-fields";
import { computeProfileStrengthFromParts } from "@/lib/profile-strength-calc";

const workExpSchema = z.object({
  id: z.string().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().nullable().optional(),
});

const projectSchema = z.object({
  id: z.string().optional(),
  projectName: z.string().optional(),
  description: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

const certSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  organization: z.string().optional(),
  year: z.number().nullable().optional(),
});

const patchSchema = z.object({
  user: z
    .object({
      fullName: z.string().optional(),
      phone: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      profilePhotoUrl: z.string().nullable().optional(),
      preferredLanguage: z.string().optional(),
    })
    .optional(),
  profile: z
    .object({
      jobTitle: z.string().nullable().optional(),
      jobCategory: z.string().nullable().optional(),
      jobSubcategory: z.string().nullable().optional(),
      bio: z.string().nullable().optional(),
      skills: z.array(z.string()).optional(),
      yearsOfExperience: z.number().optional(),
      educationLevel: z.string().nullable().optional(),
      university: z.string().nullable().optional(),
      fieldOfStudy: z.string().nullable().optional(),
      graduationYear: z.number().nullable().optional(),
      salaryMin: z.number().nullable().optional(),
      salaryMax: z.number().nullable().optional(),
      salaryNegotiable: z.boolean().optional(),
      priceType: z.string().optional(),
      workTypes: z.array(z.string()).optional(),
      availability: z.string().nullable().optional(),
      languages: z
        .array(z.object({ language: z.string(), proficiency: z.string() }))
        .optional(),
      portfolioUrl: z.string().nullable().optional(),
      cvUrl: z.string().nullable().optional(),
      contactVisible: z.boolean().optional(),
      isProfilePublic: z.boolean().optional(),
      showProfileViews: z.boolean().optional(),
      published: z.boolean().optional(),
      dateOfBirth: z.string().nullable().optional(),
      gender: z.string().nullable().optional(),
    })
    .optional(),
  workExperiences: z.array(workExpSchema).optional(),
  projects: z.array(projectSchema).optional(),
  certifications: z.array(certSchema).optional(),
});

function isFutureDate(value: string | null | undefined) {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
}

function isValidPhoneUz(value: string | null | undefined) {
  if (!value) return true;
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return true;
  return /^998\d{9}$/.test(digitsOnly);
}

async function loadEmployeeBundle(userId: string) {
  const sb = getSupabaseAdmin();
  const { data: epRow } = await sb.from("employee_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (!epRow) return null;
  const ep = mapEmployeeProfileRow(epRow as Record<string, unknown>);
  const epId = ep.id;
  const [{ data: wex }, { data: proj }, { data: certs }, { data: urow }] = await Promise.all([
    sb.from("work_experiences").select("*").eq("employee_id", epId).order("sort_order", { ascending: true }),
    sb.from("employee_projects").select("*").eq("employee_id", epId).order("sort_order", { ascending: true }),
    sb.from("certifications").select("*").eq("employee_id", epId),
    sb.from("users").select("*").eq("id", userId).maybeSingle(),
  ]);
  const workExperiences = (wex ?? []).map((r) => mapWorkExperienceRow(r as Record<string, unknown>));
  const projects = (proj ?? []).map((r) => mapEmployeeProjectRow(r as Record<string, unknown>));
  const certifications = (certs ?? []).map((r) => mapCertificationRow(r as Record<string, unknown>));
  return { ep, workExperiences, projects, certifications, userRow: urow as Record<string, unknown> | null };
}

export async function GET() {
  const ctx = await requireUser();
  if (!ctx || ctx.user.userType !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const bundle = await loadEmployeeBundle(ctx.user.id);
  if (!bundle?.ep) return NextResponse.json({ error: "No profile" }, { status: 404 });
  const { ep, workExperiences, projects, certifications, userRow } = bundle;
  if (!userRow) return NextResponse.json({ error: "No profile" }, { status: 404 });

  return NextResponse.json({
    user: {
      fullName: userRow.full_name,
      phone: userRow.phone,
      city: userRow.city,
      profilePhotoUrl: userRow.profile_photo_url,
      preferredLanguage: userRow.preferred_language,
    },
    profile: {
      ...ep,
      workExperiences,
      projects,
      certifications,
      skills: parseStringArray(ep.skills),
      workTypes: parseStringArray(ep.workTypes),
      languages: parseLanguageList(ep.languages),
    },
  });
}

export async function PATCH(req: Request) {
  const ctx = await requireUser();
  if (!ctx || ctx.user.userType !== "employee") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  const publishRequested = b.profile?.published === true;

  if (b.user?.fullName !== undefined) {
    const len = b.user.fullName.trim().length;
    if (len < 2 || len > 60) {
      return NextResponse.json({ error: "Full name must be 2-60 characters." }, { status: 400 });
    }
  }
  if (!isValidPhoneUz(b.user?.phone)) {
    return NextResponse.json(
      { error: "Phone must match +998 XX XXX XX XX format." },
      { status: 400 },
    );
  }
  if (b.profile?.jobTitle !== undefined && (b.profile.jobTitle || "").length > 80) {
    return NextResponse.json({ error: "Job title must be at most 80 characters." }, { status: 400 });
  }
  if (b.profile?.bio !== undefined) {
    const bioLen = (b.profile.bio || "").trim().length;
    if (bioLen > 500) {
      return NextResponse.json({ error: "Bio must be at most 500 characters." }, { status: 400 });
    }
  }
  if (b.profile?.skills && b.profile.skills.length > 15) {
    return NextResponse.json({ error: "Skills cannot exceed 15 items." }, { status: 400 });
  }
  if (b.workExperiences && b.workExperiences.length > 5) {
    return NextResponse.json({ error: "Work experience is limited to 5 entries." }, { status: 400 });
  }
  if (b.projects && b.projects.length > 5) {
    return NextResponse.json({ error: "Projects are limited to 5 entries." }, { status: 400 });
  }
  if (b.profile?.salaryMin != null && b.profile?.salaryMax != null && b.profile.salaryMax < b.profile.salaryMin) {
    return NextResponse.json({ error: "Salary max must be greater than or equal to salary min." }, { status: 400 });
  }
  if (b.profile?.dateOfBirth && isFutureDate(b.profile.dateOfBirth)) {
    return NextResponse.json({ error: "Date of birth cannot be in the future." }, { status: 400 });
  }
  if (b.profile?.graduationYear != null && b.profile.graduationYear > new Date().getFullYear()) {
    return NextResponse.json({ error: "Graduation year cannot be in the future." }, { status: 400 });
  }
  for (const w of b.workExperiences ?? []) {
    if (w.startDate && isFutureDate(w.startDate)) {
      return NextResponse.json({ error: "Work experience start date cannot be in the future." }, { status: 400 });
    }
    if (w.endDate && isFutureDate(w.endDate)) {
      return NextResponse.json({ error: "Work experience end date cannot be in the future." }, { status: 400 });
    }
    if (w.description && w.description.length > 300) {
      return NextResponse.json({ error: "Work experience description max length is 300." }, { status: 400 });
    }
  }
  for (const p of b.projects ?? []) {
    if (p.description && p.description.length > 200) {
      return NextResponse.json({ error: "Project description max length is 200." }, { status: 400 });
    }
  }

  const userId = ctx.user.id;
  const bundle = await loadEmployeeBundle(userId);
  if (!bundle) return NextResponse.json({ error: "No profile" }, { status: 404 });
  let { ep, workExperiences, projects, certifications } = bundle;

  if (publishRequested) {
    const nextJobTitle = b.profile?.jobTitle ?? ep.jobTitle ?? "";
    const nextCategory = b.profile?.jobCategory ?? ep.jobCategory ?? "";
    const nextSubcategory = b.profile?.jobSubcategory ?? ep.jobSubcategory ?? "";
    const nextAvailability = b.profile?.availability ?? ep.availability ?? "";
    const nextWorkTypes = b.profile?.workTypes ?? parseStringArray(ep.workTypes);
    const nextBio = (b.profile?.bio ?? ep.bio ?? "").trim();
    const nextSkills = b.profile?.skills ?? parseStringArray(ep.skills);
    const nextEducation = b.profile?.educationLevel ?? ep.educationLevel ?? "";
    const nextCity = b.user?.city ?? ctx.user.city ?? "";

    if (!nextCity) return NextResponse.json({ error: "City is required to publish." }, { status: 400 });
    if (!nextJobTitle) return NextResponse.json({ error: "Job title is required to publish." }, { status: 400 });
    if (!nextCategory) return NextResponse.json({ error: "Job category is required to publish." }, { status: 400 });
    if (!nextSubcategory) return NextResponse.json({ error: "Job subcategory is required to publish." }, { status: 400 });
    if (!nextWorkTypes.length) return NextResponse.json({ error: "Select at least one work type." }, { status: 400 });
    if (!nextAvailability) return NextResponse.json({ error: "Availability is required to publish." }, { status: 400 });
    if (nextBio.length < 50) return NextResponse.json({ error: "Bio must be at least 50 characters to publish." }, { status: 400 });
    if (nextSkills.length < 3) return NextResponse.json({ error: "Add at least 3 skills to publish." }, { status: 400 });
    if (!nextEducation) return NextResponse.json({ error: "Education level is required to publish." }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  if (b.user) {
    const uPatch: Record<string, unknown> = {};
    if (b.user.fullName !== undefined) uPatch.full_name = b.user.fullName;
    if (b.user.phone !== undefined) uPatch.phone = b.user.phone;
    if (b.user.city !== undefined) uPatch.city = b.user.city;
    if (b.user.profilePhotoUrl !== undefined) uPatch.profile_photo_url = b.user.profilePhotoUrl;
    if (b.user.preferredLanguage !== undefined) uPatch.preferred_language = b.user.preferredLanguage;
    if (Object.keys(uPatch).length) await sb.from("users").update(uPatch).eq("id", userId);
  }

  if (b.workExperiences) {
    await sb.from("work_experiences").delete().eq("employee_id", ep.id);
    let rank = 0;
    for (const w of b.workExperiences) {
      if (!w.companyName || !w.jobTitle) continue;
      await sb.from("work_experiences").insert({
        employee_id: ep.id,
        company_name: w.companyName,
        job_title: w.jobTitle,
        start_date: w.startDate ? new Date(w.startDate).toISOString() : null,
        end_date: w.endDate ? new Date(w.endDate).toISOString() : null,
        is_current: w.isCurrent ?? false,
        description: w.description ?? null,
        sort_order: rank++,
      });
    }
    const rb = await loadEmployeeBundle(userId);
    if (rb) ({ ep, workExperiences, projects, certifications } = rb);
  }

  if (b.projects) {
    await sb.from("employee_projects").delete().eq("employee_id", ep.id);
    let rank = 0;
    for (const p of b.projects) {
      if (!p.projectName) continue;
      await sb.from("employee_projects").insert({
        employee_id: ep.id,
        project_name: p.projectName,
        description: p.description ?? null,
        url: p.url ?? null,
        sort_order: rank++,
      });
    }
    const rb = await loadEmployeeBundle(userId);
    if (rb) ({ ep, workExperiences, projects, certifications } = rb);
  }

  if (b.certifications) {
    await sb.from("certifications").delete().eq("employee_id", ep.id);
    for (const c of b.certifications) {
      if (!c.name) continue;
      await sb.from("certifications").insert({
        employee_id: ep.id,
        name: c.name,
        organization: c.organization ?? "",
        year: c.year ?? null,
      });
    }
    const rb = await loadEmployeeBundle(userId);
    if (rb) ({ ep, workExperiences, projects, certifications } = rb);
  }

  const profilePatch = b.profile ?? {};
  const skillsArr = profilePatch.skills ?? parseStringArray(ep.skills);
  const langsArr = profilePatch.languages ?? parseLanguageList(ep.languages);

  const { data: updatedUserRow } = await sb.from("users").select("*").eq("id", userId).maybeSingle();
  const nextBio = profilePatch.bio === undefined ? ep.bio : profilePatch.bio;
  const nextSalMin = profilePatch.salaryMin === undefined ? ep.salaryMin : profilePatch.salaryMin;
  const nextSalMax = profilePatch.salaryMax === undefined ? ep.salaryMax : profilePatch.salaryMax;
  const nextCv = profilePatch.cvUrl === undefined ? ep.cvUrl : profilePatch.cvUrl;
  const nextPort = profilePatch.portfolioUrl === undefined ? ep.portfolioUrl : profilePatch.portfolioUrl;
  const nextContact =
    profilePatch.contactVisible === undefined ? ep.contactVisible : profilePatch.contactVisible;

  const weCount =
    b.workExperiences !== undefined
      ? b.workExperiences.filter((x) => x.companyName && x.jobTitle).length
      : workExperiences.length;
  const projCount =
    b.projects !== undefined ? b.projects.filter((x) => x.projectName).length : projects.length;

  const strength = computeProfileStrengthFromParts({
    profilePhotoUrl: updatedUserRow?.profile_photo_url as string | null | undefined,
    bio: nextBio,
    skills: skillsArr,
    salaryMin: nextSalMin,
    salaryMax: nextSalMax,
    workExperienceCount: weCount,
    cvUrl: nextCv,
    portfolioUrl: nextPort,
    projectCount: projCount,
    languageCount: langsArr.length,
    contactVisible: nextContact,
  });

  const finalProfPatch: Record<string, unknown> = { profile_strength: strength };
  const pp = profilePatch;
  if (pp.jobTitle !== undefined) finalProfPatch.job_title = pp.jobTitle;
  if (pp.jobCategory !== undefined) finalProfPatch.job_category = pp.jobCategory;
  if (pp.jobSubcategory !== undefined) finalProfPatch.job_subcategory = pp.jobSubcategory;
  if (pp.bio !== undefined) finalProfPatch.bio = pp.bio;
  if (pp.skills) finalProfPatch.skills = stringifyStringArray(pp.skills);
  if (pp.yearsOfExperience !== undefined) finalProfPatch.years_of_experience = pp.yearsOfExperience;
  if (pp.educationLevel !== undefined) finalProfPatch.education_level = pp.educationLevel;
  if (pp.university !== undefined) finalProfPatch.university = pp.university;
  if (pp.fieldOfStudy !== undefined) finalProfPatch.field_of_study = pp.fieldOfStudy;
  if (pp.graduationYear !== undefined) finalProfPatch.graduation_year = pp.graduationYear;
  if (pp.salaryMin !== undefined) finalProfPatch.salary_min = pp.salaryMin;
  if (pp.salaryMax !== undefined) finalProfPatch.salary_max = pp.salaryMax;
  if (pp.salaryNegotiable !== undefined) finalProfPatch.salary_negotiable = pp.salaryNegotiable;
  if (pp.priceType !== undefined) finalProfPatch.price_type = pp.priceType;
  if (pp.workTypes) finalProfPatch.work_types = stringifyStringArray(pp.workTypes);
  if (pp.availability !== undefined) finalProfPatch.availability = pp.availability;
  if (pp.languages) finalProfPatch.languages = stringifyLanguageList(pp.languages);
  if (pp.portfolioUrl !== undefined) finalProfPatch.portfolio_url = pp.portfolioUrl;
  if (pp.cvUrl !== undefined) finalProfPatch.cv_url = pp.cvUrl;
  if (pp.contactVisible !== undefined) finalProfPatch.contact_visible = pp.contactVisible;
  if (pp.isProfilePublic !== undefined) finalProfPatch.is_profile_public = pp.isProfilePublic;
  if (pp.showProfileViews !== undefined) finalProfPatch.show_profile_views = pp.showProfileViews;
  if (pp.published !== undefined) finalProfPatch.published = pp.published;
  if (pp.dateOfBirth !== undefined)
    finalProfPatch.date_of_birth = pp.dateOfBirth ? new Date(pp.dateOfBirth).toISOString() : null;
  if (pp.gender !== undefined) finalProfPatch.gender = pp.gender;

  await sb.from("employee_profiles").update(finalProfPatch).eq("id", ep.id);

  return NextResponse.json({ ok: true });
}
