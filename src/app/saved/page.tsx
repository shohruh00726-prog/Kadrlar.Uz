"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { MockCandidateCard } from "@/components/landing/MockCandidateCard";
import { MockTeamCard } from "@/components/landing/MockTeamCard";
import { PageSkeleton } from "@/components/ui/Skeleton";

type SavedCand = {
  employeeId: string;
  fullName: string;
  jobTitle?: string | null;
  jobCategory?: string | null;
  city?: string | null;
  skills: string[];
  status: string;
  savedAt: string;
  notes?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryNegotiable?: boolean;
};

type SavedTeamRow = {
  teamId: string;
  teamName: string;
  tagline: string | null;
  city: string | null;
  category: string | null;
  memberCount: number;
  skills: string[];
  priceMin: number | null;
  priceMax: number | null;
  priceNegotiable: boolean;
};

export default function SavedPage() {
  const [allRows, setAllRows] = useState<SavedCand[]>([]);
  const [teams, setTeams] = useState<SavedTeamRow[]>([]);
  const [tab, setTab] = useState<"people" | "teams">("people");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [usdToUzsRate, setUsdToUzsRate] = useState(12500);
  const [usdToUzsRateUpdatedAt, setUsdToUzsRateUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [cRes, tRes] = await Promise.all([fetch("/api/saved"), fetch("/api/saved-teams")]);
      const cj = await cRes.json();
      const tj = await tRes.json();
      if (cRes.ok) {
        setAllRows(cj.saved ?? []);
      }
      if (tRes.ok) setTeams(tj.saved ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/app-settings");
      const j = await r.json().catch(() => ({}));
      const rate = j?.appSettings?.usdToUzsRate;
      const updatedAt = j?.appSettings?.usdToUzsRateUpdatedAt ?? null;
      if (rate && Number.isFinite(rate) && rate > 0) setUsdToUzsRate(rate);
      setUsdToUzsRateUpdatedAt(updatedAt);
    })();
  }, []);

  const filteredRows = useMemo(() => {
    let next = [...allRows];
    if (status) next = next.filter((x) => x.status === status);
    if (category) next = next.filter((x) => x.jobCategory === category);
    return next;
  }, [allRows, status, category]);

  async function setSavedStatus(employeeId: string, value: string) {
    await fetch(`/api/saved/${employeeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    setAllRows((prev) => prev.map((x) => (x.employeeId === employeeId ? { ...x, status: value } : x)));
  }

  async function unsaveCandidate(employeeId: string) {
    const r = await fetch(`/api/saved/${employeeId}`, { method: "DELETE" });
    if (r.ok) setAllRows((prev) => prev.filter((x) => x.employeeId !== employeeId));
  }

  return (
    <AppChrome>
      <h1 className="k-h1">Saved</h1>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={`rounded-full px-3 py-1.5 text-sm ${tab === "people" ? "bg-k-primary text-white" : "border border-k-border bg-k-surface"}`}
          style={{ borderWidth: tab === "people" ? undefined : "0.5px" }}
          onClick={() => setTab("people")}
        >
          Individuals
        </button>
        <button
          type="button"
          className={`rounded-full px-3 py-1.5 text-sm ${tab === "teams" ? "bg-k-primary text-white" : "border border-k-border bg-k-surface"}`}
          style={{ borderWidth: tab === "teams" ? undefined : "0.5px" }}
          onClick={() => setTab("teams")}
        >
          Teams
        </button>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : tab === "people" ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <select className="rounded-k-btn border border-k-border bg-k-surface px-2 py-1 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {["Interested", "Contacted", "Hired", "Not a fit"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <select className="rounded-k-btn border border-k-border bg-k-surface px-2 py-1 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {Array.from(new Set(allRows.map((x) => x.jobCategory).filter(Boolean))).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <button type="button" onClick={() => { window.location.href = "/api/saved?export=csv"; }} className="rounded-k-btn border border-k-border px-2 py-1 text-sm text-k-primary">
              Export CSV
            </button>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRows.map((c) => (
              <div key={c.employeeId} className="space-y-2">
                <MockCandidateCard
                  name={c.fullName}
                  title={c.jobTitle || "Professional"}
                  city={c.city || ""}
                  years={0}
                  salaryMin={c.salaryMin ?? 0}
                  salaryMax={c.salaryMax ?? 0}
                  salaryNegotiable={c.salaryNegotiable ?? false}
                  skills={c.skills}
                  availabilityLabel="Saved"
                  viewProfileLabel="View profile"
                  href={`/candidates/${c.employeeId}`}
                  usdToUzsRate={usdToUzsRate}
                  rateUpdatedAt={usdToUzsRateUpdatedAt}
                />
                <div className="rounded-k-btn border border-k-border bg-k-surface p-2 text-sm" style={{ borderWidth: "0.5px" }}>
                  <select value={c.status || "Interested"} onChange={(e) => setSavedStatus(c.employeeId, e.target.value)} className="w-full rounded border border-k-border bg-k-page px-2 py-1 text-xs">
                    {["Interested", "Contacted", "Hired", "Not a fit"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => unsaveCandidate(c.employeeId)} className="mt-1 text-xs text-red-400 hover:text-red-300">
                    Remove
                  </button>
                  <textarea
                    className="mt-1 w-full rounded border border-k-border bg-k-page px-2 py-1 text-xs text-k-text placeholder:text-k-text-muted"
                    placeholder="Add notes..."
                    rows={2}
                    defaultValue={c.notes || ""}
                    onBlur={async (e) => {
                      const val = e.target.value;
                      await fetch(`/api/saved/${c.employeeId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ notes: val }),
                      });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          {filteredRows.length === 0 ? (
            <p className="mt-6 text-sm text-k-text-muted">No saved profiles yet.</p>
          ) : null}
        </>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((t) => (
              <MockTeamCard
                key={t.teamId}
                teamLabel="JAMOA"
                name={t.teamName}
                tagline={t.tagline || ""}
                category={t.category}
                city={t.city}
                members={Array.from({ length: t.memberCount }).map((_, i) => ({
                  fullName: `${i}`,
                  initial: "•",
                }))}
                skills={t.skills}
                priceMin={t.priceMin ?? 0}
                priceMax={t.priceMax ?? 0}
                priceNegotiable={t.priceNegotiable}
                viewTeamLabel="View team"
                membersLabel={`${t.memberCount} members`}
                href={`/teams/${t.teamId}`}
              />
            ))}
          </div>
          {teams.length === 0 ? (
            <p className="mt-6 text-sm text-k-text-muted">No saved teams yet.</p>
          ) : null}
        </>
      )}

      <Link href="/browse" className="mt-6 inline-block text-sm text-k-primary">
        Browse catalog →
      </Link>
    </AppChrome>
  );
}
