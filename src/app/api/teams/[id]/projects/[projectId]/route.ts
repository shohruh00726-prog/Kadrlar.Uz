import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";

type Params = { params: Promise<{ id: string; projectId: string }> };

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(300).nullable().optional(),
  url: z.string().max(2048).nullable().optional(),
  imageUrl: z.string().max(2048).nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { id: teamId, projectId } = await params;
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabaseAdmin();
  const { data: team } = await sb.from("teams").select("leader_id").eq("id", teamId).maybeSingle();
  if (!team || team.leader_id !== s.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: proj } = await sb.from("team_projects").select("id").eq("id", projectId).eq("team_id", teamId).maybeSingle();
  if (!proj) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const b = parsed.data;

  const patchDb: Record<string, unknown> = {};
  if (b.name !== undefined) patchDb.name = b.name;
  if (b.description !== undefined) patchDb.description = b.description;
  if (b.url !== undefined) patchDb.url = b.url;
  if (b.imageUrl !== undefined) patchDb.image_url = b.imageUrl;
  if (b.completedAt !== undefined) patchDb.completed_at = b.completedAt ? b.completedAt : null;

  await sb.from("team_projects").update(patchDb).eq("id", projectId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id: teamId, projectId } = await params;
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabaseAdmin();
  const { data: team } = await sb.from("teams").select("leader_id").eq("id", teamId).maybeSingle();
  if (!team || team.leader_id !== s.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: proj } = await sb.from("team_projects").select("id").eq("id", projectId).eq("team_id", teamId).maybeSingle();
  if (!proj) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await sb.from("team_projects").delete().eq("id", projectId);
  return NextResponse.json({ ok: true });
}
