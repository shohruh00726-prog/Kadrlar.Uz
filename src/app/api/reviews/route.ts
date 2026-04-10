import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { mapUserRow, mapEmployerProfileRow } from "@/lib/db/mappers";

const createSchema = z.object({
  conversationId: z.string().uuid(),
  overallRating: z.number().int().min(1).max(5),
  dimension1Rating: z.number().int().min(1).max(5),
  dimension2Rating: z.number().int().min(1).max(5),
  dimension3Rating: z.number().int().min(1).max(5),
  writtenReview: z.string().max(300).optional(),
  wouldAgain: z.boolean(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const revieweeId = searchParams.get("revieweeId");
  const limit = Number(searchParams.get("limit") || "3");
  if (!revieweeId) return NextResponse.json({ error: "revieweeId required" }, { status: 400 });

  const now = new Date();
  const sb = getSupabaseAdmin();
  const { data: allRaw } = await sb
    .from("reviews")
    .select("*")
    .eq("reviewee_id", revieweeId)
    .eq("is_flagged", false)
    .order("created_at", { ascending: false })
    .limit(200);

  const visible = (allRaw ?? []).filter((r) => {
    if (r.is_published) return true;
    if (r.published_at && new Date(r.published_at as string) <= now) return true;
    return false;
  });
  const take = Math.max(1, Math.min(limit, 50));
  const slice = visible.slice(0, take);

  const reviewerIds = [...new Set(slice.map((r) => r.reviewer_id as string))];
  const { data: revUsers } =
    reviewerIds.length > 0
      ? await sb.from("users").select("*, employer_profiles(*)").in("id", reviewerIds)
      : { data: [] as Record<string, unknown>[] };
  const byReviewer = new Map((revUsers ?? []).map((u) => [u.id as string, u as Record<string, unknown>]));

  let sum = 0;
  for (const r of visible) sum += r.overall_rating as number;
  const avg = visible.length ? sum / visible.length : 0;

  const { count: verifiedHireCount } = await sb
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("reviewee_id", revieweeId)
    .eq("reviewer_type", "employer")
    .eq("is_published", true)
    .eq("is_flagged", false);

  return NextResponse.json({
    reviews: slice.map((r) => {
      const ru = byReviewer.get(r.reviewer_id as string);
      const reviewer = ru ? mapUserRow(ru) : null;
      const erArr = ru?.employer_profiles as Record<string, unknown>[] | undefined;
      const er = erArr?.[0] ? mapEmployerProfileRow(erArr[0]) : null;
      return {
        id: r.id,
        reviewerName: er?.companyName ?? reviewer?.fullName ?? "",
        reviewerType: r.reviewer_type,
        overallRating: r.overall_rating,
        dimension1Rating: r.dimension_1_rating,
        dimension2Rating: r.dimension_2_rating,
        dimension3Rating: r.dimension_3_rating,
        writtenReview: r.written_review,
        wouldAgain: r.would_again,
        createdAt: new Date(r.created_at as string),
        responseText: r.response_text,
        responseAt: r.response_at ? new Date(r.response_at as string) : null,
      };
    }),
    summary: {
      averageRating: avg,
      totalReviews: visible.length,
      verifiedHireCount: verifiedHireCount ?? 0,
    },
  });
}

export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json();
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const body = parsed.data;

  const sb = getSupabaseAdmin();
  const { data: conv } = await sb.from("conversations").select("*").eq("id", body.conversationId).maybeSingle();
  if (
    !conv ||
    ((conv.employer_id as string) !== s.userId && (conv.employee_id as string) !== s.userId)
  ) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { data: saved } = await sb
    .from("saved_candidates")
    .select("notes")
    .eq("employer_id", conv.employer_id as string)
    .eq("employee_id", conv.employee_id as string)
    .maybeSingle();

  let hiredAt: Date | null = null;
  try {
    const meta = saved?.notes ? (JSON.parse(saved.notes as string) as { status?: string; hiredAt?: string }) : {};
    if (meta.status === "Hired" && meta.hiredAt) hiredAt = new Date(meta.hiredAt);
  } catch {
    hiredAt = null;
  }
  if (!hiredAt) return NextResponse.json({ error: "Review is available only for hired candidates." }, { status: 400 });

  const openAt = new Date(hiredAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const closeAt = new Date(openAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  if (now < openAt || now > closeAt) {
    return NextResponse.json({ error: "Review window is closed for this hire." }, { status: 400 });
  }

  const reviewerType = s.role;
  const revieweeId =
    s.userId === (conv.employer_id as string) ? (conv.employee_id as string) : (conv.employer_id as string);
  const publishedAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await sb
    .from("reviews")
    .select("id")
    .eq("reviewer_id", s.userId)
    .eq("conversation_id", conv.id as string)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "You already submitted a review for this hire." }, { status: 409 });

  const { data: row, error } = await sb
    .from("reviews")
    .insert({
      reviewer_id: s.userId,
      reviewee_id: revieweeId,
      conversation_id: conv.id as string,
      reviewer_type: reviewerType,
      overall_rating: body.overallRating,
      dimension_1_rating: body.dimension1Rating,
      dimension_2_rating: body.dimension2Rating,
      dimension_3_rating: body.dimension3Rating,
      written_review: body.writtenReview ?? null,
      would_again: body.wouldAgain,
      is_published: false,
      is_flagged: false,
      published_at: publishedAt,
    })
    .select()
    .single();
  if (error || !row) {
    console.error(error);
    return NextResponse.json({ error: "Could not create review" }, { status: 500 });
  }

  const r = row as Record<string, unknown>;
  return NextResponse.json({
    ok: true,
    review: {
      id: r.id,
      reviewerId: r.reviewer_id,
      revieweeId: r.reviewee_id,
      conversationId: r.conversation_id,
      reviewerType: r.reviewer_type,
      overallRating: r.overall_rating,
      dimension1Rating: r.dimension_1_rating,
      dimension2Rating: r.dimension_2_rating,
      dimension3Rating: r.dimension_3_rating,
      writtenReview: r.written_review,
      wouldAgain: r.would_again,
      isPublished: r.is_published,
      isFlagged: r.is_flagged,
      createdAt: new Date(r.created_at as string),
      publishedAt: r.published_at ? new Date(r.published_at as string) : null,
    },
  });
}
