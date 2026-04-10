import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/session";

type PipelineCandidate = {
  employeeId: string;
  fullName: string;
  jobTitle: string;
  city: string;
  photoUrl: string | null;
};

export async function GET() {
  const session = await getSession();
  if (!session || session.typ !== "employer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  const { data: statuses } = await sb
    .from("saved_candidate_statuses")
    .select("*")
    .eq("employer_id", session.sub);

  const employeeIds = [...new Set((statuses ?? []).map((s) => s.employee_id as string))];

  const { data: users } =
    employeeIds.length > 0
      ? await sb.from("users").select("id, full_name, city, profile_photo_url, employee_profiles(job_title)").in("id", employeeIds)
      : { data: [] as Record<string, unknown>[] };

  const userMap = new Map(
    (users ?? []).map((u) => {
      const row = u as Record<string, unknown>;
      const epArr = row.employee_profiles as Record<string, unknown>[] | undefined;
      const jobTitle = (epArr?.[0]?.job_title as string) ?? "";
      return [
        row.id as string,
        {
          fullName: row.full_name as string,
          city: (row.city as string) ?? "",
          profilePhotoUrl: (row.profile_photo_url as string | null) ?? null,
          jobTitle,
        },
      ];
    }),
  );

  const pipeline: Record<string, PipelineCandidate[]> = {
    interested: [],
    contacted: [],
    hired: [],
    not_a_fit: [],
  };

  for (const st of statuses ?? []) {
    const u = userMap.get(st.employee_id as string);
    if (!u) continue;
    const statusKey = st.status as string;
    const column = pipeline[statusKey] ?? pipeline.interested;
    column.push({
      employeeId: st.employee_id as string,
      fullName: u.fullName,
      jobTitle: u.jobTitle,
      city: u.city,
      photoUrl: u.profilePhotoUrl,
    });
  }

  return NextResponse.json({ pipeline });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.typ !== "employer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { employeeId, status } = body;

  if (!employeeId || !status) {
    return NextResponse.json({ error: "employeeId and status required" }, { status: 400 });
  }

  const validStatuses = ["interested", "contacted", "hired", "not_a_fit"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  await sb.from("saved_candidate_statuses").upsert(
    {
      employer_id: session.sub,
      employee_id: employeeId,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "employer_id,employee_id" },
  );

  return NextResponse.json({ ok: true });
}
