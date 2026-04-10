import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = SupabaseClient<any, "public", any>;

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

const stringifyArr = (v: unknown[]) => JSON.stringify(v);

async function deleteAuthUserByEmail(sb: Sb, email: string) {
  const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
  if (u) await sb.auth.admin.deleteUser(u.id);
}

async function createAuthAppUser(
  sb: Sb,
  input: {
    email: string;
    password: string;
    user: Record<string, unknown>;
  },
) {
  await deleteAuthUserByEmail(sb, input.email);
  const { data: created, error } = await sb.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (error || !created.user) throw error ?? new Error("auth.createUser failed");
  const id = created.user.id;
  const password_hash = await bcrypt.hash(input.password, 10);
  const { error: insErr } = await sb.from("users").insert({ id, password_hash, ...input.user });
  if (insErr) throw insErr;
  return id;
}

async function wipeTable(sb: Sb, table: string) {
  const { error } = await sb.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw error;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const sb = createClient<any, "public", any>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const wipeWithId = [
    "profile_search_appearances",
    "saved_search_matches",
    "saved_searches",
    "saved_candidate_statuses",
    "profile_view_logs",
    "saved_candidates",
    "messages",
    "reviews",
    "conversations",
    "saved_teams",
    "team_invites",
    "team_projects",
    "team_members",
    "teams",
    "certifications",
    "employee_projects",
    "work_experiences",
    "employee_profiles",
    "employer_profiles",
    "notifications",
    "admin_actions_log",
    "admin_users",
  ] as const;
  for (const t of wipeWithId) {
    await wipeTable(sb, t);
  }
  await sb.from("team_employer_views").delete().gte("created_at", "1970-01-01T00:00:00Z");
  await sb.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const demoEmails = [
    "employer@kadrlar.uz",
    "malika@example.uz",
    "jahongir@example.uz",
    "dilnoza@example.uz",
    "admin@kadrlar.uz",
  ];
  for (const e of demoEmails) await deleteAuthUserByEmail(sb, e);

  const password = "password123";

  const employerId = await createAuthAppUser(sb, {
    email: "employer@kadrlar.uz",
    password,
    user: {
      email: "employer@kadrlar.uz",
      user_type: "employer",
      full_name: "Dilmurod Toshmurodov",
      phone: "+998901112233",
      city: "Tashkent",
      preferred_language: "en",
      onboarding_employer_completed: true,
    },
  });
  await sb.from("employer_profiles").insert({
    id: randomUUID(),
    user_id: employerId,
    company_name: "Silk HR Labs",
    industry: "Technology",
    company_description: "Hiring for product teams across Uzbekistan.",
  });

  const employeesData = [
    {
      email: "malika@example.uz",
      fullName: "Malika Karimova",
      city: "Tashkent",
      jobTitle: "IELTS Instructor",
      jobCategory: "Education & Teaching",
      jobSubcategory: "IELTS Teacher",
      skills: ["IELTS", "Speaking", "Writing"],
      years: 5,
      salaryMin: 450,
      salaryMax: 700,
      availability: "Available now",
      bio: "IELTS instructor with 5+ years helping students reach band 7+.",
    },
    {
      email: "jahongir@example.uz",
      fullName: "Jahongir Usmonov",
      city: "Samarkand",
      jobTitle: "React Developer",
      jobCategory: "Technology & IT",
      jobSubcategory: "Frontend Developer",
      skills: ["React", "TypeScript", "Next.js"],
      years: 4,
      salaryMin: 900,
      salaryMax: 1400,
      availability: "Open to offers",
      bio: "Frontend engineer focused on performance and UX.",
    },
    {
      email: "dilnoza@example.uz",
      fullName: "Dilnoza Rahimova",
      city: "Namangan",
      jobTitle: "HR Manager",
      jobCategory: "Business & Finance",
      jobSubcategory: "HR Manager",
      skills: ["Recruiting", "Onboarding", "HR policy"],
      years: 6,
      salaryMin: 500,
      salaryMax: 800,
      availability: "Available in 1 month",
      bio: "HR partner for growing teams.",
    },
  ];

  const employeeIds: string[] = [];
  for (const e of employeesData) {
    const uid = await createAuthAppUser(sb, {
      email: e.email,
      password,
      user: {
        email: e.email,
        user_type: "employee",
        full_name: e.fullName,
        city: e.city,
        phone: "+998901112200",
        preferred_language: "uz",
        onboarding_employee_completed: true,
      },
    });
    employeeIds.push(uid);
    const { data: ep, error: epErr } = await sb
      .from("employee_profiles")
      .insert({
        id: randomUUID(),
        user_id: uid,
        job_title: e.jobTitle,
        job_category: e.jobCategory,
        job_subcategory: e.jobSubcategory,
        bio: e.bio,
        skills: stringifyArr(e.skills),
        years_of_experience: e.years,
        salary_min: e.salaryMin,
        salary_max: e.salaryMax,
        availability: e.availability,
        work_types: stringifyArr(["Full-time", "Remote"]),
        education_level: "Bachelor",
        languages: stringifyArr([{ language: "Uzbek", proficiency: "Native" }]),
        profile_strength: 82,
        profile_views: 12,
        published: true,
        contact_visible: true,
      })
      .select("id")
      .single();
    if (epErr || !ep) throw epErr;
    await sb.from("work_experiences").insert({
      employee_id: ep.id as string,
      company_name: "Language Center",
      job_title: e.jobTitle,
      is_current: true,
      description: "Teaching and curriculum.",
      sort_order: 0,
    });
  }

  const leaderId = employeeIds[1];
  const malikaId = employeeIds[0];
  const { data: team, error: teamErr } = await sb
    .from("teams")
    .insert({
      team_name: "Pixel Studio",
      tagline: "Design · Dev · PM in one package",
      description: "End-to-end product squad for web apps.",
      category: "Technology & IT",
      skills: stringifyArr(["UI/UX", "React", "PM"]),
      work_types: stringifyArr(["Full-time project", "Remote"]),
      price_min: 2000,
      price_max: 3500,
      city: "Samarkand",
      availability: "Available now",
      leader_id: leaderId,
      is_public: true,
    })
    .select("id")
    .single();
  if (teamErr || !team) throw teamErr;

  await sb.from("team_members").insert([
    {
      team_id: team.id as string,
      user_id: leaderId,
      role_in_team: "Tech lead",
      is_leader: true,
      status: "active",
    },
    {
      team_id: team.id as string,
      user_id: malikaId,
      role_in_team: "Lead designer",
      is_leader: false,
      status: "active",
    },
  ]);

  const adminHash = await bcrypt.hash("admin123", 10);
  await sb.from("admin_users").insert({
    email: "admin@kadrlar.uz",
    password_hash: adminHash,
    full_name: "Seed Admin",
    role: "super_admin",
  });

  console.log("Seed OK. Employer: employer@kadrlar.uz — password123");
  console.log("Employees: malika@, jahongir@, dilnoza@ @example.uz — password123");
  console.log("Admin: admin@kadrlar.uz — admin123");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
