"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { avatarGradientForName, initialFromName } from "@/lib/avatar-style";
import { readResponseJson } from "@/lib/read-response-json";
import { routeParam } from "@/lib/route-params";
import { formatRateUpdatedDate, formatUzsRange } from "@/lib/currency";
import { useToast } from "@/components/ui/Toast";

type Member = {
  userId: string;
  fullName: string;
  profilePhotoUrl: string | null;
  roleInTeam: string | null;
  isLeader: boolean;
  jobTitle?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryNegotiable?: boolean;
  skillsTop: string[];
};

type TeamPayload = {
  id: string;
  teamName: string;
  teamLogoUrl: string | null;
  tagline: string | null;
  description: string | null;
  category: string | null;
  skills: string[];
  priceMin: number | null;
  priceMax: number | null;
  priceNegotiable: boolean;
  priceType: string;
  workTypes: string[];
  availability: string | null;
  city: string | null;
  teamViews: number;
  leader: { userId: string; fullName: string; profilePhotoUrl: string | null; jobTitle?: string | null };
  members: Member[];
  projects: { id: string; name: string; description: string | null; url: string | null; imageUrl: string | null }[];
  saved: boolean;
};

export default function TeamPublicPage() {
  const { toast } = useToast();
  const params = useParams();
  const id = routeParam(params.id as string | string[] | undefined);
  const router = useRouter();
  const [team, setTeam] = useState<TeamPayload | null>(null);
  const [me, setMe] = useState<{ id: string; userType: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usdToUzsRate, setUsdToUzsRate] = useState(12500);
  const [usdToUzsRateUpdatedAt, setUsdToUzsRateUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== "string") {
      setLoading(false);
      setErr("Invalid team link.");
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const [r, m] = await Promise.all([
          fetch(`/api/teams/${id}`, { credentials: "include" }),
          fetch("/api/auth/me", { credentials: "include" }),
        ]);
        const j = await readResponseJson(r);
        const mu = await readResponseJson(m);
        const u = mu.user as { id: string; userType: string } | null | undefined;
        setMe(u ? { id: u.id, userType: u.userType } : null);
        if (!r.ok) {
          setErr(String(j.error || `Could not load team (${r.status})`));
          setTeam(null);
          return;
        }
        if (!j.team) {
          setErr("Invalid response from server");
          setTeam(null);
          return;
        }
        setTeam(j.team as TeamPayload);
        setErr(null);
      } catch {
        setErr("Could not load team");
        setTeam(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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

  async function contactTeam() {
    if (!team) return;
    const r = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: team.leader.userId }),
    });
    const j = await readResponseJson(r);
    if (r.ok) router.push(`/messages/${String(j.conversationId)}`);
    else toast(String(j.error || "Could not start chat"), "error");
  }

  async function saveTeam() {
    if (!team) return;
    const r = await fetch("/api/saved-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: team.id }),
    });
    if (r.ok) {
      setTeam({ ...team, saved: true });
    } else {
      const j = await readResponseJson(r);
      toast(String(j.error || "Save failed"), "error");
    }
  }

  if (loading) {
    return (
      <AppChrome>
        <PageSkeleton />
      </AppChrome>
    );
  }

  if (err || !team) {
    return (
      <AppChrome>
        <p className="text-sm text-k-text-muted">{err ?? "Could not load team."}</p>
        <Link href="/browse?tab=teams" className="mt-4 inline-block text-sm text-k-primary">
          ← Back to teams
        </Link>
      </AppChrome>
    );
  }

  const isEmployer = me?.userType === "employer";
  const isLeader = me?.id === team.leader.userId;
  const logoInitial = initialFromName(team.teamName);
  const availColor =
    team.availability === "Available now"
      ? "bg-emerald-100 text-emerald-800"
      : team.availability === "Available in 1 month"
        ? "bg-amber-100 text-amber-900"
        : "bg-slate-100 text-slate-700";

  return (
    <AppChrome>
      <Link href="/browse?tab=teams" className="text-sm text-k-primary hover:underline">
        ← Jamoalar / Teams
      </Link>

      <header className="relative mt-8 overflow-hidden rounded-k-card border border-k-border bg-k-surface p-8 text-center md:p-12">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#4B9EFF14] to-transparent" />
        <div className="absolute left-4 top-4 rounded-full bg-k-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Jamoa · TEAM
        </div>
        {isLeader ? (
          <Link
            href={`/teams/${id}/manage`}
            className="absolute right-4 top-4 text-sm font-medium text-k-primary hover:underline"
          >
            Manage team
          </Link>
        ) : null}

        <div className="relative mx-auto mt-6 flex h-28 w-28 items-center justify-center rounded-k-card border border-k-border bg-k-surface-elevated text-3xl font-semibold text-white shadow-md md:h-32 md:w-32 md:text-4xl" style={{ background: team.teamLogoUrl ? undefined : "linear-gradient(145deg, #185FA5, #3B82C4)" }}>
          {team.teamLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.teamLogoUrl} alt="" className="h-full w-full rounded-xl object-cover" />
          ) : (
            logoInitial
          )}
        </div>
        <h1 className="relative mt-6 text-3xl font-extrabold text-k-text">{team.teamName}</h1>
        {team.tagline ? <p className="relative mt-2 text-lg italic text-k-text-secondary">&ldquo;{team.tagline}&rdquo;</p> : null}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {team.category ? (
            <span className="rounded-full border border-k-primary-mid bg-white/80 px-3 py-1 text-xs font-medium text-k-primary" style={{ borderWidth: "0.5px" }}>
              {team.category}
            </span>
          ) : null}
          {team.city ? (
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-k-text-secondary">
              {team.city}
            </span>
          ) : null}
          {team.availability ? (
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${availColor}`}>{team.availability}</span>
          ) : null}
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-k-text-muted">
            {team.teamViews} views
          </span>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {team.workTypes.map((w) => (
            <span key={w} className="rounded-md bg-white/70 px-2 py-0.5 text-[11px] text-k-text-secondary">
              {w}
            </span>
          ))}
        </div>

        {isEmployer ? (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="min-h-11 rounded-k-btn bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-8 py-3 text-sm font-medium text-white"
              onClick={contactTeam}
            >
              Jamoa bilan bog&apos;lanish · Contact Team
            </button>
            <button
              type="button"
              className="min-h-11 rounded-k-btn border border-k-border bg-k-surface-elevated px-6 py-3 text-sm font-medium text-k-text"
              onClick={saveTeam}
              disabled={team.saved}
            >
              {team.saved ? "Saved" : "Save team"}
            </button>
          </div>
        ) : null}
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-k-card border border-k-border bg-k-surface p-6">
            <h2 className="text-base font-medium text-k-text">About this team</h2>
            <p className="mt-3 text-sm leading-relaxed text-k-text-secondary">{team.description || "—"}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {team.skills.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-[#4B9EFF33] bg-[#4B9EFF1A] px-3 py-1 text-xs text-[#4B9EFF]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-k-card border border-k-border bg-k-surface p-6">
            <h2 className="text-base font-medium text-k-text">Meet the team ({team.members.length} members)</h2>
            <ul className="mt-4 space-y-3">
              {team.members.map((m) => {
                const g = avatarGradientForName(m.fullName);
                return (
                  <li
                    key={m.userId}
                    className="flex flex-col gap-3 rounded-k-btn border border-k-border bg-k-surface-elevated p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-medium"
                        style={{
                          background: m.profilePhotoUrl ? "transparent" : `linear-gradient(145deg, ${g.from}, ${g.to})`,
                          color: m.profilePhotoUrl ? undefined : g.text,
                        }}
                      >
                        {m.profilePhotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.profilePhotoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          initialFromName(m.fullName)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-k-text">
                          {m.fullName}
                          {m.isLeader ? <span className="ml-2 bg-linear-to-r from-[#F59E0B] to-[#FCD34D] bg-clip-text text-transparent" title="Team leader">♛</span> : null}
                        </p>
                        <p className="text-xs text-k-text-muted">{m.roleInTeam} · {m.jobTitle}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {m.skillsTop.map((s) => (
                            <span key={s} className="rounded-md bg-k-surface px-2 py-0.5 text-[10px] text-k-text-secondary">
                              {s}
                            </span>
                          ))}
                        </div>
                        <p className="mt-2 text-sm font-medium text-k-primary tabular-nums">
                          {m.salaryNegotiable
                            ? "Negotiable"
                            : `${m.salaryMin ?? "—"} — ${m.salaryMax ?? "—"} / month`}{" "}
                          <span className="text-xs font-normal text-k-text-muted">(individual)</span>
                        </p>
                        {!m.salaryNegotiable && m.salaryMin != null && m.salaryMax != null ? (
                          <p className="mt-0.5 text-[10px] text-k-text-muted">
                            approx. {formatUzsRange(m.salaryMin, m.salaryMax, usdToUzsRate)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <Link
                      href={`/candidates/${m.userId}`}
                      className="shrink-0 px-4 py-2 text-center text-sm text-[#4B9EFF]"
                    >
                      View profile
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {team.projects.length ? (
            <div className="rounded-k-card border border-k-border bg-k-surface p-6" style={{ borderWidth: "0.5px" }}>
              <h2 className="text-base font-medium text-k-text">Bizning ishlarimiz · Our Work</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {team.projects.map((p) => (
                  <article key={p.id} className="overflow-hidden rounded-k-btn border border-k-border" style={{ borderWidth: "0.5px" }}>
                    <div className="flex aspect-video items-center justify-center bg-k-page text-xs text-k-text-muted">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        "Project"
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-k-text">{p.name}</h3>
                      <p className="mt-1 text-xs text-k-text-secondary line-clamp-3">{p.description}</p>
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-medium text-k-primary"
                        >
                          View project →
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-k-card border border-k-border bg-k-surface p-5">
            <p className="text-xs uppercase text-k-text-muted">Jamoa narxi · Team price</p>
            <p className="mt-3 bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] bg-clip-text text-3xl font-extrabold text-transparent tabular-nums">
              {team.priceNegotiable
                ? "Negotiable"
                : `${team.priceMin ?? "—"} — ${team.priceMax ?? "—"} / ${team.priceType === "project" ? "project" : "mo"}`}
            </p>
            {!team.priceNegotiable && team.priceMin != null && team.priceMax != null ? (
              <p className="mt-1 text-xs text-k-text-muted">
                approx. {formatUzsRange(team.priceMin, team.priceMax, usdToUzsRate)}
              </p>
            ) : null}
            {!team.priceNegotiable && usdToUzsRateUpdatedAt ? (
              <p className="mt-0.5 text-[10px] text-k-text-muted">Rate updated: {formatRateUpdatedDate(usdToUzsRateUpdatedAt) ?? ""}</p>
            ) : null}
          </div>
          <div className="rounded-k-card border border-k-primary/20 bg-k-primary-light/30 p-5" style={{ borderWidth: "0.5px" }}>
            <p className="text-sm font-medium text-k-text">Send a message</p>
            <p className="mt-2 text-xs text-k-text-secondary">
              Messages go to the team leader, {team.leader.fullName}.
            </p>
            {isEmployer ? (
              <button
                type="button"
                className="mt-4 w-full rounded-k-btn bg-k-primary py-2.5 text-sm text-white"
                onClick={contactTeam}
              >
                Xabar yuborish · Message leader
              </button>
            ) : null}
          </div>
        </aside>
      </section>
    </AppChrome>
  );
}
