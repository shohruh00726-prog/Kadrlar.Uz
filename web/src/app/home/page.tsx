"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppSidebarLayout } from "@/components/app/AppSidebar";
import { useToast } from "@/components/ui/Toast";

type Me = {
  id: string;
  fullName: string;
  userType: "employee" | "employer";
  city?: string | null;
  profilePhotoUrl?: string | null;
  employeeProfile?: {
    profileStrength?: number;
    profileViews?: number;
    jobTitle?: string | null;
    bio?: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    salaryNegotiable?: boolean;
    skills?: string[];
    availability?: string | null;
    yearsOfExperience?: number;
    cvUrl?: string | null;
    workExperiences?: unknown[];
  } | null;
  employerProfile?: {
    companyName?: string | null;
    companyLogoUrl?: string | null;
  } | null;
  teamMemberships?: Array<{
    isLeader: boolean;
    roleInTeam: string | null;
    team: { id: string; teamName: string; teamViews: number; isPublic: boolean };
  }>;
};

type EmployeeAnalytics = {
  stats: {
    viewsWeek: number;
    prevViewsWeek?: number;
    timesSaved: number;
    prevTimesSaved?: number;
    messagesReceived: number;
    prevMessagesReceived?: number;
    searchWeek: number;
    totalViews: number;
  };
  activity: { label: string; timestamp: string | null; color?: string }[];
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

type SavedSearch = {
  id: string;
  name: string;
  searchKeyword: string | null;
  filters: Record<string, unknown>;
  alertEnabled: boolean;
  newMatches: number;
  matchCount: number;
};

type Pipeline = Record<string, { employeeId: string; fullName: string; jobTitle: string; city: string }[]>;

export default function HomeHubPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [employeeAnalytics, setEmployeeAnalytics] = useState<EmployeeAnalytics | null>(null);
  const [employerAnalytics, setEmployerAnalytics] = useState<EmployerAnalytics | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline>({});
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [dismissedTips, setDismissedTips] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(window.localStorage.getItem("k_tips_dismissed") ?? "[]"); } catch { return []; }
  });

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      const j = await r.json().catch(() => ({}));
      const u = (j.user ?? null) as Me | null;
      setMe(u);
      if (!u) return;

      const [notifRes] = await Promise.all([
        fetch("/api/notifications", { credentials: "include" }).then((x) => x.json().catch(() => ({}))),
      ]);
      setUnreadNotifications(Number(notifRes?.unread ?? 0));

      if (u.userType === "employee") {
        const [ea, convRes] = await Promise.all([
          fetch("/api/employee/analytics", { credentials: "include" }).then((x) => x.json().catch(() => ({}))),
          fetch("/api/conversations", { credentials: "include" }).then((x) => x.json().catch(() => ({}))),
        ]);
        setEmployeeAnalytics(ea);
        const conversations = convRes.conversations ?? [];
        setUnreadMessages(conversations.reduce((acc: number, c: { unreadCount?: number }) => acc + (c.unreadCount ?? 0), 0));
      } else {
        const [ea, ss, pl] = await Promise.all([
          fetch("/api/employer/analytics", { credentials: "include" }).then((x) => x.json().catch(() => ({}))),
          fetch("/api/saved-searches", { credentials: "include" }).then((x) => x.json().catch(() => ({}))),
          fetch("/api/candidates/pipeline", { credentials: "include" }).then((x) => x.json().catch(() => ({}))),
        ]);
        setEmployerAnalytics(ea);
        setSavedSearches(ss.savedSearches ?? []);
        setPipeline(pl.pipeline ?? {});
      }
    })();
  }, []);

  if (me === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-k-page">
        <p className="text-sm text-k-text-muted">{t("common.loading")}</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-k-page">
        <p className="text-sm text-k-text-secondary">Sign in to view your dashboard.</p>
        <Link href="/login" className="mt-3 text-sm text-[#4B9EFF]">Go to login</Link>
      </div>
    );
  }

  const isEmployee = me.userType === "employee";
  const displayName = isEmployee ? me.fullName : me.employerProfile?.companyName || me.fullName;
  const myTeam = me.teamMemberships && me.teamMemberships.length > 0 ? me.teamMemberships[0] : undefined;

  if (isEmployee) {
    return (
      <EmployeeHome
        me={me}
        displayName={displayName}
        analytics={employeeAnalytics}
        myTeam={myTeam}
        unreadMessages={unreadMessages}
        unreadNotifications={unreadNotifications}
        dismissedTips={dismissedTips}
        setDismissedTips={setDismissedTips}
        t={t}
        toast={toast}
      />
    );
  }

  return (
    <EmployerHome
      me={me}
      displayName={displayName}
      analytics={employerAnalytics}
      savedSearches={savedSearches}
      pipeline={pipeline}
      unreadMessages={0}
      unreadNotifications={unreadNotifications}
      t={t}
    />
  );
}

