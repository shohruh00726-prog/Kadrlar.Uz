import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.typ !== "employer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  const { data: searches } = await sb
    .from("saved_searches")
    .select("*")
    .eq("employer_id", session.sub)
    .order("created_at", { ascending: false });

  const ids = (searches ?? []).map((s) => s.id as string);
  const { data: matchRows } =
    ids.length > 0
      ? await sb.from("saved_search_matches").select("saved_search_id").in("saved_search_id", ids).eq("notified", false)
      : { data: [] as { saved_search_id: string }[] };

  const newBySearch = new Map<string, number>();
  for (const m of matchRows ?? []) {
    const sid = m.saved_search_id as string;
    newBySearch.set(sid, (newBySearch.get(sid) ?? 0) + 1);
  }

  const result = (searches ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    searchKeyword: s.search_keyword,
    filters: JSON.parse((s.filters as string) || "{}"),
    alertEnabled: s.alert_enabled,
    alertFrequency: s.alert_frequency,
    lastAlertedAt: s.last_alerted_at ? new Date(s.last_alerted_at as string) : null,
    matchCount: s.match_count,
    newMatches: newBySearch.get(s.id as string) ?? 0,
    createdAt: new Date(s.created_at as string),
  }));

  return NextResponse.json({ savedSearches: result });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.typ !== "employer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, searchKeyword, filters, alertEnabled, alertFrequency } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { count } = await sb
    .from("saved_searches")
    .select("*", { count: "exact", head: true })
    .eq("employer_id", session.sub);

  if ((count ?? 0) >= 10) {
    return NextResponse.json(
      { error: "Maximum of 10 saved searches reached. Delete one to add a new one." },
      { status: 400 },
    );
  }

  const { data: search, error } = await sb
    .from("saved_searches")
    .insert({
      employer_id: session.sub,
      name: name.trim(),
      search_keyword: searchKeyword ?? null,
      filters: JSON.stringify(filters ?? {}),
      alert_enabled: alertEnabled !== false,
      alert_frequency: alertFrequency ?? "instant",
    })
    .select()
    .single();
  if (error || !search) {
    console.error(error);
    return NextResponse.json({ error: "Could not create" }, { status: 500 });
  }

  return NextResponse.json({ savedSearch: search }, { status: 201 });
}
