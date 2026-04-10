import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { parseStringArray } from "@/lib/json-fields";
import { mapUserRow, mapEmployeeProfileRow } from "@/lib/db/mappers";

type Suggestion = {
  type: "Job title" | "Skill" | "City";
  value: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] as Suggestion[] });
  }

  const sb = getSupabaseAdmin();
  const { data: rawRows } = await sb
    .from("employee_profiles")
    .select("*, users!inner(*)")
    .eq("published", true)
    .eq("is_profile_public", true)
    .limit(300);

  const seen = new Set<string>();
  const suggestions: Suggestion[] = [];
  for (const r of rawRows ?? []) {
    const row = r as Record<string, unknown>;
    const uRaw = row.users as Record<string, unknown>;
    const { users: _u, ...epOnly } = row;
    const ep = mapEmployeeProfileRow(epOnly);
    const user = mapUserRow(uRaw);
    const fields: Suggestion[] = [
      { type: "Job title", value: ep.jobTitle || "" },
      { type: "City", value: user.city || "" },
      ...parseStringArray(ep.skills).map((s) => ({ type: "Skill" as const, value: s })),
    ];
    for (const item of fields) {
      const normalized = item.value.trim().toLowerCase();
      if (!normalized || !normalized.includes(q)) continue;
      const key = `${item.type}:${normalized}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push(item);
      if (suggestions.length >= 30) break;
    }
    if (suggestions.length >= 30) break;
  }

  return NextResponse.json({
    suggestions: suggestions.sort((a, b) => a.type.localeCompare(b.type)).slice(0, 15),
  });
}
