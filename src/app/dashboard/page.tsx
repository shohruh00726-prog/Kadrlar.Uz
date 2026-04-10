"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { useToast } from "@/components/ui/Toast";
import { MockCandidateCard } from "@/components/landing/MockCandidateCard";

type TeamMembership = {
  isLeader: boolean;
  roleInTeam: string | null;
  team: { id: string; teamName: string; teamViews: number; isPublic: boolean };
};

type EmployeeAnalytics = {
  stats: {
    viewsWeek: number;
    prevViewsWeek?: number;
    viewsMonth: number;
    timesSaved: number;
    prevTimesSaved?: number;
    messagesReceived: number;
    prevMessagesReceived?: number;
    searchWeek: number;
    totalViews: number;
  };
  chart: { dailyViews: { date: string; count: number }[] };
  activity: { label: string; timestamp: string | null }[];
  tips: string[];
};

type EmployerAnalytics = {
  stats: {
    candidatesBrowsedToday: number;
    messagesSent: number;
    candidatesSaved: number;
    searchesRun: number;
    weekBrowsed: number;
  };
  activity: {
    dailyBrowse: { date: string; count: number }[];
    summary: string;
  };
  recentCandidates: { userId: string; fullName: string; jobTitle: string; city: string }[];
  savedMini: { employeeId: string; fullName: string; jobTitle: string; status: string }[];
};

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [usdToUzsRate, setUsdToUzsRate] = useState(12500);
  const [usdToUzsRateUpdatedAt, setUsdToUzsRateUpdatedAt] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<EmployeeAnalytics | null>(null);
  const [employerAnalytics, setEmployerAnalytics] = useState<EmployerAnalytics | null>(null);
  const [dismissedTips, setDismissedTips] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem("employee_dashboard_dismissed_tips");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    (async () => {
      const [meRes, settingsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/app-settings"),
      ]);
      const meJson = await meRes.json();
      const settingsJson = await settingsRes.json().catch(() => ({}));
      setMe(meJson.user ?? null);
      const rate = settingsJson?.appSettings?.usdToUzsRate;
      const updatedAt = settingsJson?.appSettings?.usdToUzsRateUpdatedAt ?? null;
      if (rate && Number.isFinite(rate) && rate > 0) setUsdToUzsRate(rate);
      setUsdToUzsRateUpdatedAt(updatedAt);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!me) return;
      const userType = (me as { userType?: string }).userType;
      const r =
        userType === "employee"
          ? await fetch("/api/employee/analytics")
          : await fetch("/api/employer/analytics");
      if (!r.ok) return;
      const j = await r.json();
      if (userType === "employee") setAnalytics(j as EmployeeAnalytics);
      else setEmployerAnalytics(j as EmployerAnalytics);
    })();
  }, [me]);

  async function leaveTeam(teamId: string, teamName: string) {
    if (
      !confirm(
        `Leave ${teamName}? Your individual profile will remain active on Kadrlar.uz.`,
      )
    ) {
      return;
    }
    const r = await fetch(`/api/teams/${teamId}/leave`, { method: "POST" });
    const j = await r.json();
    if (!r.ok) toast(j.error || "Could not leave team", "error");
    else router.refresh();
    void fetch("/api/auth/me")
      .then((x) => x.json())
      .then((x) => setMe(x.user));
  }

  if (me === undefined) {
    return (
      <AppChrome>
        <p className="text-sm text-k-text-muted">Loading…</p>
      </AppChrome>
    );
  }

  if (!me) {
    return (
      <AppChrome>
        <p className="text-sm text-k-text-secondary">We couldn&apos;t load your session. Try logging in again.</p>
        <Link href="/login" className="mt-4 inline-block text-sm text-k-primary">
          Log in →
        </Link>
      </AppChrome>
    );
  }

  if (me.userType === "employer") {
    const company =
      ((me.employerProfile as { companyName?: string } | undefined)?.companyName as string | undefined) ||
      (me.fullName as string) ||
      "there";
    const statusClass = (s: string) => {
      if (s === "Hired") return "bg-[#1D9E7526] text-[#1D9E75]";
      if (s === "Contacted") return "bg-[#A78BFA26] text-[#A78BFA]";
      if (s === "Not a fit") return "bg-k-surface/10 text-k-text-secondary";
      return "bg-[#4B9EFF26] text-[#4B9EFF]";
    };
    const bars = employerAnalytics?.activity.dailyBrowse ?? [];
    const maxBar = Math.max(...bars.map((b) => b.count), 1);

    return (
      <AppChrome>
        <h1 className="text-[28px] font-extrabold text-k-text">Welcome back, {company}.</h1>
        <p className="mt-2 text-sm text-k-text-muted">Ready to find your next hire?</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-k-card border border-k-border bg-k-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Candidates browsed today</p>
            <p className="k-gradient-text mt-2 text-[32px] font-extrabold">{employerAnalytics?.stats.candidatesBrowsedToday ?? 0}</p>
          </div>
          <div className="rounded-k-card border border-k-border bg-k-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Messages sent</p>
            <p className="k-gradient-text mt-2 text-[32px] font-extrabold">{employerAnalytics?.stats.messagesSent ?? 0}</p>
          </div>
          <div className="rounded-k-card border border-k-border bg-k-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Candidates saved</p>
            <p className="k-gradient-text mt-2 text-[32px] font-extrabold">{employerAnalytics?.stats.candidatesSaved ?? 0}</p>
          </div>
          <div className="rounded-k-card border border-k-border bg-k-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Searches run</p>
            <p className="k-gradient-text mt-2 text-[32px] font-extrabold">{employerAnalytics?.stats.searchesRun ?? 0}</p>
          </div>
        </div>

        <div className="mt-6 rounded-k-card border border-k-border bg-k-surface p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <input
              className="flex-1 rounded-k-card border border-k-border bg-k-surface/5 px-5 py-4 text-sm text-k-text placeholder:text-k-text-muted focus:border-[#4B9EFF80] focus:shadow-[0_0_0_3px_rgba(75,158,255,0.15)] focus:outline-none"
              placeholder="Search candidates by role, skill, or city..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = (e.target as HTMLInputElement).value.trim();
                  window.location.href = v ? `/browse?q=${encodeURIComponent(v)}` : "/browse";
                }
              }}
            />
            <Link href="/browse" className="rounded-k-btn bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-4 py-2.5 text-center text-sm font-semibold text-white">
              Browse all candidates
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Developers", "Designers", "Sales", "Marketing", "Support"].map((c) => (
              <Link key={c} href={`/browse?category=${encodeURIComponent(c)}`} className="rounded-full border border-k-border bg-k-surface/5 px-3 py-1 text-xs text-k-text-secondary hover:border-[#4B9EFF66] hover:text-[#4B9EFF]">
                {c}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-k-card border border-k-border bg-k-surface p-4">
          <p className="text-sm font-semibold text-k-text">Recently viewed</p>
          <div className="group relative mt-3">
            <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2">
              {(employerAnalytics?.recentCandidates ?? []).slice(0, 10).map((r) => (
                <Link key={r.userId} href={`/candidates/${r.userId}`} className="w-[180px] shrink-0 rounded-k-card border border-k-border bg-k-surface/5 p-3">
                  <p className="truncate text-sm font-semibold text-k-text">{r.fullName}</p>
                  <p className="truncate text-xs text-k-text-muted">{r.jobTitle}</p>
                  <p className="mt-2 text-[11px] text-k-text-muted">{r.city || "Uzbekistan"}</p>
                </Link>
              ))}
            </div>
            {(employerAnalytics?.recentCandidates ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-k-text-muted">No candidates viewed yet. Start browsing to see them here.</p>
            )}
            <button type="button" onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: "smooth" })} className="absolute left-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/60 px-2 py-1 text-xs text-k-text-secondary group-hover:block">←</button>
            <button type="button" onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: "smooth" })} className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/60 px-2 py-1 text-xs text-k-text-secondary group-hover:block">→</button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-k-card border border-k-border bg-k-surface p-4">
            <p className="text-sm font-semibold text-k-text">Saved candidates</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(employerAnalytics?.savedMini ?? []).slice(0, 4).map((s) => (
                <Link key={s.employeeId} href={`/candidates/${s.employeeId}`} className="rounded-k-btn border border-k-border bg-k-surface/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="truncate text-sm font-medium text-k-text">{s.fullName}</p>
                      <p className="truncate text-xs text-k-text-muted">{s.jobTitle}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${statusClass(s.status)}`}>{s.status}</span>
                  </div>
                </Link>
              ))}
            </div>
            {(employerAnalytics?.savedMini ?? []).length === 0 && (
              <p className="py-4 text-center text-sm text-k-text-muted">No saved candidates yet.</p>
            )}
          </div>
          <div className="rounded-k-card border border-k-border bg-k-surface p-4">
            <p className="text-sm font-semibold text-k-text">Activity summary</p>
            <div className="mt-3 h-36 rounded-k-btn bg-k-page p-3">
              <div className="flex h-full items-end gap-2">
                {bars.map((b) => (
                  <div key={b.date} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <div
                      className="w-full rounded-t-sm bg-linear-to-t from-[#4B9EFF] to-[#8B5CF6]"
                      style={{ height: `${Math.max(10, (b.count / maxBar) * 100)}%` }}
                      title={`${b.date}: ${b.count}`}
                    />
                    <span className="text-[10px] text-k-text-disabled">{new Date(b.date).toLocaleDateString([], { weekday: "short" })}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-sm text-k-text-secondary">
              {employerAnalytics?.activity.summary || "This week you browsed 0 candidates and sent 0 messages."}
            </p>
          </div>
        </div>
      </AppChrome>
    );
  }

  const ep = me.employeeProfile as Record<string, unknown> | null;
  const skills = (ep?.skills as string[]) ?? [];
  const teamRows = (me.teamMemberships as TeamMembership[] | undefined) ?? [];
  const myTeam = teamRows[0];

  function formatRelative(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${diffH} hours ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return "Yesterday";
    return `${diffD} days ago`;
  }

  function greetingPrefix() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }

  function trend(current: number, previous: number) {
    const base = previous <= 0 ? 1 : previous;
    const pct = Math.round(((current - previous) / base) * 100);
    return { up: pct >= 0, pct: Math.abs(pct) };
  }

  function gaugeColor(strength: number) {
    if (strength <= 30) return { stroke: "#EF4444", text: "#EF4444" };
    if (strength <= 60) return { stroke: "#F59E0B", text: "#F59E0B" };
    if (strength <= 85) return { stroke: "#EAB308", text: "#EAB308" };
    return { stroke: "url(#strengthGradient)", text: "transparent" };
  }

  const strength = Number(ep?.profileStrength ?? 0);
  const tipQueue = (analytics?.tips ?? []).filter((t) => !dismissedTips.includes(t));
  const activeTip = tipQueue[0] ?? null;
  const checks = [
    { label: "Photo added", ok: Boolean(me.profilePhotoUrl), href: "/profile/edit" },
    { label: "Bio (100+ chars)", ok: Boolean(ep?.bio && String(ep.bio).length >= 100), href: "/profile/edit" },
    { label: "Salary set", ok: ep?.salaryMin != null && ep?.salaryMax != null, href: "/profile/edit" },
    { label: "Work history", ok: ((ep?.workExperiences as unknown[]) ?? []).length > 0, href: "/profile/edit" },
    { label: "CV uploaded", ok: Boolean(ep?.cvUrl), href: "/profile/edit" },
  ];

  return (
    <AppChrome>
      <h1 className="text-[28px] font-extrabold text-k-text">{greetingPrefix()}, {String(me.fullName || "there")}.</h1>
      <p className="mt-2 text-sm text-k-text-muted">Here&apos;s how your profile is performing today.</p>

      {activeTip ? (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-k-card border border-[#4B9EFF40] bg-[#4B9EFF0F] p-4">
          <div className="flex items-start gap-2">
            <span className="text-[#4B9EFF]">💡</span>
            <p className="text-sm text-k-text-secondary">{activeTip}</p>
          </div>
          <button
            type="button"
            className="text-xs text-k-text-muted hover:text-white"
            onClick={() => {
              const next = [...dismissedTips, activeTip];
              setDismissedTips(next);
              if (typeof window !== "undefined") {
                window.localStorage.setItem("employee_dashboard_dismissed_tips", JSON.stringify(next));
              }
            }}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {analytics ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-k-card border border-k-border bg-k-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Profile views this week</p>
            <p className="k-gradient-text mt-2 text-[32px] font-extrabold">{analytics.stats.viewsWeek}</p>
            <p className={`mt-1 text-xs ${trend(analytics.stats.viewsWeek, analytics.stats.prevViewsWeek ?? 0).up ? "text-[#1D9E75]" : "text-red-400"}`}>
              {trend(analytics.stats.viewsWeek, analytics.stats.prevViewsWeek ?? 0).up ? "▲" : "▼"} {trend(analytics.stats.viewsWeek, analytics.stats.prevViewsWeek ?? 0).pct}% vs last week
            </p>
          </div>
          <div className="rounded-k-card border border-k-border bg-k-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Messages received</p>
            <p className="k-gradient-text mt-2 text-[32px] font-extrabold">{analytics.stats.messagesReceived}</p>
            <p className={`mt-1 text-xs ${trend(analytics.stats.messagesReceived, analytics.stats.prevMessagesReceived ?? 0).up ? "text-[#1D9E75]" : "text-red-400"}`}>
              {trend(analytics.stats.messagesReceived, analytics.stats.prevMessagesReceived ?? 0).up ? "▲" : "▼"} {trend(analytics.stats.messagesReceived, analytics.stats.prevMessagesReceived ?? 0).pct}% vs last week
            </p>
          </div>
          <div className="rounded-k-card border border-k-border bg-k-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Times saved</p>
            <p className="k-gradient-text mt-2 text-[32px] font-extrabold">{analytics.stats.timesSaved}</p>
            <p className={`mt-1 text-xs ${trend(analytics.stats.timesSaved, analytics.stats.prevTimesSaved ?? 0).up ? "text-[#1D9E75]" : "text-red-400"}`}>
              {trend(analytics.stats.timesSaved, analytics.stats.prevTimesSaved ?? 0).up ? "▲" : "▼"} {trend(analytics.stats.timesSaved, analytics.stats.prevTimesSaved ?? 0).pct}% vs last week
            </p>
          </div>
          <div className="rounded-k-card border border-k-border bg-k-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Profile strength %</p>
            <p className="k-gradient-text mt-2 text-[32px] font-extrabold">{strength}%</p>
            <p className="mt-1 text-xs text-[#1D9E75]">▲ Keep improving your visibility</p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-k-card border border-k-border bg-k-surface p-5">
        <div className="grid gap-4 md:grid-cols-[140px_1fr] md:items-center">
          <div className="relative mx-auto h-[120px] w-[120px]">
            <svg viewBox="0 0 120 120" className="h-[120px] w-[120px] -rotate-90">
              <defs>
                <linearGradient id="strengthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4B9EFF" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,0.12)" strokeWidth="10" fill="none" />
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke={gaugeColor(strength).stroke}
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={314}
                strokeDashoffset={314 - (314 * Math.max(0, Math.min(100, strength))) / 100}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-extrabold ${strength >= 86 ? "k-gradient-text" : ""}`} style={strength >= 86 ? undefined : { color: gaugeColor(strength).text }}>
                {strength}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm text-k-text-secondary">
              Your profile is {strength}% complete - you&apos;re appearing in employer searches!
            </p>
            <div className="mt-3 space-y-2">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-sm">
                  <span className="text-k-text-secondary">{c.label}</span>
                  {c.ok ? (
                    <span className="text-[#1D9E75]">✓</span>
                  ) : (
                    <Link href={c.href} className="text-[#4B9EFF] hover:underline">
                      Add now
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {analytics?.chart.dailyViews && analytics.chart.dailyViews.length > 0 ? (
        <div className="mt-6 rounded-k-card border border-k-border bg-k-surface p-5">
          <p className="mb-3 text-sm font-semibold text-k-text">Profile views (last 30 days)</p>
          <div className="h-32 rounded-k-btn bg-k-page p-3">
            <div className="flex h-full items-end gap-1">
              {(() => {
                const days = analytics.chart.dailyViews;
                const maxV = Math.max(...days.map((d) => d.count), 1);
                return days.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <div
                      className="w-full min-w-[3px] rounded-t-sm bg-linear-to-t from-[#4B9EFF] to-[#8B5CF6]"
                      style={{ height: `${Math.max(4, (d.count / maxV) * 100)}%` }}
                      title={`${d.date}: ${d.count} views`}
                    />
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-k-card border border-k-border bg-k-surface p-5">
          <p className="mb-2 text-sm font-semibold text-k-text">Recent activity</p>
          <div className="space-y-2 text-sm">
            {(analytics?.activity ?? []).map((a, idx) => (
              <div key={`${a.label}-${idx}`} className="flex items-start gap-2 rounded-k-btn bg-k-surface/5 px-3 py-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#4B9EFF]" />
                <div>
                  <p className="text-k-text-secondary">{a.label}</p>
                  {a.timestamp ? <p className="text-xs text-k-text-muted">{formatRelative(a.timestamp)}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.12em] text-k-text-muted">How employers see you</p>
          <div className="max-w-sm">
            <MockCandidateCard
              name={me.fullName as string}
              title={(ep?.jobTitle as string) || "Your title"}
              city={(me.city as string) || ""}
              years={(ep?.yearsOfExperience as number) ?? 0}
              salaryMin={(ep?.salaryMin as number) ?? 0}
              salaryMax={(ep?.salaryMax as number) ?? 0}
              salaryNegotiable={Boolean(ep?.salaryNegotiable)}
              skills={skills.length ? skills : ["Add skills"]}
              availabilityLabel={(ep?.availability as string) || "Available"}
              viewProfileLabel="View public profile"
              href={`/candidates/${me.id}`}
              usdToUzsRate={usdToUzsRate}
              rateUpdatedAt={usdToUzsRateUpdatedAt}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Link href="/profile/edit" className="rounded-k-btn bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white">
              Edit profile
            </Link>
            <Link href={`/candidates/${me.id}`} className="rounded-k-btn border border-k-border bg-k-surface/5 px-4 py-2 text-sm text-white/85">
              View public profile
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-k-card border border-k-border bg-k-surface p-5" style={{ borderWidth: "0.5px" }}>
        <p className="k-label">Jamoa · Team</p>
        {myTeam ? (
          <div className="mt-3 space-y-2 text-sm">
            <p className="font-medium text-k-text">{myTeam.team.teamName}</p>
            <p className="text-k-text-muted">
              Role: {myTeam.roleInTeam || "Member"} · Views: {myTeam.team.teamViews}
              {myTeam.team.isPublic ? " · Listed publicly" : " · Draft / not listed"}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {myTeam.isLeader ? (
                <Link
                  href={`/teams/${myTeam.team.id}/manage`}
                  className="rounded-k-btn bg-k-primary px-4 py-2 text-sm text-white"
                >
                  Manage team
                </Link>
              ) : (
                <Link
                  href={`/teams/${myTeam.team.id}`}
                  className="rounded-k-btn border border-k-border bg-k-surface px-4 py-2 text-sm"
                  style={{ borderWidth: "0.5px" }}
                >
                  View team
                </Link>
              )}
              {!myTeam.isLeader ? (
                <button
                  type="button"
                  className="rounded-k-btn border border-k-border px-4 py-2 text-sm text-k-text-secondary"
                  style={{ borderWidth: "0.5px" }}
                  onClick={() => leaveTeam(myTeam.team.id, myTeam.team.teamName)}
                >
                  Leave team
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-k-text-secondary">
              Freelance teams can list as one unit for employers.
            </p>
            <Link
              href="/teams/create"
              className="mt-3 inline-flex rounded-k-btn bg-k-primary px-4 py-2 text-sm text-white"
            >
              Jamoa tuzish · Create a Team
            </Link>
          </div>
        )}
      </div>
    </AppChrome>
  );
}
