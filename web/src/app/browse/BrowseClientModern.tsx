"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppChrome } from "@/components/app/TopNav";
import { avatarGradientForName, initialFromName } from "@/lib/avatar-style";
import { CITIES, JOB_CATEGORIES } from "@/lib/constants";

type Candidate = {
  userId: string;
  fullName: string;
  city: string | null;
  jobTitle: string | null;
  skills: string[];
  availability: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNegotiable?: boolean;
};

type TeamRow = {
  id: string;
  teamName: string;
  tagline: string | null;
  skills: string[];
  memberCount: number;
  memberPreview: { fullName: string; initial: string }[];
};

type Suggestion = { type: "Job title" | "Skill" | "City"; value: string };

export default function BrowseClientModern() {
  const sp = useSearchParams();
  const tabParam = sp.get("tab");
  const tab = tabParam === "teams" ? "teams" : "individuals";
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [category, setCategory] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [workTypeFilter, setWorkTypeFilter] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState(300);
  const [salaryMax, setSalaryMax] = useState(1200);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [savedCandidateIds, setSavedCandidateIds] = useState<string[]>([]);
  const [sort, setSort] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [saveAlertFreq, setSaveAlertFreq] = useState("instant");
  const [saveAlertEnabled, setSaveAlertEnabled] = useState(true);
  const [savingSearch, setSavingSearch] = useState(false);
  const [searchSavedToast, setSearchSavedToast] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 280);
    return () => clearTimeout(t);
  }, [q]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    category.forEach((x) => p.append("category", x));
    cityFilter.forEach((x) => p.append("city", x));
    workTypeFilter.forEach((x) => p.append("workType", x));
    p.set("salaryMin", String(salaryMin));
    p.set("salaryMax", String(salaryMax));
    p.set("sort", sort || "relevance");
    return p.toString();
  }, [debouncedQ, category, cityFilter, workTypeFilter, salaryMin, salaryMax, sort]);

  useEffect(() => {
    if (q.trim().length < 2 || !focused) return;
    (async () => {
      const r = await fetch(`/api/candidates/suggestions?q=${encodeURIComponent(q.trim())}`);
      if (!r.ok) return;
      const j = await r.json().catch(() => null);
      setSuggestions(j?.suggestions ?? []);
    })();
  }, [q, focused]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (tab === "teams") {
        const r = await fetch(`/api/teams?q=${encodeURIComponent(debouncedQ)}`);
        const j = await r.json().catch(() => null);
        setTeams(j?.teams ?? []);
      } else {
        const r = await fetch(`/api/candidates?${query}`);
        const j = await r.json().catch(() => null);
        setCandidates(j?.candidates ?? []);
      }
      setLoading(false);
    })();
  }, [tab, query, debouncedQ]);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/saved");
      const j = await r.json().catch(() => ({}));
      setSavedCandidateIds((j.saved ?? []).map((s: { employeeId: string }) => s.employeeId));
    })();
  }, []);

  function toggleCategory(c: string) {
    setCategory((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function clearAll() {
    setCategory([]);
    setCityFilter([]);
    setWorkTypeFilter([]);
    setSalaryMin(300);
    setSalaryMax(1200);
    setQ("");
  }

  async function toggleSavedCandidate(userId: string) {
    const isSaved = savedCandidateIds.includes(userId);
    if (isSaved) {
      setSavedCandidateIds((prev) => prev.filter((x) => x !== userId));
      await fetch(`/api/saved/${userId}`, { method: "DELETE" }).catch(() => {});
    } else {
      setSavedCandidateIds((prev) => [...prev, userId]);
      await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: userId }),
      }).catch(() => {});
    }
  }

  function toggle<T extends string>(list: T[], value: T, setter: (v: T[]) => void) {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  const groupedSuggestions = useMemo(() => {
    const map: Record<string, Suggestion[]> = { "Job title": [], Skill: [], City: [] };
    for (const s of suggestions) map[s.type]?.push(s);
    return map;
  }, [suggestions]);

  const hasActiveFilters = debouncedQ.length > 0 || category.length > 0 || cityFilter.length > 0 || workTypeFilter.length > 0;

  async function handleSaveSearch() {
    if (!saveSearchName.trim()) return;
    setSavingSearch(true);
    try {
      const r = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveSearchName.trim(),
          searchKeyword: debouncedQ || null,
          filters: { category, city: cityFilter, workType: workTypeFilter, salaryMin, salaryMax, sort },
          alertEnabled: saveAlertEnabled,
          alertFrequency: saveAlertFreq,
        }),
      });
      if (r.ok) {
        setShowSaveModal(false);
        setSaveSearchName("");
        setSearchSavedToast(true);
        setTimeout(() => setSearchSavedToast(false), 4000);
      }
    } finally {
      setSavingSearch(false);
    }
  }

  const activeTags = [
    ...category.map((x) => ({ key: `cat-${x}`, label: x, remove: () => setCategory(category.filter((c) => c !== x)) })),
    ...cityFilter.map((x) => ({ key: `city-${x}`, label: x, remove: () => setCityFilter(cityFilter.filter((c) => c !== x)) })),
    ...workTypeFilter.map((x) => ({ key: `work-${x}`, label: x, remove: () => setWorkTypeFilter(workTypeFilter.filter((c) => c !== x)) })),
  ];

  return (
    <AppChrome>
      <div className="min-h-screen bg-k-page">
        <div className="sticky top-[56px] z-30 rounded-k-card border border-k-border bg-k-surface p-4">
          <div className="relative">
            <input
              className="w-full rounded-[12px] border border-k-border bg-k-surface-elevated px-4 py-2.5 text-sm focus:border-[#4B9EFF80] focus:shadow-[0_0_0_3px_rgba(75,158,255,0.1)]"
              placeholder="Search candidates, skills, city..."
              value={q}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 120)}
              onChange={(e) => setQ(e.target.value)}
            />
            {focused && suggestions.length ? (
              <div className="absolute z-20 mt-1 w-full rounded-k-btn border border-k-border bg-k-surface p-2">
                {(["Job title", "Skill", "City"] as const).map((group) =>
                  groupedSuggestions[group].length ? (
                    <div key={group} className="mb-2 last:mb-0">
                      <p className="px-2 pb-1 text-[10px] uppercase tracking-widest text-k-text-muted">{group}</p>
                      {groupedSuggestions[group].map((s, idx) => {
                        const low = s.value.toLowerCase();
                        const qLow = q.toLowerCase();
                        const pos = low.indexOf(qLow);
                        return (
                          <button
                            key={`${s.type}-${idx}`}
                            type="button"
                            className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-k-surface-elevated"
                            onMouseDown={() => setQ(s.value)}
                          >
                            {pos >= 0 ? (
                              <>
                                {s.value.slice(0, pos)}
                                <span className="text-k-primary">{s.value.slice(pos, pos + q.length)}</span>
                                {s.value.slice(pos + q.length)}
                              </>
                            ) : (
                              s.value
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : null,
                )}
              </div>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/browse" className={`rounded-full border px-3 py-1.5 text-sm ${tab === "individuals" ? "border-k-border-hover bg-[#4B9EFF26] text-k-primary" : "border-k-border bg-k-surface-elevated text-k-text-muted"}`}>Individuals</Link>
            <Link href="/browse?tab=teams" className={`rounded-full border px-3 py-1.5 text-sm ${tab === "teams" ? "border-k-border-hover bg-[#4B9EFF26] text-k-primary" : "border-k-border bg-k-surface-elevated text-k-text-muted"}`}>Teams</Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeTags.map((x) => (
              <button key={x.key} type="button" onClick={x.remove} className="rounded-full border border-[#4B9EFF33] bg-[#4B9EFF1A] px-2 py-1 text-xs text-k-primary transition-all duration-150">
                {x.label} ×
              </button>
            ))}
          </div>
        </div>

        {hasActiveFilters && tab === "individuals" && (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setSaveSearchName(debouncedQ || ""); setShowSaveModal(true); }}
              className="inline-flex items-center gap-1.5 rounded-k-btn border border-k-border bg-k-surface-elevated px-3 py-1.5 text-xs font-medium text-white/70 hover:border-[#4B9EFF40] hover:text-[#4B9EFF]"
            >
              <span>🔖</span> {t("savedSearches.saveThisSearch")}
            </button>
          </div>
        )}

        {searchSavedToast && (
          <div className="mt-2 rounded-k-btn border border-[#1D9E7540] bg-[#1D9E750F] px-4 py-2 text-sm text-[#1D9E75]">
            {t("savedSearches.searchSaved")}
          </div>
        )}

        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowSaveModal(false)}>
            <div className="w-full max-w-md rounded-[16px] border border-k-border bg-k-surface p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-k-text">{t("savedSearches.saveThisSearch")}</h3>
              <div className="mt-4">
                <label className="text-xs text-k-text-muted">{t("savedSearches.nameSearch")}</label>
                <input
                  className="mt-1 w-full rounded-k-btn border border-k-border bg-k-surface-elevated px-3 py-2 text-sm text-k-text"
                  value={saveSearchName}
                  onChange={(e) => setSaveSearchName(e.target.value)}
                  placeholder={debouncedQ || "My search"}
                />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <label className="text-sm text-white/70">{t("savedSearches.alertMe")}</label>
                <button
                  type="button"
                  onClick={() => setSaveAlertEnabled(!saveAlertEnabled)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${saveAlertEnabled ? "bg-[#4B9EFF]" : "bg-k-surface-elevated"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${saveAlertEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
              {saveAlertEnabled && (
                <div className="mt-3 flex gap-2">
                  {(["instant", "daily", "weekly"] as const).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setSaveAlertFreq(freq)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${saveAlertFreq === freq ? "bg-[#4B9EFF] text-white" : "border border-k-border bg-k-surface-elevated text-k-text-secondary"}`}
                    >
                      {t(`savedSearches.${freq === "instant" ? "instantly" : freq === "daily" ? "dailyDigest" : "weeklyDigest"}`)}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setShowSaveModal(false)} className="rounded-k-btn border border-k-border px-4 py-2 text-sm text-k-text-secondary">
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSaveSearch}
                  disabled={savingSearch || !saveSearchName.trim()}
                  className="rounded-k-btn bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {t("common.save")}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-3 lg:grid-cols-[185px_1fr]">
          <aside className="rounded-k-card border-r border-k-border bg-k-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-k-text">Filters</h2>
              <button type="button" className="text-xs text-k-primary" onClick={clearAll}>Clear all</button>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-k-text-muted">Categories</p>
            {JOB_CATEGORIES.slice(0, 9).map((c) => (
              <label key={c} className="mt-1 flex items-center gap-2 text-xs text-k-text-secondary">
                <input type="checkbox" className="h-3.5 w-3.5 rounded bg-k-page accent-k-primary" checked={category.includes(c)} onChange={() => toggleCategory(c)} />
                {c}
              </label>
            ))}
            <p className="mt-4 text-[10px] uppercase tracking-widest text-k-text-muted">City</p>
            {CITIES.slice(0, 8).map((c) => (
              <label key={c} className="mt-1 flex items-center gap-2 text-xs text-k-text-secondary">
                <input type="checkbox" className="h-3.5 w-3.5 rounded bg-k-page accent-k-primary" checked={cityFilter.includes(c)} onChange={() => toggle(cityFilter, c, setCityFilter)} />
                {c}
              </label>
            ))}
            <p className="mt-4 text-[10px] uppercase tracking-widest text-k-text-muted">Work Type</p>
            {["Full-time", "Part-time", "Remote", "Freelance"].map((w) => (
              <label key={w} className="mt-1 flex items-center gap-2 text-xs text-k-text-secondary">
                <input type="checkbox" className="h-3.5 w-3.5 rounded bg-k-page accent-k-primary" checked={workTypeFilter.includes(w)} onChange={() => toggle(workTypeFilter, w, setWorkTypeFilter)} />
                {w}
              </label>
            ))}
            <p className="mt-4 text-[10px] uppercase tracking-widest text-k-text-muted">Salary</p>
            <div className="mt-2">
              <div className="relative">
                <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-k-surface-elevated" />
                <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-linear-to-r from-[#4B9EFF] to-[#A78BFA]" style={{ left: `${(salaryMin / 1200) * 100}%`, right: `${100 - (salaryMax / 1200) * 100}%` }} />
                <input type="range" min={0} max={1200} value={salaryMin} onChange={(e) => setSalaryMin(Math.min(Number(e.target.value), salaryMax))} className="relative w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#4B9EFF] [&::-webkit-slider-thumb]:bg-k-page" />
                <input type="range" min={0} max={1200} value={salaryMax} onChange={(e) => setSalaryMax(Math.max(Number(e.target.value), salaryMin))} className="relative -mt-4 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#4B9EFF] [&::-webkit-slider-thumb]:bg-k-page" />
              </div>
              <p className="mt-1 text-[11px] text-k-text-secondary">${salaryMin} - ${salaryMax}</p>
            </div>
          </aside>

          <div>
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-56 overflow-hidden rounded-k-card border border-k-border bg-k-surface">
                    <div className="h-full w-full animate-pulse bg-linear-to-r from-white/3 via-white/8 to-white/3" />
                  </div>
                ))}
              </div>
            ) : tab === "teams" ? (
              teams.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {teams.map((team) => (
                    <div key={team.id} className="rounded-k-card border border-[#4B9EFF26] bg-[#4B9EFF0A] p-4">
                      <span className="rounded-md bg-linear-to-r from-[#4B9EFF26] to-[#8B5CF626] px-2 py-1 text-[11px] font-bold uppercase text-k-primary">TEAM</span>
                      <div className="mt-3 flex items-start gap-3">
                        <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px] bg-[#4B9EFF26] text-sm font-bold text-k-primary">{initialFromName(team.teamName)}</div>
                        <div>
                          <p className="text-sm font-bold text-k-text">{team.teamName}</p>
                          <p className="text-xs text-k-text-muted">{team.tagline || "Team profile"}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex -space-x-2">
                        {(team.memberPreview?.length ? team.memberPreview : [{ fullName: "Member", initial: "·" }]).slice(0, 4).map((m, idx) => (
                          <span key={`${m.fullName}-${idx}`} className="flex h-6 w-6 items-center justify-center rounded-full border border-[#0A0F1E] bg-k-surface-elevated text-[10px] text-k-text-secondary">{m.initial}</span>
                        ))}
                      </div>
                      <Link href={`/teams/${team.id}`} className="mt-3 inline-block rounded-k-btn border border-[#4B9EFF4D] px-3 py-1.5 text-xs font-semibold text-k-primary">View Team</Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-k-card border border-k-border bg-k-surface p-10 text-center">
                  <p className="text-base font-semibold text-k-text">No teams match your search.</p>
                  <button type="button" onClick={clearAll} className="k-gradient-primary mt-4 rounded-k-btn px-4 py-2 text-sm font-bold text-white">Clear all filters</button>
                </div>
              )
            ) : candidates.length ? (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-k-text-muted">
                    {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} found
                  </p>
                  <select
                    className="rounded-full border border-k-border bg-k-surface-elevated px-3 py-1.5 text-xs text-k-text-secondary"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="">Relevance</option>
                    <option value="newest">Newest first</option>
                    <option value="salary_high">Salary: High to Low</option>
                    <option value="salary_low">Salary: Low to High</option>
                    <option value="exp">Most experienced</option>
                    <option value="views">Most viewed</option>
                  </select>
                </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {candidates.map((c) => {
                  const saved = savedCandidateIds.includes(c.userId);
                  const avatar = avatarGradientForName(c.fullName || "U");
                  return (
                    <div key={c.userId} className="rounded-k-card border border-k-border bg-k-surface p-4 transition-[border-color] duration-150 hover:border-k-border-hover">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full text-sm font-bold" style={{ background: avatar.from, color: avatar.text }}>{initialFromName(c.fullName || "U")}</div>
                          <div>
                            <p className="text-sm font-bold text-k-text">{c.fullName}</p>
                            <p className="text-xs text-k-text-muted">{c.jobTitle || "Professional"}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => toggleSavedCandidate(c.userId)}>{saved ? <span className="k-gradient-text">★</span> : <span className="text-k-text-muted">☆</span>}</button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {c.skills.slice(0, 4).map((s) => (
                          <span key={s} className="rounded-md border border-k-border bg-k-surface-elevated px-2 py-1 text-[11px] text-k-text-secondary">{s}</span>
                        ))}
                      </div>
                      <p className="k-gradient-text mt-3 text-sm font-bold">
                        {c.salaryNegotiable ? "Negotiable" : `$${c.salaryMin ?? 0} - $${c.salaryMax ?? c.salaryMin ?? 0}`}
                      </p>
                      <Link href={`/candidates/${c.userId}`} className="mt-3 inline-block rounded-k-btn border border-[#4B9EFF4D] px-3 py-1.5 text-xs font-semibold text-k-primary">View profile</Link>
                    </div>
                  );
                })}
              </div>
              </>
            ) : (
              <div className="rounded-k-card border border-k-border bg-k-surface p-10 text-center">
                <p className="text-base font-semibold text-k-text">No candidates match your search</p>
                <button type="button" onClick={clearAll} className="k-gradient-primary mt-4 rounded-k-btn px-4 py-2 text-sm font-bold text-white">Clear all filters</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppChrome>
  );
}
