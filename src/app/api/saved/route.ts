import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { createNotification } from "@/lib/notify";
import { parseStringArray } from "@/lib/json-fields";
import { mapUserRow, mapEmployeeProfileRow } from "@/lib/db/mappers";

const SAVE_LIMIT_FREE = 20;

function parseMeta(notes: string | null) {
  if (!notes) return { notes: null as string | null, status: "Interested" };
  try {
    const obj = JSON.parse(notes) as { notes?: string | null; status?: string };
    return {
      notes: obj.notes ?? null,
      status: obj.status ?? "Interested",
    };
  } catch {
    return { notes, status: "Interested" };
  }
}

export async function GET(req: Request) {
  const s = await requireSession();
  if (!s || s.role !== "employer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status") || "";
  const categoryFilter = url.searchParams.get("category") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const exportCsv = url.searchParams.get("export") === "csv";

  const sb = getSupabaseAdmin();
  const { data: rows } = await sb
    .from("saved_candidates")
    .select("*")
    .eq("employer_id", s.userId)
    .order("saved_at", { ascending: false });

  const empIds = [...new Set((rows ?? []).map((r) => r.employee_id as string))];
  const { data: userRows } =
    empIds.length > 0
      ? await sb.from("users").select("*, employee_profiles(*)").in("id", empIds)
      : { data: [] as Record<string, unknown>[] };
  const byId = new Map((userRows ?? []).map((r) => [r.id as string, r as Record<string, unknown>]));

  let list = (rows ?? []).map((r) => {
    const uRaw = byId.get(r.employee_id as string);
    const u = uRaw ? mapUserRow(uRaw) : null;
    const epArr = uRaw?.employee_profiles as Record<string, unknown>[] | undefined;
    const ep = epArr?.[0] ? mapEmployeeProfileRow(epArr[0]) : null;
    const meta = parseMeta(r.notes as string | null);
    return {
      employeeId: r.employee_id,
      notes: meta.notes,
      status: meta.status,
      savedAt: new Date(r.saved_at as string),
      fullName: u?.fullName ?? "",
      jobTitle: ep?.jobTitle,
      jobCategory: ep?.jobCategory,
      city: u?.city,
      skills: ep ? parseStringArray(ep.skills) : [],
      salaryMin: ep?.salaryMin,
      salaryMax: ep?.salaryMax,
      salaryNegotiable: ep?.salaryNegotiable ?? false,
    };
  });
  if (statusFilter) list = list.filter((x) => x.status === statusFilter);
  if (categoryFilter) list = list.filter((x) => x.jobCategory === categoryFilter);
  if (from) list = list.filter((x) => x.savedAt >= new Date(from));
  if (to) list = list.filter((x) => x.savedAt <= new Date(to));

  if (exportCsv) {
    const header = ["Employee ID", "Full Name", "Job Title", "Category", "City", "Status", "Saved At"];
    const lines = list.map((x) =>
      [x.employeeId, x.fullName, x.jobTitle || "", x.jobCategory || "", x.city || "", x.status, x.savedAt.toISOString()]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=saved-candidates.csv",
      },
    });
  }

  return NextResponse.json({ saved: list });
}

const postSchema = z.object({
  employeeId: z.string().uuid(),
});

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s || s.role !== "employer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json();
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: target } = await sb
    .from("users")
    .select("id, user_type")
    .eq("id", parsed.data.employeeId)
    .maybeSingle();
  if (!target || target.user_type !== "employee") {
    return NextResponse.json({ error: "Invalid candidate" }, { status: 400 });
  }

  const { data: existing } = await sb
    .from("saved_candidates")
    .select("id")
    .eq("employer_id", s.userId)
    .eq("employee_id", parsed.data.employeeId)
    .maybeSingle();

  const { count: totalSaved } = await sb
    .from("saved_candidates")
    .select("*", { count: "exact", head: true })
    .eq("employer_id", s.userId);

  if (!existing && (totalSaved ?? 0) >= SAVE_LIMIT_FREE) {
    return NextResponse.json(
      { error: "Free tier limit reached (20 saved candidates)." },
      { status: 403 },
    );
  }

  await sb.from("saved_candidates").upsert(
    {
      employer_id: s.userId,
      employee_id: parsed.data.employeeId,
      notes: JSON.stringify({ status: "Interested", notes: null }),
    },
    { onConflict: "employer_id,employee_id" },
  );

  await createNotification({
    userId: parsed.data.employeeId,
    type: "profile_saved",
    title: "An employer saved your profile!",
    body: "Your profile was bookmarked. They may reach out soon.",
  });

  return NextResponse.json({ ok: true });
}