/* ─── EMPLOYEE HOME ────────────────────────────────────────────── */

function EmployeeHome({
  me, displayName, analytics, myTeam, unreadMessages, unreadNotifications,
  dismissedTips, setDismissedTips, t, toast,
}: {
  me: Me;
  displayName: string;
  analytics: EmployeeAnalytics | null;
  myTeam?: {
    isLeader: boolean;
    roleInTeam: string | null;
    team: { id: string; teamName: string; teamViews: number; isPublic: boolean };
  };
  unreadMessages: number;
  unreadNotifications: number;
  dismissedTips: string[];
  setDismissedTips: (v: string[]) => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const ep = me.employeeProfile;
  const strength = ep?.profileStrength ?? 0;

  function greetingKey() {
    const h = new Date().getHours();
    if (h < 12) return "employeeHome.goodMorning";
    if (h < 18) return "employeeHome.goodAfternoon";
    return "employeeHome.goodEvening";
  }

  function gaugeColor(s: number) {
    if (s <= 30) return "#EF4444";
    if (s <= 60) return "#F59E0B";
    if (s <= 85) return "#EAB308";
    return "url(#sg)";
  }

  const checks = [
    { label: "Photo added", ok: Boolean(me.profilePhotoUrl), pct: 10 },
    { label: "Bio (100+ chars)", ok: Boolean(ep?.bio && ep.bio.length >= 100), pct: 15 },
    { label: "Salary set", ok: ep?.salaryMin != null, pct: 10 },
    { label: "Work history", ok: (ep?.workExperiences ?? []).length > 0, pct: 15 },
    { label: "CV uploaded", ok: Boolean(ep?.cvUrl), pct: 10 },
  ];

  const tipQueue = (analytics?.tips ?? []).filter((tip) => !dismissedTips.includes(tip));
  const activeTip = tipQueue[0] ?? null;
  const activityDots: Record<string, string> = {
    view: "#4B9EFF", save: "#EF9F27", message: "#1D9E75", search: "#A78BFA",
  };

  return (
    <AppSidebarLayout
      userType="employee"
      displayName={displayName}
      avatarUrl={me.profilePhotoUrl}
      unreadMessages={unreadMessages}
      unreadNotifications={unreadNotifications}
      teamId={myTeam?.team.id}
      hasTeam={!!myTeam}
      userId={me.id}
    >
      {/* Greeting */}
      <h1 className="text-[28px] font-extrabold text-k-text">
        {t(greetingKey())}, {me.fullName.split(" ")[0]}.
      </h1>
      <p className="mt-1 text-sm text-k-text-muted">
        {analytics?.stats.viewsWeek
          ? `Your profile was viewed ${analytics.stats.viewsWeek} times this week.`
          : "Here's how your profile is performing."}
      </p>

      {/* Tip banner */}
      {activeTip && (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-[12px] border border-[#4B9EFF26] bg-[#4B9EFF0A] p-4">
          <div className="flex items-start gap-2">
            <span className="text-[#4B9EFF]">💡</span>
            <p className="text-sm text-k-text-secondary">{activeTip}</p>
          </div>
          <button
            type="button"
            className="text-xs text-k-text-muted hover:text-k-text"
            onClick={() => {
              const next = [...dismissedTips, activeTip];
              setDismissedTips(next);
              localStorage.setItem("k_tips_dismissed", JSON.stringify(next));
            }}
          >✕</button>
        </div>
      )}

      {/* Stats row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("employeeHome.profileViewsWeek")} value={analytics?.stats.viewsWeek ?? 0} />
        <StatCard label={t("employeeHome.timesSaved")} value={analytics?.stats.timesSaved ?? 0} />
        <StatCard label={t("employeeHome.messagesReceived")} value={analytics?.stats.messagesReceived ?? 0} />
        <StatCard label={t("employeeHome.profileStrength")} value={`${strength}%`} />
      </div>

      {/* Profile Strength */}
      <div className="mt-6 rounded-k-card border border-k-border bg-k-surface p-6">
        <div className="grid gap-6 md:grid-cols-[140px_1fr] md:items-center">
          <div className="relative mx-auto h-[140px] w-[140px]">
            <svg viewBox="0 0 140 140" className="h-[140px] w-[140px] -rotate-90">
              <defs>
                <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4B9EFF" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
              <circle cx="70" cy="70" r="58" stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
              <circle
                cx="70" cy="70" r="58"
                stroke={gaugeColor(strength)}
                strokeWidth="10" strokeLinecap="round" fill="none"
                strokeDasharray={364}
                strokeDashoffset={364 - (364 * Math.min(100, strength)) / 100}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl font-extrabold ${strength >= 86 ? "k-gradient-text" : ""}`} style={strength >= 86 ? undefined : { color: gaugeColor(strength) }}>
                {strength}%
              </span>
            </div>
          </div>
          <div>
            <div className="grid gap-2 sm:grid-cols-2">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center justify-between text-sm">
                  <span className={c.ok ? "text-k-text-muted line-through" : "text-k-text-secondary"}>
                    {c.ok && <span className="text-[#1D9E75]">✓ </span>}
                    {c.label}
                  </span>
                  {!c.ok && (
                    <Link href="/profile/edit" className="flex items-center gap-1 text-xs text-[#4B9EFF]">
                      <span className="rounded bg-[#4B9EFF20] px-1.5 py-0.5 text-[10px]">+{c.pct}%</span>
                      Add now
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-k-text-muted">
              {t("employeeHome.profileComplete", { percent: strength })}
            </p>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="mt-6 rounded-k-card border border-k-border bg-k-surface p-5">
        <p className="text-sm font-semibold text-k-text">{t("employeeHome.whatsHappening")}</p>
        <div className="mt-3 space-y-2">
          {(analytics?.activity ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-k-text-muted">{t("employeeHome.noActivity")}</p>
          ) : (
            (analytics?.activity ?? []).slice(0, 10).map((a, idx) => (
              <div key={`${a.label}-${idx}`} className="flex items-start gap-2.5 rounded-[10px] bg-k-surface-elevated px-3 py-2.5">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activityDots[a.color ?? "view"] ?? "#4B9EFF" }} />
                <div>
                  <p className="text-sm text-k-text-secondary">{a.label}</p>
                  {a.timestamp && <p className="text-[11px] text-k-text-disabled">{formatRelative(a.timestamp)}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Profile preview */}
      <div className="mt-6">
        <p className="mb-3 text-xs uppercase tracking-[0.12em] text-k-text-muted">{t("employeeHome.howEmployersSeeYou")}</p>
        <div className="max-w-sm scale-[0.97] rounded-k-card border border-k-border bg-k-surface p-4 opacity-90">
          <div className="flex items-center gap-3">
            {me.profilePhotoUrl ? (
              <Image src={me.profilePhotoUrl} alt="" width={42} height={42} className="h-[42px] w-[42px] rounded-full object-cover" />
            ) : (
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-linear-to-br from-[#4B9EFF] to-[#8B5CF6] text-sm font-bold text-white">
                {me.fullName.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-k-text">{me.fullName}</p>
              <p className="text-xs text-k-text-muted">{ep?.jobTitle || "Your title"}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(ep?.skills ?? ["Add skills"]).slice(0, 4).map((s) => (
              <span key={s} className="rounded-md border border-k-border bg-k-surface-elevated px-2 py-1 text-[11px] text-k-text-secondary">{s}</span>
            ))}
          </div>
          <p className="k-gradient-text mt-3 text-sm font-bold">
            {ep?.salaryNegotiable ? "Negotiable" : `$${ep?.salaryMin ?? 0} - $${ep?.salaryMax ?? 0}`}
          </p>
        </div>
        <div className="mt-3 flex gap-2">
          <Link href="/profile/edit" className="rounded-[10px] bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white">
            {t("common.editProfile")}
          </Link>
          <Link href={`/candidates/${me.id}`} className="rounded-[10px] border border-k-border bg-k-surface-elevated px-4 py-2 text-sm text-k-text-secondary">
            {t("employeeHome.viewPublicProfile")}
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction icon="🕐" label={t("employeeHome.updateAvailability")} onClick={() => window.location.href = "/profile/edit"} />
        <QuickAction icon="✦" label={t("employeeHome.addSkill")} onClick={() => window.location.href = "/profile/edit"} />
        <QuickAction icon="📄" label={t("employeeHome.uploadCV")} onClick={() => window.location.href = "/profile/edit"} />
        <QuickAction icon="🔗" label={t("employeeHome.shareProfile")} onClick={() => {
          navigator.clipboard.writeText(`${window.location.origin}/candidates/${me.id}`);
          toast("Profile link copied!", "success");
        }} />
      </div>

      {/* Team section */}
      <div className="mt-6 rounded-k-card border border-k-border bg-k-surface p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-k-text-muted">{t("employeeHome.myTeam")}</p>
        {myTeam ? (
          <div className="mt-3">
            <p className="text-sm font-semibold text-k-text">{myTeam.team.teamName}</p>
            <p className="mt-1 text-xs text-k-text-muted">
              {myTeam.roleInTeam || "Member"} · {myTeam.team.teamViews} views · {myTeam.team.isPublic ? "Listed" : "Draft"}
            </p>
            <Link
              href={myTeam.isLeader ? `/teams/${myTeam.team.id}/manage` : `/teams/${myTeam.team.id}`}
              className="mt-3 inline-block rounded-[10px] border border-k-border px-4 py-2 text-sm text-k-text-secondary hover:text-k-text"
            >
              {myTeam.isLeader ? "Manage team" : "View team"}
            </Link>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-k-text-muted">Freelance teams can list as one unit for employers.</p>
            <Link href="/teams/create" className="mt-3 inline-block rounded-[10px] bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white">
              {t("employeeHome.createTeam")}
            </Link>
          </div>
        )}
      </div>
    </AppSidebarLayout>
  );
}

/* ─── EMPLOYER HOME ────────────────────────────────────────────── */

function EmployerHome({
  me, displayName, analytics, savedSearches, pipeline, unreadMessages, unreadNotifications, t,
}: {
  me: Me;
  displayName: string;
  analytics: EmployerAnalytics | null;
  savedSearches: SavedSearch[];
  pipeline: Pipeline;
  unreadMessages: number;
  unreadNotifications: number;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const [searchQ, setSearchQ] = useState("");

  function greetingKey() {
    const h = new Date().getHours();
    if (h < 12) return "employeeHome.goodMorning";
    if (h < 18) return "employeeHome.goodAfternoon";
    return "employeeHome.goodEvening";
  }

  const pipelineCols = [
    { key: "interested", label: t("employerHome.interested"), color: "#4B9EFF" },
    { key: "contacted", label: t("employerHome.contacted"), color: "#A78BFA" },
    { key: "hired", label: t("employerHome.hired"), color: "#1D9E75" },
    { key: "not_a_fit", label: t("employerHome.notAFit"), color: "rgba(255,255,255,0.3)" },
  ];

  const bars = analytics?.activity?.dailyBrowse ?? [];
  const maxBar = Math.max(...bars.map((b) => b.count), 1);

  return (
    <AppSidebarLayout
      userType="employer"
      displayName={displayName}
      avatarUrl={me.employerProfile?.companyLogoUrl}
      unreadMessages={unreadMessages}
      unreadNotifications={unreadNotifications}
      userId={me.id}
    >
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold text-k-text">
            {t(greetingKey())}, {displayName}.
          </h1>
          <p className="mt-1 text-sm text-k-text-muted">{t("employerHome.readyToHire")}</p>
        </div>
        <Link href="/browse" className="shrink-0 rounded-[10px] bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-4 py-2.5 text-sm font-semibold text-white">
          {t("employerHome.browseAll")}
        </Link>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("employerHome.candidatesBrowsed")} value={analytics?.stats.candidatesBrowsedToday ?? 0} />
        <StatCard label={t("employerHome.messagesSent")} value={analytics?.stats.messagesSent ?? 0} />
        <StatCard label={t("employerHome.candidatesSaved")} value={analytics?.stats.candidatesSaved ?? 0} />
        <StatCard label={t("employerHome.activeSavedSearches")} value={savedSearches.length} />
      </div>

      {/* Hero search bar */}
      <div className="mt-6 rounded-[16px] border border-k-border bg-k-surface p-5">
        <div className="flex gap-3">
          <input
            className="flex-1 rounded-[12px] border border-k-border bg-k-surface-elevated px-5 py-4 text-sm text-k-text placeholder:text-k-text-disabled focus:border-[#4B9EFF80] focus:shadow-[0_0_0_3px_rgba(75,158,255,0.15)] focus:outline-none"
            placeholder={t("employerHome.searchPlaceholder")}
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                window.location.href = searchQ.trim() ? `/browse?q=${encodeURIComponent(searchQ.trim())}` : "/browse";
              }
            }}
          />
          <Link
            href={searchQ.trim() ? `/browse?q=${encodeURIComponent(searchQ.trim())}` : "/browse"}
            className="rounded-[12px] bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-6 py-4 text-sm font-semibold text-white"
          >
            {t("common.search")}
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Developers", "Designers", "Sales", "Marketing", "Support", "Engineering"].map((c) => (
            <Link key={c} href={`/browse?category=${encodeURIComponent(c)}`} className="rounded-full border border-k-border bg-k-surface-elevated px-3 py-1 text-xs text-k-text-secondary hover:border-[#4B9EFF40] hover:text-[#4B9EFF]">
              {c}
            </Link>
          ))}
        </div>
      </div>

      {/* Saved Searches / Talent Radars */}
      <div className="mt-6 rounded-k-card border border-k-border bg-k-surface p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-k-text">{t("employerHome.talentRadars")}</p>
          <Link href="/saved-searches" className="text-xs text-k-text-muted hover:text-[#4B9EFF]">See all</Link>
        </div>
        {savedSearches.length === 0 ? (
          <div className="mt-4 py-4 text-center">
            <p className="text-sm text-k-text-muted">{t("savedSearches.noRadars")}</p>
            <Link href="/browse" className="mt-2 inline-block text-sm text-[#4B9EFF]">{t("common.browseCandidates")}</Link>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {savedSearches.slice(0, 4).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-[10px] bg-k-surface-elevated px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-k-text">{s.name}</p>
                  <p className="text-[11px] text-k-text-muted">{s.matchCount} candidates match</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.newMatches > 0 ? (
                    <span className="rounded-full bg-[#4B9EFF] px-2 py-0.5 text-[10px] font-semibold text-white">{s.newMatches} new</span>
                  ) : (
                    <span className="text-[11px] text-k-text-disabled">{t("savedSearches.noNewMatches")}</span>
                  )}
                  <Link href={`/browse?q=${encodeURIComponent(s.searchKeyword ?? "")}`} className="text-xs text-[#4B9EFF]">Run</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recently viewed */}
      <div className="mt-6 rounded-k-card border border-k-border bg-k-surface p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-k-text">{t("employerHome.recentlyViewed")}</p>
          <Link href="/browse" className="text-xs text-k-text-muted hover:text-[#4B9EFF]">See all</Link>
        </div>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {(analytics?.recentCandidates ?? []).length === 0 ? (
            <p className="w-full py-4 text-center text-sm text-k-text-muted">No candidates viewed yet. Start browsing.</p>
          ) : (
            (analytics?.recentCandidates ?? []).slice(0, 10).map((r) => (
              <Link key={r.userId} href={`/candidates/${r.userId}`} className="w-[160px] shrink-0 rounded-[10px] border border-k-border bg-k-surface-elevated p-3 hover:border-k-border">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-[#4B9EFF] to-[#8B5CF6] text-xs font-bold text-white">
                  {r.fullName.charAt(0)}
                </div>
                <p className="mt-2 truncate text-sm font-medium text-k-text">{r.fullName}</p>
                <p className="truncate text-[11px] text-k-text-muted">{r.jobTitle}</p>
                <p className="mt-1 text-[10px] text-k-text-disabled">{r.city || "Uzbekistan"}</p>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Pipeline (Kanban) */}
      <div className="mt-6 rounded-k-card border border-k-border bg-k-surface p-5">
        <p className="text-sm font-semibold text-k-text">{t("employerHome.yourPipeline")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pipelineCols.map((col) => {
            const items = pipeline[col.key] ?? [];
            return (
              <div key={col.key} className="rounded-[10px] border border-k-border bg-k-surface-elevated p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                  <p className="text-xs font-semibold text-k-text-secondary">{col.label}</p>
                  <span className="ml-auto rounded-full bg-k-surface-elevated px-1.5 py-0.5 text-[10px] text-k-text-muted">{items.length}</span>
                </div>
                <div className="mt-2 max-h-[200px] space-y-1.5 overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="rounded-[8px] border border-dashed border-k-border py-4 text-center text-[11px] text-k-text-disabled">
                      No candidates here yet
                    </div>
                  ) : (
                    items.map((c) => (
                      <Link key={c.employeeId} href={`/candidates/${c.employeeId}`} className="block rounded-[8px] bg-k-surface-elevated px-2.5 py-2 hover:bg-k-surface-elevated">
                        <p className="truncate text-xs font-medium text-k-text">{c.fullName}</p>
                        <p className="truncate text-[10px] text-k-text-muted">{c.jobTitle}</p>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity summary */}
      <div className="mt-6 rounded-k-card border border-k-border bg-k-surface p-5">
        <p className="text-sm font-semibold text-k-text">{t("employerHome.thisWeek")}</p>
        {bars.length > 0 && (
          <div className="mt-3 h-32 rounded-[10px] bg-k-page p-3">
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
        )}
        <p className="mt-3 text-sm text-k-text-muted">
          {analytics?.activity?.summary || "Start browsing candidates to see your weekly activity."}
        </p>
      </div>
    </AppSidebarLayout>
  );
}

/* ─── SHARED COMPONENTS ────────────────────────────────────────── */

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-k-card border border-k-border bg-k-surface p-5 transition-[border-color] hover:border-[#4B9EFF33]">
      <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">{label}</p>
      <p className="k-gradient-text mt-2 text-[32px] font-extrabold">{value}</p>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-[10px] border border-k-border bg-k-surface-elevated px-3 py-3 text-left text-xs text-k-text-secondary transition-colors hover:border-[#4B9EFF40] hover:text-k-text-secondary"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h} hours ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
}
