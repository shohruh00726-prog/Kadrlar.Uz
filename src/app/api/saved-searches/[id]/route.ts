import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.typ !== "employer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sb = getSupabaseAdmin();
  const { data: existing } = await sb
    .from("saved_searches")
    .select("id")
    .eq("id", id)
    .eq("employer_id", session.sub)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.alertEnabled !== undefined) patch.alert_enabled = body.alertEnabled;
  if (body.alertFrequency !== undefined) patch.alert_frequency = body.alertFrequency;

  const { data: updated } = await sb.from("saved_searches").update(patch).eq("id", id).select().single();

  return NextResponse.json({ savedSearch: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.typ !== "employer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sb = getSupabaseAdmin();
  const { data: existing } = await sb
    .from("saved_searches")
    .select("id")
    .eq("id", id)
    .eq("employer_id", session.sub)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await sb.from("saved_searches").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
