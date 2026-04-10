"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppChrome } from "@/components/app/TopNav";

type SavedSearchItem = {
  id: string;
  name: string;
  searchKeyword: string | null;
  filters: Record<string, unknown>;
  alertEnabled: boolean;
  alertFrequency: string;
  lastAlertedAt: string | null;
  matchCount: number;
  newMatches: number;
  createdAt: string;
};

export default function SavedSearchesPage() {
  const { t } = useTranslation();
  const [searches, setSearches] = useState<SavedSearchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/saved-searches")
      .then((r) => r.json().catch(() => ({})))
      .then((j) => {
        if (!cancelled) {
          setSearches(j.savedSearches ?? []);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  async function toggleAlert(id: string, enabled: boolean) {
    await fetch(`/api/saved-searches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertEnabled: enabled }),
    });
    setSearches((prev) => prev.map((s) => (s.id === id ? { ...s, alertEnabled: enabled } : s)));
  }

  async function deleteSearch(id: string) {
    await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
    setSearches((prev) => prev.filter((s) => s.id !== id));
  }

  function buildBrowseUrl(search: SavedSearchItem) {
    const p = new URLSearchParams();
    if (search.searchKeyword) p.set("q", search.searchKeyword);
    const f = search.filters as Record<string, unknown>;
    if (Array.isArray(f.category)) f.category.forEach((c: string) => p.append("category", c));
    if (Array.isArray(f.city)) f.city.forEach((c: string) => p.append("city", c));
    if (Array.isArray(f.workType)) f.workType.forEach((w: string) => p.append("workType", w));
    if (f.salaryMin) p.set("salaryMin", String(f.salaryMin));
    if (f.salaryMax) p.set("salaryMax", String(f.salaryMax));
    return `/browse?${p.toString()}`;
  }

  function filterSummary(search: SavedSearchItem) {
    const parts: string[] = [];
    if (search.searchKeyword) parts.push(search.searchKeyword);
    const f = search.filters as Record<string, unknown>;
    if (Array.isArray(f.category)) parts.push(...f.category);
    if (Array.isArray(f.city)) parts.push(...f.city);
    if (Array.isArray(f.workType)) parts.push(...f.workType);
    if (f.salaryMin || f.salaryMax) parts.push(`$${f.salaryMin ?? 0}-$${f.salaryMax ?? "∞"}`);
    return parts.join(", ") || "All candidates";
  }

  const [now] = useState(() => Date.now());

  const timeAgo = useCallback((iso: string | null) => {
    if (!iso) return t("savedSearches.noNewMatches");
    const diff = now - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  }, [now, t]);

  return (
    <AppChrome>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold text-k-text">{t("savedSearches.title")}</h1>
          <p className="mt-1 text-sm text-k-text-muted">{searches.length}/10 saved searches</p>
        </div>
        <Link href="/browse" className="rounded-k-btn bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white">
          {t("common.browseCandidates")}
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-k-card border border-k-border bg-k-surface" />
          ))}
        </div>
      ) : searches.length === 0 ? (
        <div className="rounded-k-card border border-k-border bg-k-surface p-10 text-center">
          <p className="text-base font-semibold text-k-text">🔖</p>
          <p className="mt-2 text-sm text-k-text-secondary">{t("savedSearches.noRadars")}</p>
          <Link href="/browse" className="mt-4 inline-block rounded-k-btn bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white">
            {t("common.browseCandidates")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {searches.map((s) => (
            <div key={s.id} className="rounded-k-card border border-k-border bg-k-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-k-text">{s.name}</p>
                    {s.newMatches > 0 && (
                      <span className="rounded-full bg-[#4B9EFF] px-2 py-0.5 text-[10px] font-semibold text-white">
                        {t("savedSearches.newMatches", { count: s.newMatches })}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-k-text-muted">{filterSummary(s)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-k-text-muted">
                    <span className="text-[#4B9EFF]">{t("savedSearches.candidatesMatch", { count: s.matchCount })}</span>
                    <span>Last alerted: {timeAgo(s.lastAlertedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAlert(s.id, !s.alertEnabled)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${s.alertEnabled ? "bg-[#4B9EFF]" : "bg-k-surface-elevated"}`}
                    title={s.alertEnabled ? "Alerts on" : "Alerts off"}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${s.alertEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                  <Link href={buildBrowseUrl(s)} className="rounded-k-btn border border-[#4B9EFF40] px-3 py-1.5 text-xs font-medium text-[#4B9EFF]">
                    {t("savedSearches.runSearch")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteSearch(s.id)}
                    className="rounded-k-btn border border-k-border px-2 py-1.5 text-xs text-k-text-muted hover:border-red-500/40 hover:text-red-400"
                    title={t("common.delete")}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppChrome>
  );
}
