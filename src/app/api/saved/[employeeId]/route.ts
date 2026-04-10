import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";

type Params = { params: Promise<{ employeeId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { employeeId } = await params;
  const s = await requireSession();
  if (!s || s.role !== "employer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabaseAdmin();
  await sb.from("saved_candidates").delete().eq("employer_id", s.userId).eq("employee_id", employeeId);
  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  notes: z.string().nullable().optional(),
  status: z.enum(["Interested", "Contacted", "Hired", "Not a fit"]).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { employeeId } = await params;
  const s = await requireSession();
  if (!s || s.role !== "employer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { data: current } = await sb
    .from("saved_candidates")
    .select("notes")
    .eq("employer_id", s.userId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  let currentMeta: { notes: string | null; status: string; hiredAt: string | null } = {
    notes: null,
    status: "Interested",
    hiredAt: null,
  };
  if (current?.notes) {
    try {
      const parsedNotes = JSON.parse(current.notes as string) as {
        notes?: string | null;
        status?: string;
        hiredAt?: string | null;
      };
      currentMeta = {
        notes: parsedNotes.notes ?? null,
        status: parsedNotes.status ?? "Interested",
        hiredAt: parsedNotes.hiredAt ?? null,
      };
    } catch {
      currentMeta = { notes: current.notes as string, status: "Interested", hiredAt: null };
    }
  }
  const payload = {
    notes: parsed.data.notes === undefined ? currentMeta.notes : parsed.data.notes,
    status: parsed.data.status ?? currentMeta.status,
    hiredAt:
      parsed.data.status === "Hired"
        ? currentMeta.status === "Hired"
          ? currentMeta.hiredAt ?? new Date().toISOString()
          : new Date().toISOString()
        : currentMeta.hiredAt,
  };

  await sb
    .from("saved_candidates")
    .update({ notes: JSON.stringify(payload) })
    .eq("employer_id", s.userId)
    .eq("employee_id", employeeId);

  return NextResponse.json({ ok: true });
}
