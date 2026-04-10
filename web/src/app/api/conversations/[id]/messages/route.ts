import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { createNotification } from "@/lib/notify";
import { mapUserRow, mapMessageRow, mapEmployerProfileRow, mapEmployeeProfileRow } from "@/lib/db/mappers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: conv } = await sb.from("conversations").select("*").eq("id", id).maybeSingle();
  if (
    !conv ||
    ((conv.employer_id as string) !== s.userId && (conv.employee_id as string) !== s.userId)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: msgRows } = await sb
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("sent_at", { ascending: true });
  const messages = (msgRows ?? []).map((r) => mapMessageRow(r as Record<string, unknown>));

  const readPatch =
    s.role === "employer"
      ? { employer_last_read: new Date().toISOString() }
      : { employee_last_read: new Date().toISOString() };
  await sb.from("conversations").update(readPatch).eq("id", id);

  const peerId =
    (conv.employer_id as string) === s.userId ? (conv.employee_id as string) : (conv.employer_id as string);
  const { data: peerRow } = await sb
    .from("users")
    .select("*, employee_profiles(*), employer_profiles(*)")
    .eq("id", peerId)
    .maybeSingle();
  const pr = peerRow as Record<string, unknown> | null;
  const peerUser = pr ? mapUserRow(pr) : null;
  const erArr = pr?.employer_profiles as Record<string, unknown>[] | undefined;
  const epArr = pr?.employee_profiles as Record<string, unknown>[] | undefined;
  const er = erArr?.[0] ? mapEmployerProfileRow(erArr[0]) : null;
  const _ep = epArr?.[0] ? mapEmployeeProfileRow(epArr[0]) : null;
  const peerName = er?.companyName || peerUser?.fullName || "User";
  const otherLastRead =
    s.role === "employer"
      ? conv.employee_last_read
        ? new Date(conv.employee_last_read as string)
        : null
      : conv.employer_last_read
        ? new Date(conv.employer_last_read as string)
        : null;

  return NextResponse.json({ messages, meId: s.userId, peerName, otherLastRead, peerId });
}

const postSchema = z.object({
  content: z.string().min(1).max(5000),
  messageType: z.enum(["text", "file", "contact_card"]).optional(),
});

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: conv } = await sb.from("conversations").select("*").eq("id", id).maybeSingle();
  if (
    !conv ||
    ((conv.employer_id as string) !== s.userId && (conv.employee_id as string) !== s.userId)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: existing } = await sb
    .from("messages")
    .select("id")
    .eq("conversation_id", id)
    .limit(1)
    .maybeSingle();
  if (s.role === "employee" && !existing) {
    return NextResponse.json({ error: "Wait for employer message" }, { status: 403 });
  }

  const json = await req.json();
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { data: inserted, error: insErr } = await sb
    .from("messages")
    .insert({
      conversation_id: id,
      sender_id: s.userId,
      content: parsed.data.content,
      message_type: parsed.data.messageType ?? "text",
    })
    .select()
    .single();
  if (insErr || !inserted) {
    console.error(insErr);
    return NextResponse.json({ error: "Could not send" }, { status: 500 });
  }

  await sb
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", id);

  const targetUserId =
    s.role === "employer" ? (conv.employee_id as string) : (conv.employer_id as string);
  const { data: senderRow } = await sb
    .from("users")
    .select("*, employer_profiles(*)")
    .eq("id", s.userId)
    .maybeSingle();
  const sr = senderRow as Record<string, unknown> | null;
  const sender = sr ? mapUserRow(sr) : null;
  const sErArr = sr?.employer_profiles as Record<string, unknown>[] | undefined;
  const senderEr = sErArr?.[0] ? mapEmployerProfileRow(sErArr[0]) : null;
  const preview = parsed.data.content.slice(0, 60);
  if (s.role === "employer") {
    await createNotification({
      userId: targetUserId,
      type: "new_message",
      title: `New message from ${senderEr?.companyName ?? sender?.fullName ?? "Employer"}`,
      body: preview,
      relatedId: id,
    });
  } else {
    await createNotification({
      userId: targetUserId,
      type: "candidate_reply",
      title: `${sender?.fullName ?? "Candidate"} replied to your message`,
      body: preview,
      relatedId: id,
    });
  }

  return NextResponse.json({ ok: true, message: mapMessageRow(inserted as Record<string, unknown>) });
}
