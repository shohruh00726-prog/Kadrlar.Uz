import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/auth-user";
import { withErrorHandler } from "@/lib/api-utils";
import { mapUserRow, mapEmployerProfileRow, mapEmployeeProfileRow } from "@/lib/db/mappers";

function getEpFromUserRow(u: Record<string, unknown>) {
  const arr = u.employee_profiles as Record<string, unknown>[] | null | undefined;
  const raw = arr?.[0];
  return raw ? mapEmployeeProfileRow(raw) : null;
}

function getErFromUserRow(u: Record<string, unknown>) {
  const arr = u.employer_profiles as Record<string, unknown>[] | null | undefined;
  const raw = arr?.[0];
  return raw ? mapEmployerProfileRow(raw) : null;
}

export const GET = withErrorHandler(async () => {
  const s = await requireSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();

  if (s.role === "employer") {
    const { data: convs } = await sb
      .from("conversations")
      .select("*")
      .eq("employer_id", s.userId)
      .order("last_message_at", { ascending: false, nullsFirst: false });
    const convRows = convs ?? [];
    const employeeIds = [...new Set(convRows.map((c) => c.employee_id as string))];
    const { data: userRows } =
      employeeIds.length > 0
        ? await sb
            .from("users")
            .select("*, employee_profiles(*)")
            .in("id", employeeIds)
        : { data: [] as Record<string, unknown>[] };
    const userById = new Map(
      (userRows ?? []).map((r) => [r.id as string, r as Record<string, unknown>]),
    );
    const convIds = convRows.map((c) => c.id as string);
    const { data: allMsgs } =
      convIds.length > 0
        ? await sb.from("messages").select("*").in("conversation_id", convIds).order("sent_at", { ascending: false })
        : { data: [] as Record<string, unknown>[] };
    const lastByConv = new Map<string, Record<string, unknown>>();
    const unread = new Map<string, number>();
    for (const m of allMsgs ?? []) {
      const cid = m.conversation_id as string;
      if (!lastByConv.has(cid)) lastByConv.set(cid, m as Record<string, unknown>);
      if ((m.sender_id as string) !== s.userId && !m.is_read) {
        unread.set(cid, (unread.get(cid) ?? 0) + 1);
      }
    }
    const list = convRows.map((c) => {
      const uRaw = userById.get(c.employee_id as string);
      const u = uRaw ? mapUserRow(uRaw) : null;
      const ep = uRaw ? getEpFromUserRow(uRaw) : null;
      const last = lastByConv.get(c.id as string);
      return {
        id: c.id,
        peerName: u?.fullName ?? "",
        peerSubtitle: ep?.jobTitle ?? "",
        lastMessage: (last?.content as string) ?? "",
        lastMessageAt: c.last_message_at,
        unreadCount: unread.get(c.id as string) ?? 0,
        status: c.status,
        employeeId: c.employee_id,
      };
    });
    return NextResponse.json({ conversations: list });
  }

  const { data: convs } = await sb
    .from("conversations")
    .select("*")
    .eq("employee_id", s.userId)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  const convRows = convs ?? [];
  const employerIds = [...new Set(convRows.map((c) => c.employer_id as string))];
  const { data: userRows } =
    employerIds.length > 0
      ? await sb.from("users").select("*, employer_profiles(*)").in("id", employerIds)
      : { data: [] as Record<string, unknown>[] };
  const userById = new Map(
    (userRows ?? []).map((r) => [r.id as string, r as Record<string, unknown>]),
  );
  const convIds = convRows.map((c) => c.id as string);
  const { data: allMsgs } =
    convIds.length > 0
      ? await sb.from("messages").select("*").in("conversation_id", convIds).order("sent_at", { ascending: false })
      : { data: [] as Record<string, unknown>[] };
  const lastByConv = new Map<string, Record<string, unknown>>();
  const unread = new Map<string, number>();
  for (const m of allMsgs ?? []) {
    const cid = m.conversation_id as string;
    if (!lastByConv.has(cid)) lastByConv.set(cid, m as Record<string, unknown>);
    if ((m.sender_id as string) !== s.userId && !m.is_read) {
      unread.set(cid, (unread.get(cid) ?? 0) + 1);
    }
  }
  const list = convRows.map((c) => {
    const uRaw = userById.get(c.employer_id as string);
    const u = uRaw ? mapUserRow(uRaw) : null;
    const ep = uRaw ? getErFromUserRow(uRaw) : null;
    const emailDomain = (u?.email ?? "").split("@")[1]?.toLowerCase() ?? "";
    const domainVerified =
      u?.isVerified && !["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"].includes(emailDomain);
    const last = lastByConv.get(c.id as string);
    return {
      id: c.id,
      peerName: ep?.companyName ?? u?.fullName ?? "",
      peerSubtitle: u?.fullName ?? "",
      peerBadge: ep?.isVerified ? "business" : domainVerified ? "email" : null,
      lastMessage: (last?.content as string) ?? "",
      lastMessageAt: c.last_message_at,
      unreadCount: unread.get(c.id as string) ?? 0,
      status: c.status,
      employeeId: c.employee_id,
    };
  });
  return NextResponse.json({ conversations: list });
});

const bodySchema = z.object({ employeeId: z.string().uuid() });

export const POST = withErrorHandler(async (req: Request) => {
  const s = await requireSession();
  if (!s || s.role !== "employer") {
    return NextResponse.json({ error: "Only employers start chats" }, { status: 403 });
  }
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const sb = getSupabaseAdmin();
  const { count: monthlyCount } = await sb
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("sender_id", s.userId)
    .gte("sent_at", monthStart.toISOString());
  if ((monthlyCount ?? 0) >= 10) {
    return NextResponse.json({ error: "Free tier limit reached (10 messages per month)." }, { status: 403 });
  }
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { data: emp } = await sb.from("users").select("id, user_type").eq("id", parsed.data.employeeId).maybeSingle();
  if (!emp || emp.user_type !== "employee") {
    return NextResponse.json({ error: "Invalid employee" }, { status: 400 });
  }

  const { data: conv, error } = await sb
    .from("conversations")
    .upsert(
      {
        employer_id: s.userId,
        employee_id: parsed.data.employeeId,
        last_message_at: new Date().toISOString(),
      },
      { onConflict: "employer_id,employee_id" },
    )
    .select("id")
    .single();
  if (error || !conv) {
    console.error(error);
    return NextResponse.json({ error: "Could not open conversation" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, conversationId: conv.id });
});
