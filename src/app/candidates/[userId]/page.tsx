"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { StarDisplay } from "@/components/ui/StarRating";
import { avatarGradientForName, initialFromName } from "@/lib/avatar-style";
import { formatRateUpdatedDate, formatUzsRange } from "@/lib/currency";
import { useToast } from "@/components/ui/Toast";

export default function CandidatePage() {
  const { toast } = useToast();
  const { userId } = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contact, setContact] = useState<{ email?: string; phone?: string } | null>(null);
  const [contactNote, setContactNote] = useState<string | null>(null);
  const [savedState, setSavedState] = useState<boolean | null>(null);
  const backHref = useMemo(() => {
    const from = searchParams.get("from");
    if (from && from.startsWith("/browse")) return from;
    if (typeof document !== "undefined") {
      try {
        const ref = new URL(document.referrer);
        if (ref.pathname === "/browse") return `/browse${ref.search ?? ""}`;
      } catch { /* ignore invalid referrer */ }
    }
    return "/browse";
  }, [searchParams]);
  const [reviews, setReviews] = useState<
    { id: string; reviewerName: string; overallRating: number; writtenReview: string | null; createdAt: string }[]
  >([]);
  const [reviewSummary, setReviewSummary] = useState<{ averageRating: number; totalReviews: number; verifiedHireCount: number } | null>(null);
  const [usdToUzsRate, setUsdToUzsRate] = useState(12500);
  const [usdToUzsRateUpdatedAt, setUsdToUzsRateUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoadError(null);
      const [cRes, mRes] = await Promise.all([
        fetch(`/api/candidates/${userId}`),
        fetch("/api/auth/me"),
      ]);
      const c = await cRes.json();
      const m = await mRes.json();
      if (!cRes.ok) {
        setData(null);
        setLoadError(String(c.error || "Could not load this profile."));
        return;
      }
      setData(c);
      const rr = await fetch(`/api/reviews?revieweeId=${userId}&limit=3`);
      const rj = await rr.json().catch(() => ({}));
      setReviews(rj.reviews ?? []);
      setReviewSummary(rj.summary ?? null);
      if (m.user?.userType === "employer" && m.user?.id !== userId) {
        void fetch(`/api/candidates/${userId}/view`, { method: "POST" });
      }
    })();
  }, [userId]);

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


  if (loadError) {
    return (
      <AppChrome>
        <Link href={backHref} className="text-sm text-k-primary hover:underline">
          ← Back to browse
        </Link>
        <p className="mt-6 text-sm text-k-text-secondary">{loadError}</p>
      </AppChrome>
    );
  }

  if (!data) {
    return (
      <AppChrome>
        <p className="text-sm text-k-text-muted">Loading…</p>
      </AppChrome>
    );
  }

  const c = data.candidate as Record<string, unknown>;
  const p = c.profile as Record<string, unknown>;
  const v = (c.verification as { emailVerified?: boolean; phoneVerified?: boolean; idVerified?: boolean } | undefined) ?? {};
  const viewer = data.viewer as { role: string | null; userId: string | null };
  const skills = (p.skills as string[]) ?? [];
  const workTypes = (p.workTypes as string[]) ?? [];
  const isEmployer = viewer.role === "employer";
  const isOwn = viewer.userId === userId;
  const experiences = ((p.workExperiences as Record<string, unknown>[]) ?? []).filter(Boolean);
  const projects = ((p.projects as Record<string, unknown>[]) ?? []).filter(Boolean);
  const languages = ((p.languages as { language?: string; proficiency?: string }[]) ?? []).filter(Boolean);
  const isSaved = savedState ?? Boolean(c.saved);

  async function startChat() {
    const r = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: userId }),
    });
    const j = await r.json();
    if (r.ok) router.push(`/messages/${j.conversationId}`);
    else toast(String(j.error || "Could not start chat"), "error");
  }

  async function saveCandidate() {
    const r = await fetch("/api/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: userId }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast(String((j as { error?: string }).error || "Could not save candidate"), "error");
      return;
    }
    setSavedState(true);
  }

  async function revealContact() {
    setContactNote(null);
    const r = await fetch(`/api/candidates/${userId}/contact`, { method: "POST" });
    const j = (await r.json()) as { error?: string; showChat?: boolean; email?: string; phone?: string };
    if (r.ok) {
      setContact({ email: j.email, phone: j.phone });
      return;
    }
    setContact(null);
    if (j.showChat) setContactNote("This candidate prefers in-app chat.");
    else setContactNote(j.error || "Contact info is currently unavailable.");
  }

  const name = String(c.fullName ?? "");
  const av = avatarGradientForName(name);
  const dob = p.dateOfBirth ? new Date(String(p.dateOfBirth)) : null;
  const age =
    dob && !Number.isNaN(dob.getTime())
      ? Math.max(0, new Date().getFullYear() - dob.getFullYear())
      : null;
  const proficiencyToPercent = (level: string) => {
    const map: Record<string, number> = {
      native: 100,
      fluent: 85,
      advanced: 75,
      intermediate: 55,
      basic: 35,
    };
    return map[level.toLowerCase()] ?? 60;
  };

  return (
    <AppChrome>
      <Link href={backHref} className="text-sm text-k-primary hover:underline">
        ← Back to results
      </Link>
      <div
        className="mt-4 rounded-k-card border border-k-border bg-k-surface"
        style={{ borderBottomColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-4 p-5">
            <div
              className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[16px] text-xl font-semibold"
              style={{
                background: `linear-gradient(145deg, ${av.from}, ${av.to})`,
                color: av.text,
              }}
            >
              {initialFromName(name)}
            </div>
            <div>
              <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-k-text">{name}</h1>
              <p className="text-[14px] text-k-text-muted">
                {(p.jobTitle as string) || "Professional"} · {(c.city as string) || ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-k-border bg-k-surface-elevated px-3 py-1 text-[11px] text-k-text-secondary">
                  {String(p.availability || "Available now")}
                </span>
                {workTypes.map((w) => (
                  <span key={w} className="rounded-full border border-k-border bg-k-surface-elevated px-3 py-1 text-[11px] text-k-text-secondary">
                    {w}
                  </span>
                ))}
                {(p.yearsOfExperience as number) ? (
                  <span className="rounded-full border border-k-border bg-k-surface-elevated px-3 py-1 text-[11px] text-k-text-secondary">
                    {String(p.yearsOfExperience)}+ years
                  </span>
                ) : null}
                {age != null ? (
                  <span className="rounded-full border border-k-border bg-k-surface-elevated px-3 py-1 text-[11px] text-k-text-secondary">
                    {age} years old
                  </span>
                ) : null}
                {v.idVerified ? <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] text-amber-200">Gold verified</span> : null}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 p-5 md:w-[220px]">
            {isOwn ? (
              <Link href="/profile/edit" className="rounded-[10px] bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-4 py-2 text-center text-sm font-semibold text-white">
                Edit profile
              </Link>
            ) : null}
            {isEmployer ? (
              <>
                <button type="button" className="rounded-[10px] bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(75,158,255,0.25)]" onClick={startChat}>
                  Send message
                </button>
                <button type="button" className="rounded-[10px] border border-k-border bg-k-surface-elevated px-4 py-2 text-sm text-k-text" onClick={revealContact}>
                  See contact info
                </button>
                <button type="button" className="rounded-[10px] border border-k-border bg-k-surface-elevated px-4 py-2 text-sm text-k-text" onClick={saveCandidate}>
                  {isSaved ? "🔖 Saved" : "🔖 Save candidate"}
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div className={`grid transition-all duration-200 ease-in-out ${contact || contactNote ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden px-5 pb-5">
            {contact ? (
              <div className="rounded-[10px] border border-[#4B9EFF66] bg-[#4B9EFF14] p-3 text-sm text-k-text">
                <p>Phone: {contact.phone || "Not provided"}</p>
                <p>Email: {contact.email || "Not provided"}</p>
              </div>
            ) : null}
            {!contact && contactNote ? (
              <div className="rounded-[10px] border border-[#4B9EFF66] bg-[#4B9EFF14] p-3 text-sm text-k-text-secondary">
                {contactNote}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[65%_35%]">
        <div className="space-y-4">
          <div className="rounded-k-card border border-k-border bg-k-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">About</p>
            <div className="mt-3 border-t border-k-border" />
            <p className="mt-3 text-[14px] leading-[1.7] text-k-text-secondary">{String(p.bio || "No bio provided yet.")}</p>
          </div>

          <div className="rounded-k-card border border-k-border bg-k-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Skills</p>
            <div className="mt-3 border-t border-k-border" />
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="rounded-full border border-[#4B9EFF33] bg-[#4B9EFF1A] px-3 py-1 text-xs text-[#4B9EFF]">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-k-card border border-k-border bg-k-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Experience</p>
            <div className="mt-3 border-t border-k-border" />
            <div className="relative mt-4 space-y-4">
              <div className="absolute bottom-0 left-[7px] top-0 w-px bg-k-surface-elevated" />
              {experiences.length ? (
                experiences.map((exp, i) => (
                  <div key={`${String(exp.id ?? i)}`} className="relative pl-8">
                    <span className="absolute left-0 top-1.5 h-4 w-4 rounded-full bg-linear-to-r from-[#4B9EFF] to-[#A78BFA]" />
                    <p className="text-sm font-semibold text-k-text">{String(exp.companyName ?? "Company")}</p>
                    <p className="text-xs text-k-text-muted">{String(exp.jobTitle ?? "Role")}</p>
                    {exp.description ? <p className="mt-1 text-sm text-k-text-secondary">{String(exp.description)}</p> : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-k-text-secondary">No work experience entries yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-k-card border border-k-border bg-k-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Projects</p>
            <div className="mt-3 border-t border-k-border" />
            {projects.length ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {projects.map((pr, i) => (
                  <div key={`${String(pr.id ?? i)}`} className="rounded-[12px] border border-k-border bg-k-surface-elevated p-3">
                    <p className="text-sm font-semibold text-k-text">{String(pr.projectName ?? "Project")}</p>
                    <p className="mt-1 text-xs text-k-text-secondary">{String(pr.description ?? "")}</p>
                    {pr.url ? (
                      <a href={String(pr.url)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-[#4B9EFF] hover:underline">
                        Open project
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-k-text-secondary">No projects shared yet.</p>
            )}
          </div>

          {(p.educationLevel || p.university || p.fieldOfStudy) ? (
            <div className="rounded-k-card border border-k-border bg-k-surface p-5">
              <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Education</p>
              <div className="mt-3 border-t border-k-border" />
              <div className="mt-3 space-y-1 text-sm">
                {p.university ? <p className="font-semibold text-k-text">{String(p.university)}</p> : null}
                {p.fieldOfStudy ? <p className="text-k-text-secondary">{String(p.fieldOfStudy)}</p> : null}
                {p.educationLevel ? <p className="text-k-text-muted">{String(p.educationLevel)}{p.graduationYear ? ` · ${String(p.graduationYear)}` : ""}</p> : null}
              </div>
            </div>
          ) : null}

          <div className="rounded-k-card border border-k-border bg-k-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Reviews</p>
            <div className="mt-3 border-t border-k-border" />
            {reviewSummary?.totalReviews ? (
              <div className="mt-2 flex items-center gap-2">
                <StarDisplay rating={reviewSummary.averageRating} />
                <span className="text-sm text-k-text-secondary">{reviewSummary.averageRating.toFixed(1)} ({reviewSummary.totalReviews} reviews)</span>
              </div>
            ) : (
              <p className="mt-2 text-sm text-k-text-secondary">No published reviews yet.</p>
            )}
            <div className="mt-3 space-y-2">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-[12px] border border-k-border bg-k-surface-elevated p-3 text-sm">
                  <p className="font-medium text-k-text">
                    {r.reviewerName} · <StarDisplay rating={r.overallRating} size="sm" />
                  </p>
                  {r.writtenReview ? <p className="mt-1 text-k-text-secondary">{r.writtenReview}</p> : null}
                  <p className="mt-1 text-xs text-k-text-muted">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-k-card border border-[#4B9EFF33] bg-[#4B9EFF0F] p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Salary</p>
            <p className="mt-2 bg-linear-to-r from-[#4B9EFF] to-[#A78BFA] bg-clip-text text-[34px] font-extrabold leading-none text-transparent">
              {p.salaryNegotiable
                ? "Negotiable"
                : `${p.salaryMin} — ${p.salaryMax} / month`}
            </p>
            {!p.salaryNegotiable ? (
              <>
                <p className="mt-2 text-sm text-k-text-secondary">
                  approx. {formatUzsRange(Number(p.salaryMin ?? 0), Number(p.salaryMax ?? 0), usdToUzsRate)}
                </p>
                {usdToUzsRateUpdatedAt ? (
                  <p className="mt-1 text-[10px] text-k-text-muted">Rate updated: {formatRateUpdatedDate(usdToUzsRateUpdatedAt) ?? ""}</p>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="rounded-k-card border border-k-border bg-k-surface p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Languages</p>
            <div className="mt-3 space-y-3">
              {languages.length ? (
                languages.map((ln, i) => {
                  const level = String(ln.proficiency ?? "Fluent");
                  const value = proficiencyToPercent(level);
                  return (
                    <div key={`${String(ln.language ?? i)}-${i}`}>
                      <div className="mb-1 flex items-center justify-between text-xs text-k-text-secondary">
                        <span>{String(ln.language || "Language")}</span>
                        <span>{level}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-k-surface-elevated">
                        <div className="h-1.5 rounded-full bg-linear-to-r from-[#4B9EFF] to-[#A78BFA]" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-k-text-secondary">No language data yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-k-card border border-[#4B9EFF33] bg-[#4B9EFF14] p-5">
            <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Profile views</p>
            <p className="mt-2 bg-linear-to-r from-[#4B9EFF] to-[#A78BFA] bg-clip-text text-[28px] font-extrabold leading-none text-transparent">
              {String(p.profileViews ?? "—")}
            </p>
          </div>

          {c.team ? (
            <div className="rounded-k-card border border-k-border bg-k-surface p-5 text-sm">
              <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Team</p>
              <div className="mt-3 flex gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-k-surface-elevated text-sm font-medium text-k-text">
                  {(c.team as { logoUrl?: string | null }).logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(c.team as { logoUrl?: string | null }).logoUrl ?? ""}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    initialFromName((c.team as { name: string }).name)
                  )}
                </div>
                <div>
                  <Link className="font-medium text-k-text" href={`/teams/${(c.team as { id: string }).id}`}>
                    {(c.team as { name: string }).name}
                  </Link>
                  <p className="mt-1 text-xs text-k-text-muted">
                    Role in team: {(c.team as { role: string | null }).role}
                  </p>
                  <Link
                    href={`/teams/${(c.team as { id: string }).id}`}
                    className="mt-2 inline-block text-xs font-medium text-[#4B9EFF]"
                  >
                    View team
                  </Link>
                  <p className="mt-2 text-xs text-k-text-secondary">
                    This candidate is also available as part of{" "}
                    <span className="text-k-text">{(c.team as { name: string }).name}</span>.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppChrome>
  );
}
