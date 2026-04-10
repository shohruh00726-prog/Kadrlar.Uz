import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";

type Params = { params: Promise<{ id: string }> };

const projectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(300).optional().nullable(),
  url: z.string().max(2048).optional().nullable(),
  imageUrl: z.string().max(2048).optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
});

export async function POST(req: Request, { params }: Params) {
  const { id: teamId } = await params;
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sb = getSupabaseAdmin();
  const { data: team } = await sb.from("teams").select("leader_id").eq("id", teamId).maybeSingle();
  if (!team || team.leader_id !== s.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count: n } = await sb
    .from("team_projects")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId);
  if ((n ?? 0) >= 6) return NextResponse.json({ error: "Maximum 6 team projects" }, { status: 400 });

  const json = await req.json();
  const parsed = projectSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const b = parsed.data;

  const { data: row, error } = await sb
    .from("team_projects")
    .insert({
      team_id: teamId,
      name: b.name,
      description: b.description ?? null,
      url: b.url ?? null,
      image_url: b.imageUrl ?? null,
      completed_at: b.completedAt ? b.completedAt : null,
      sort_order: n ?? 0,
    })
    .select()
    .single();
  if (error || !row) {
    console.error(error);
    return NextResponse.json({ error: "Could not create" }, { status: 500 });
  }
  const r = row as Record<string, unknown>;
  return NextResponse.json({
    ok: true,
    project: {
      id: r.id,
      teamId: r.team_id,
      name: r.name,
      description: r.description,
      url: r.url,
      imageUrl: r.image_url,
      completedAt: r.completed_at ? new Date(r.completed_at as string) : null,
      sortOrder: r.sort_order,
    },
  });
}
