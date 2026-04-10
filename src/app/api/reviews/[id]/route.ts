import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  flag: z.boolean().optional(),
  responseText: z.string().max(200).optional(),
  overallRating: z.number().int().min(1).max(5).optional(),
  dimension1Rating: z.number().int().min(1).max(5).optional(),
  dimension2Rating: z.number().int().min(1).max(5).optional(),
  dimension3Rating: z.number().int().min(1).max(5).optional(),
  writtenReview: z.string().max(300).optional(),
  wouldAgain: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: review } = await sb.from("reviews").select("*").eq("id", id).maybeSingle();
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const b = parsed.data;

  const reviewerId = review.reviewer_id as string;
  const revieweeId = review.reviewee_id as string;
  const isParticipant = reviewerId === s.userId || revieweeId === s.userId;
  if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (b.flag) {
    await sb.from("reviews").update({ is_flagged: true }).eq("id", id);
    return NextResponse.json({ ok: true });
  }

  if (b.responseText !== undefined) {
    if (revieweeId !== s.userId) {
      return NextResponse.json({ error: "Only review target can respond." }, { status: 403 });
    }
    if (review.response_text) {
      return NextResponse.json({ error: "Response already submitted." }, { status: 400 });
    }
    await sb
      .from("reviews")
      .update({
        response_text: b.responseText,
        response_at: new Date().toISOString(),
      })
      .eq("id", id);
    return NextResponse.json({ ok: true });
  }

  if (reviewerId !== s.userId) {
    return NextResponse.json({ error: "Only reviewer can edit review." }, { status: 403 });
  }
  if (Date.now() - new Date(review.created_at as string).getTime() > 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Edit window closed after 24 hours." }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (b.overallRating !== undefined) patch.overall_rating = b.overallRating;
  if (b.dimension1Rating !== undefined) patch.dimension_1_rating = b.dimension1Rating;
  if (b.dimension2Rating !== undefined) patch.dimension_2_rating = b.dimension2Rating;
  if (b.dimension3Rating !== undefined) patch.dimension_3_rating = b.dimension3Rating;
  if (b.writtenReview !== undefined) patch.written_review = b.writtenReview;
  if (b.wouldAgain !== undefined) patch.would_again = b.wouldAgain;
  await sb.from("reviews").update(patch).eq("id", id);
  return NextResponse.json({ ok: true });
}
