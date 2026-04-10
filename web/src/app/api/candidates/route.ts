import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { parseStringArray } from "@/lib/json-fields";
import { requireSession } from "@/lib/auth-user";
import { mapUserRow, mapEmployeeProfileRow } from "@/lib/db/mappers";

const SYNONYMS: Record<string, string[]> = {
  dev: ["developer"],
  developer: ["dev"],
  js: ["javascript"],
  ux: ["ui/ux", "designer"],
  tutor: ["teacher", "instructor", "coach"],
  remote: ["online"],
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function levenshtein(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function tokenMatch(token: string, haystack: string) {
  if (!token) return true;
  if (haystack.includes(token)) return true;
  const parts = haystack.split(/[^a-z0-9+.#-]+/).filter(Boolean);
  for (const p of parts) {
    if (p.startsWith(token)) return true;
    if (token.length >= 4 && levenshtein(token, p) <= 1) return true;
  }
  return false;
}

function extractMulti(searchParams: URLSearchParams, key: string) {
  const csv = (searchParams.get(key) || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const multi = searchParams.getAll(key).map((x) => x.trim()).filter(Boolean);
  return Array.from(new Set([...csv, ...multi]));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = normalize(searchParams.get("q") || "");
  const categories = extractMulti(searchParams, "category");
  const subcategories = extractMulti(searchParams, "subcategory");
  const locations = extractMulti(searchParams, "city");
  const availability = extractMulti(searchParams, "availability");
  const workTypes = extractMulti(searchParams, "workType");
  const educationLevels = extractMulti(searchParams, "educationLevel");
  const languages = extractMulti(searchParams, "language");
  const expBucket = searchParams.get("exp") || "";
  const salaryMin = Number(searchParams.get("salaryMin") || "") || null;
  const salaryMax = Number(searchParams.get("salaryMax") || "") || null;
  const includeNegotiable = searchParams.get("includeNegotiable") === "true";
  const sort = searchParams.get("sort") || "newest";

  const sb = getSupabaseAdmin();
  let query = sb
    .from("employee_profiles")
    .select("*, users!inner(*)")
    .eq("published", true)
    .eq("is_profile_public", true)
    .eq("users.is_suspended", false);

  if (categories.length) query = query.in("job_category", categories);
  if (subcategories.length) query = query.in("job_subcategory", subcategories);
  if (availability.length) query = query.in("availability", availability);
  if (educationLevels.length) query = query.in("education_level", educationLevels);

  const { data: rawRows, error } = await query;
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  let rowPairs = (rawRows ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const uRaw = row.users as Record<string, unknown>;
    const { users: _u, ...epOnly } = row;
    return {
      ep: mapEmployeeProfileRow(epOnly),
      user: mapUserRow(uRaw),
    };
  });

  const nonRemoteCities = locations.filter((c) => c.toLowerCase() !== "remote");
  if (nonRemoteCities.length) {
    const cityLc = new Set(nonRemoteCities.map((c) => c.toLowerCase()));
    rowPairs = rowPairs.filter((r) => r.user.city && cityLc.has(r.user.city.toLowerCase()));
  }

  const userIds = rowPairs.map((r) => r.ep.userId);
  const publishedReviews = userIds.length
    ? ((
        await sb
          .from("reviews")
          .select("reviewee_id, overall_rating, reviewer_type")
          .in("reviewee_id", userIds)
          .eq("is_published", true)
          .eq("is_flagged", false)
      ).data ?? [])
    : [];
  const reviewStats = new Map<string, { sum: number; count: number; verifiedHireCount: number }>();
  for (const rr of publishedReviews) {
    const rid = rr.reviewee_id as string;
    const cur = reviewStats.get(rid) ?? { sum: 0, count: 0, verifiedHireCount: 0 };
    cur.sum += rr.overall_rating as number;
    cur.count += 1;
    if (rr.reviewer_type === "employer") cur.verifiedHireCount += 1;
    reviewStats.set(rid, cur);
  }

  const idVerificationRows = userIds.length
    ? ((await sb.from("notifications").select("*").in("user_id", userIds).eq("type", "employee_id_verification")).data ??
      [])
    : [];
  const idVerificationSorted = [...idVerificationRows].sort(
    (a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime(),
  );
  const idStatusByUser = new Map<string, string>();
  for (const row of idVerificationSorted) {
    const uid = row.user_id as string;
    if (idStatusByUser.has(uid)) continue;
    try {
      const parsed = JSON.parse(row.body as string) as { status?: string };
      idStatusByUser.set(uid, parsed.status ?? "none");
    } catch {
      idStatusByUser.set(uid, "none");
    }
  }

  let list = rowPairs.map((r) => {
    const { ep, user: u } = r;
    return {
      userId: ep.userId,
      fullName: u.fullName,
      city: u.city,
      jobTitle: ep.jobTitle,
      jobCategory: ep.jobCategory,
      jobSubcategory: ep.jobSubcategory,
      bio: ep.bio,
      educationLevel: ep.educationLevel,
      skills: parseStringArray(ep.skills),
      workTypes: parseStringArray(ep.workTypes),
      languages: parseStringArray(ep.languages).map((lng) =>
        normalize(String((lng as { language?: string }).language ?? lng)),
      ),
      yearsOfExperience: ep.yearsOfExperience,
      availability: ep.availability,
      salaryMin: ep.salaryMin,
      salaryMax: ep.salaryMax,
      salaryNegotiable: ep.salaryNegotiable,
      profilePhotoUrl: u.profilePhotoUrl,
      createdAt: u.createdAt,
      profileViews: ep.profileViews,
      emailVerified: u.isVerified,
      idVerified: idStatusByUser.get(ep.userId) === "approved",
      averageRating:
        (reviewStats.get(ep.userId)?.sum ?? 0) / Math.max(1, reviewStats.get(ep.userId)?.count ?? 1),
      reviewCount: reviewStats.get(ep.userId)?.count ?? 0,
      verifiedHireCount: reviewStats.get(ep.userId)?.verifiedHireCount ?? 0,
    };
  });

  if (q) {
    const queryTokens = q.split(/\s+/).filter(Boolean);
    list = list.filter((c) => {
      const hay = normalize(
        [c.jobTitle, c.jobCategory, c.jobSubcategory, c.bio, c.city, ...c.skills]
          .filter(Boolean)
          .join(" "),
      );
      return queryTokens.every((token) => {
        if (tokenMatch(token, hay)) return true;
        const alt = SYNONYMS[token] ?? [];
        return alt.some((syn) => tokenMatch(normalize(syn), hay));
      });
    });
  }
  if (workTypes.length) {
    list = list.filter((c) => workTypes.some((wt) => c.workTypes.includes(wt)));
  }
  if (locations.some((x) => x.toLowerCase() === "remote")) {
    list = list.filter(
      (c) =>
        c.workTypes.includes("Remote") ||
        normalize(c.city || "") === "remote" ||
        normalize(c.availability || "").includes("remote"),
    );
  }
  if (languages.length) {
    const langSet = languages.map((l) => normalize(l));
    list = list.filter((c) => c.languages.some((l) => langSet.includes(l)));
  }

  if (expBucket) {
    list = list.filter((c) => {
      const y = c.yearsOfExperience;
      if (expBucket === "0-1") return y <= 1;
      if (expBucket === "1-3") return y >= 1 && y <= 3;
      if (expBucket === "3-5") return y >= 3 && y <= 5;
      if (expBucket === "5-10") return y >= 5 && y <= 10;
      if (expBucket === "10+") return y >= 10;
      return true;
    });
  }

  if (salaryMin != null) {
    list = list.filter((c) => (c.salaryMax ?? c.salaryMin ?? 0) >= salaryMin);
  }
  if (salaryMax != null) {
    list = list.filter((c) => (c.salaryMin ?? c.salaryMax ?? 0) <= salaryMax);
  }
  if (!includeNegotiable && salaryMin != null && salaryMax != null) {
    list = list.filter((c) => !c.salaryNegotiable);
  } else if (includeNegotiable && (salaryMin != null || salaryMax != null)) {
    list = list.filter((c) => c.salaryNegotiable || c.salaryMin != null || c.salaryMax != null);
  }

  const facets = {
    categories: new Map<string, number>(),
    subcategories: new Map<string, number>(),
    cities: new Map<string, number>(),
  };
  for (const c of list) {
    if (c.jobCategory) {
      facets.categories.set(c.jobCategory, (facets.categories.get(c.jobCategory) || 0) + 1);
    }
    if (c.jobSubcategory) {
      facets.subcategories.set(
        c.jobSubcategory,
        (facets.subcategories.get(c.jobSubcategory) || 0) + 1,
      );
    }
    if (c.city) {
      facets.cities.set(c.city, (facets.cities.get(c.city) || 0) + 1);
    }
  }

  if (sort === "salary_low") {
    list.sort((a, b) => (a.salaryMin ?? 0) - (b.salaryMin ?? 0));
  } else if (sort === "salary_high") {
    list.sort((a, b) => (b.salaryMax ?? b.salaryMin ?? 0) - (a.salaryMax ?? a.salaryMin ?? 0));
  } else if (sort === "views") {
    list.sort((a, b) => b.profileViews - a.profileViews);
  } else if (sort === "exp") {
    list.sort((a, b) => b.yearsOfExperience - a.yearsOfExperience);
  } else {
    list.sort((a, b) => {
      const aScore = a.createdAt.getTime() * (a.idVerified ? 1.2 : 1);
      const bScore = b.createdAt.getTime() * (b.idVerified ? 1.2 : 1);
      return bScore - aScore;
    });
  }

  const session = await requireSession();
  if (session?.role === "employer" && list.length) {
    const limited = list.slice(0, 50);
    try {
      await sb.from("profile_search_appearances").insert(
        limited.map((c) => ({
          employee_id: c.userId,
          search_query: q || null,
        })),
      );
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({
    candidates: list,
    total: list.length,
    facets: {
      categories: Array.from(facets.categories.entries()).map(([value, count]) => ({ value, count })),
      subcategories: Array.from(facets.subcategories.entries()).map(([value, count]) => ({ value, count })),
      cities: Array.from(facets.cities.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
    },
  });
}
