"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CITIES,
  JOB_CATEGORIES,
  SUBCATEGORIES,
  TEAM_AVAILABILITY,
  TEAM_WORK_OPTIONS,
} from "@/lib/constants";
import { readResponseJson } from "@/lib/read-response-json";
import { useToast } from "@/components/ui/Toast";

type SearchUser = {
  userId: string;
  fullName: string;
  profilePhotoUrl: string | null;
  jobTitle: string | null;
  skills: string[];
};

type PendingInvite = { id: string; fullName: string };
type AcceptedMember = { userId: string; fullName: string; roleInTeam: string | null };

const steps = [1, 2, 3, 4, 5, 6] as const;

export function TeamCreateWizard() {
  const { toast } = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const teamId = sp.get("teamId") || "";
  const stepParam = Number(sp.get("step") || "1");
  const step = steps.includes(stepParam as (typeof steps)[number]) ? stepParam : 1;

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  /* Step 1 */
  const [teamName, setTeamName] = useState("");
  const [teamLogoUrl, setTeamLogoUrl] = useState("");
  const [teamLogoFileName, setTeamLogoFileName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(JOB_CATEGORIES[0] ?? "Technology & IT");
  const [city, setCity] = useState("Tashkent");
  const [workTypes, setWorkTypes] = useState<string[]>(["Remote"]);
  const [availability, setAvailability] = useState("Available now");

  /* Step 2 */
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  /* Step 3 */
  const [priceMin, setPriceMin] = useState<number | "">(1000);
  const [priceMax, setPriceMax] = useState<number | "">(2500);
  const [priceNegotiable, setPriceNegotiable] = useState(false);
  const [priceType, setPriceType] = useState<"monthly" | "project">("monthly");

  /* Step 4 */
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<SearchUser[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [acceptedMembers, setAcceptedMembers] = useState<AcceptedMember[]>([]);

  /* Step 5 */
  const [projects, setProjects] = useState<
    { name: string; description: string; url: string }[]
  >([{ name: "", description: "", url: "" }]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  /* Step 6 — employer preview (leader-only API) */
  const [previewSnapshot, setPreviewSnapshot] = useState<Record<string, unknown> | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const suggestedSkills = useMemo(() => {
    const sub = SUBCATEGORIES[category] ?? [];
    return [...sub, "Communication", "Project management"].slice(0, 12);
  }, [category]);

  const syncInvites = useCallback(async (id: string) => {
    const r = await fetch(`/api/teams/${id}?manage=1`, { credentials: "include" });
    const j = await readResponseJson(r);
    const team = j.team as {
      pendingInvites?: { id: string; fullName: string }[];
      allMembers?: { userId: string; fullName: string; roleInTeam: string | null; status: string }[];
      leader?: { userId: string };
    } | undefined;
    setPendingInvites(team?.pendingInvites ?? []);
    setAcceptedMembers(
      (team?.allMembers ?? [])
        .filter((m) => m.status === "active" && m.userId !== team?.leader?.userId)
        .map((m) => ({ userId: m.userId, fullName: m.fullName, roleInTeam: m.roleInTeam })),
    );
  }, []);

  useEffect(() => {
    if (!teamId || step !== 4) return;
    void syncInvites(teamId);
  }, [teamId, step, syncInvites]);

  useEffect(() => {
    if (teamId && step === 1) {
      router.replace(`/teams/create?teamId=${teamId}&step=2`);
    }
  }, [teamId, step, router]);

  useEffect(() => {
    if (!teamId || searchQ.length < 2) {
      setSearchHits([]);
      return;
    }
    const t = setTimeout(async () => {
      const r = await fetch(
        `/api/teams/${teamId}/search-members?q=${encodeURIComponent(searchQ)}`,
        { credentials: "include" },
      );
      const j = await readResponseJson(r);
      setSearchHits((j.users ?? []) as SearchUser[]);
    }, 250);
    return () => clearTimeout(t);
  }, [teamId, searchQ]);

  useEffect(() => {
    if (step !== 6 || !teamId || done) {
      setPreviewSnapshot(null);
      setPreviewError(null);
      return;
    }
    let cancelled = false;
    setPreviewError(null);
    (async () => {
      const r = await fetch(`/api/teams/${teamId}?manage=1`, { credentials: "include" });
      const j = await readResponseJson(r);
      if (cancelled) return;
      if (!r.ok || !j.team) {
        setPreviewSnapshot(null);
        setPreviewError(String(j.error || `Could not load preview (${r.status})`));
        return;
      }
      setPreviewSnapshot(j.team as Record<string, unknown>);
      setPreviewError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [step, teamId, done]);

  async function submitStep1(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/teams", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName,
          teamLogoUrl: teamLogoUrl.trim() || null,
          tagline: tagline.slice(0, 100) || null,
          description: description.slice(0, 600) || null,
          category,
          city,
          availability,
          skills: [],
          workTypes,
          priceMin: null,
          priceMax: null,
          priceNegotiable: false,
          priceType: "monthly",
        }),
      });
      const j = await readResponseJson(r);
      if (!r.ok) {
        toast(String(j.error || "Failed to create team"), "error");
        return;
      }
      router.push(`/teams/create?teamId=${String(j.teamId)}&step=2`);
    } finally {
      setLoading(false);
    }
  }

  async function patchTeam(body: Record<string, unknown>) {
    if (!teamId) return false;
    const r = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const j = await readResponseJson(r);
      toast(String(j.error || "Save failed"), "error");
      return false;
    }
    return true;
  }

  async function submitStep2(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const ok = await patchTeam({ skills });
      if (ok) router.push(`/teams/create?teamId=${teamId}&step=3`);
    } finally {
      setLoading(false);
    }
  }

  async function submitStep3(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const ok = await patchTeam({
        priceMin: priceNegotiable ? null : Number(priceMin) || null,
        priceMax: priceNegotiable ? null : Number(priceMax) || null,
        priceNegotiable,
        priceType,
      });
      if (ok) router.push(`/teams/create?teamId=${teamId}&step=4`);
    } finally {
      setLoading(false);
    }
  }

  async function inviteUser(userId: string) {
    if (!teamId) return;
    const r = await fetch(`/api/teams/${teamId}/invite`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const j = await readResponseJson(r);
    if (!r.ok) toast(String(j.error || "Invite failed"), "error");
    else void syncInvites(teamId);
  }

  async function cancelInvite(inviteId: string) {
    if (!teamId) return;
    const r = await fetch(`/api/teams/${teamId}/invites/${inviteId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!r.ok) toast("Could not cancel", "error");
    else void syncInvites(teamId);
  }

  async function submitStep5(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) return;
    setLoading(true);
    try {
      const filled = projects.filter((p) => p.name.trim());
      for (const p of filled.slice(0, 6)) {
        const r = await fetch(`/api/teams/${teamId}/projects`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: p.name.trim(),
            description: p.description.slice(0, 300) || null,
            url: p.url.trim() || null,
          }),
        });
        if (!r.ok) {
          const j = await readResponseJson(r);
          toast(String(j.error || "Project save failed"), "error");
          return;
        }
      }
      router.push(`/teams/create?teamId=${teamId}&step=6`);
    } finally {
      setLoading(false);
    }
  }

  async function publish() {
    if (!teamId) return;
    setLoading(true);
    try {
      const rTeam = await fetch(`/api/teams/${teamId}?manage=1`, { credentials: "include" });
      const jTeam = await readResponseJson(rTeam);
      const teamData = jTeam.team as { members?: unknown[] } | undefined;
      const n = (teamData?.members ?? []).length;
      if (n < 2) {
        toast("Add at least one more active member before publishing.", "error");
        return;
      }
      const ok = await patchTeam({ isPublic: true });
      if (ok) setDone(true);
    } catch {
      toast("Could not publish. Try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  function addSkill(s: string) {
    const t = s.trim();
    if (!t || skills.includes(t) || skills.length >= 20) return;
    setSkills([...skills, t]);
    setSkillInput("");
  }

  function handleLogoFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result || "");
      setTeamLogoUrl(data);
      setTeamLogoFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  if (done && teamId) {
    return (
      <div className="mx-auto max-w-lg rounded-k-card border border-k-border bg-k-surface p-8 text-center" style={{ borderWidth: "0.5px" }}>
        <p className="text-lg font-medium text-k-text">Your team is now live!</p>
        <p className="mt-2 text-sm text-k-text-secondary">
          Employers can discover and contact you as a group.
        </p>
        <Link
          href={`/teams/${teamId}`}
          className="mt-6 inline-flex rounded-k-btn bg-k-primary px-6 py-3 text-sm text-white"
        >
          View team profile
        </Link>
      </div>
    );
  }

  if (!teamId) {
    return (
      <form onSubmit={submitStep1} className="space-y-4 rounded-k-card border border-k-border bg-k-surface p-6 md:p-8">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Step 1 of 6</p>
          <p className="text-xs text-k-text-muted">Team basics</p>
        </div>
        <div className="h-1 rounded-full bg-k-surface-elevated"><div className="h-1 w-[16%] rounded-full bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6]" /></div>
        <p className="k-label">Step 1 — Team basics</p>
        <div>
          <label className="text-xs text-k-text-muted">Team name *</label>
          <input
            required
            className="mt-1 w-full rounded-k-btn border border-k-border bg-k-surface-elevated px-3 py-2 text-sm text-k-text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-k-text-muted">Logo URL (optional)</label>
          <input
            className="mt-1 w-full rounded-k-btn border border-k-border bg-k-surface-elevated px-3 py-2 text-sm text-k-text"
            value={teamLogoUrl}
            onChange={(e) => setTeamLogoUrl(e.target.value)}
            placeholder="https://..."
          />
          <div className="mt-2 flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-k-btn border border-k-border bg-k-surface-elevated px-3 py-2 text-xs text-k-text-secondary">
              Upload square logo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)} />
            </label>
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[10px] border border-k-border bg-k-surface-elevated text-[10px] text-k-text-muted">
              {teamLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={teamLogoUrl} alt="" className="h-12 w-12 object-cover" />
              ) : (
                "LOGO"
              )}
            </div>
            {teamLogoFileName ? <span className="text-[11px] text-k-text-muted">{teamLogoFileName}</span> : null}
          </div>
        </div>
        <div>
          <label className="text-xs text-k-text-muted">Tagline (max 100)</label>
          <input
            maxLength={100}
            className="mt-1 w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
            style={{ borderWidth: "0.5px" }}
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-k-text-muted">Description (max 600)</label>
          <textarea
            maxLength={600}
            rows={4}
            className="mt-1 w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
            style={{ borderWidth: "0.5px" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-k-text-muted">Category</label>
            <select
              className="mt-1 w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
              style={{ borderWidth: "0.5px" }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {JOB_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-k-text-muted">City</label>
            <select
              className="mt-1 w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
              style={{ borderWidth: "0.5px" }}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-k-text-muted">Work type</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {TEAM_WORK_OPTIONS.map((w) => (
              <button
                type="button"
                key={w}
                className={`rounded-full border px-3 py-1 text-xs ${
                  workTypes.includes(w)
                    ? "border-k-primary bg-k-primary text-white"
                    : "border-k-border text-k-text-secondary"
                }`}
                style={{ borderWidth: "0.5px" }}
                onClick={() =>
                  setWorkTypes(
                    workTypes.includes(w) ? workTypes.filter((x) => x !== w) : [...workTypes, w],
                  )
                }
              >
                {w}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-k-text-muted">Availability</label>
          <select
            className="mt-1 w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
            style={{ borderWidth: "0.5px" }}
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          >
            {TEAM_AVAILABILITY.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={loading} className="w-full rounded-k-btn bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] py-3 text-sm font-medium text-white disabled:opacity-60">
          Continue — skills
        </button>
      </form>
    );
  }

  if (step === 2) {
    return (
      <form onSubmit={submitStep2} className="space-y-4 rounded-k-card border border-k-border bg-k-surface p-6 md:p-8">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Step 2 of 6</p>
          <p className="text-xs text-k-text-muted">Combined skills</p>
        </div>
        <div className="h-1 rounded-full bg-k-surface-elevated"><div className="h-1 w-[33%] rounded-full bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6]" /></div>
        <p className="k-label">Step 2 — Combined skills (max 20)</p>
        <p className="text-sm text-k-text-secondary">
          Add skills that represent your whole team, not just yourself.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {suggestedSkills.map((s) => (
            <button
              type="button"
              key={s}
              className="rounded-full border border-k-border bg-k-page px-2.5 py-1 text-xs text-k-primary"
              style={{ borderWidth: "0.5px" }}
              onClick={() => addSkill(s)}
            >
              + {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
            style={{ borderWidth: "0.5px" }}
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill(skillInput);
              }
            }}
            placeholder="Type a skill and press Enter"
          />
          <button
            type="button"
            className="rounded-k-btn border border-k-border bg-k-surface px-3 text-sm"
            style={{ borderWidth: "0.5px" }}
            onClick={() => addSkill(skillInput)}
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <button
              type="button"
              key={s}
              className="rounded-full bg-k-primary-light px-3 py-1 text-xs text-k-primary"
              onClick={() => setSkills(skills.filter((x) => x !== s))}
            >
              {s} ×
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-k-btn border border-k-border px-4 py-2 text-sm"
            style={{ borderWidth: "0.5px" }}
            onClick={() => router.push(`/teams/${teamId}/manage`)}
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading || skills.length === 0}
            className="flex-1 rounded-k-btn bg-k-primary py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            Continue — pricing
          </button>
        </div>
      </form>
    );
  }

  if (step === 3) {
    return (
      <form onSubmit={submitStep3} className="space-y-4 rounded-k-card border border-k-border bg-k-surface p-6 md:p-8">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Step 3 of 6</p>
          <p className="text-xs text-k-text-muted">Pricing</p>
        </div>
        <div className="h-1 rounded-full bg-k-surface-elevated"><div className="h-1 w-1/2 rounded-full bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6]" /></div>
        <p className="k-label">Step 3 — Team pricing</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-k-btn px-4 py-2 text-sm ${
              priceType === "monthly" ? "bg-k-primary text-white" : "border border-k-border bg-k-surface"
            }`}
            style={priceType === "monthly" ? undefined : { borderWidth: "0.5px" }}
            onClick={() => setPriceType("monthly")}
          >
            Per month
          </button>
          <button
            type="button"
            className={`rounded-k-btn px-4 py-2 text-sm ${
              priceType === "project" ? "bg-k-primary text-white" : "border border-k-border bg-k-surface"
            }`}
            style={priceType === "project" ? undefined : { borderWidth: "0.5px" }}
            onClick={() => setPriceType("project")}
          >
            Per project
          </button>
        </div>
        {!priceNegotiable ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-k-text-muted">Minimum USD</label>
              <input
                type="number"
                className="mt-1 w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
                style={{ borderWidth: "0.5px" }}
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-k-text-muted">Maximum USD</label>
              <input
                type="number"
                className="mt-1 w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
                style={{ borderWidth: "0.5px" }}
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={priceNegotiable}
            onChange={(e) => setPriceNegotiable(e.target.checked)}
          />
          Negotiable — contact us for pricing
        </label>
        <p className="text-xs text-k-text-muted">
          Each member&apos;s individual salary appears on their card on the team page. The combined
          price is for hiring the full team.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-k-btn border border-k-border px-4 py-2 text-sm"
            style={{ borderWidth: "0.5px" }}
            onClick={() => router.push(`/teams/create?teamId=${teamId}&step=2`)}
          >
            Back
          </button>
          <button type="submit" disabled={loading} className="flex-1 rounded-k-btn bg-k-primary py-3 text-sm text-white">
            Continue — invite members
          </button>
        </div>
      </form>
    );
  }

  if (step === 4) {
    return (
      <div className="space-y-4 rounded-k-card border border-k-border bg-k-surface p-6 md:p-8">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Step 4 of 6</p>
          <p className="text-xs text-k-text-muted">Invite members</p>
        </div>
        <div className="h-1 rounded-full bg-k-surface-elevated"><div className="h-1 w-[66%] rounded-full bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6]" /></div>
        <p className="k-label">Step 4 — Invite members</p>
        <p className="text-sm text-k-text-secondary">
          You need at least one more active member to publish (minimum two people total). Invited
          people must accept in Notifications.
        </p>
        <input
          className="w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
          style={{ borderWidth: "0.5px" }}
          placeholder="Search by name or email…"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
        />
        <ul className="space-y-2">
          {searchHits.map((u) => (
            <li
              key={u.userId}
              className="flex items-center justify-between gap-3 rounded-k-btn border border-k-border p-3 text-sm"
              style={{ borderWidth: "0.5px" }}
            >
              <div>
                <p className="font-medium text-k-text">{u.fullName}</p>
                <p className="text-xs text-k-text-muted">{u.jobTitle}</p>
              </div>
              <button
                type="button"
                className="rounded-k-btn bg-k-primary px-3 py-1.5 text-xs text-white"
                onClick={() => inviteUser(u.userId)}
              >
                Invite
              </button>
            </li>
          ))}
        </ul>
        <div>
          <p className="text-xs uppercase text-k-text-muted">Pending</p>
          <ul className="mt-2 space-y-1">
            {pendingInvites.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span>{p.fullName}</span>
                <button type="button" className="text-xs text-k-primary" onClick={() => cancelInvite(p.id)}>
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </div>
        {acceptedMembers.length ? (
          <div>
            <p className="text-xs uppercase text-[#4B9EFF]">Accepted</p>
            <ul className="mt-2 space-y-1">
              {acceptedMembers.map((m) => (
                <li key={m.userId} className="flex items-center justify-between rounded-k-btn bg-[#4B9EFF14] px-3 py-2 text-sm text-k-text">
                  <span>{m.fullName}</span>
                  <span className="text-xs text-[#4B9EFF]">{m.roleInTeam || "Member"}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="rounded-k-btn border border-k-border px-4 py-2 text-sm"
            style={{ borderWidth: "0.5px" }}
            onClick={() => router.push(`/teams/create?teamId=${teamId}&step=3`)}
          >
            Back
          </button>
          <button
            type="button"
            className="flex-1 rounded-k-btn bg-k-primary py-3 text-sm text-white"
            onClick={() => router.push(`/teams/create?teamId=${teamId}&step=5`)}
          >
            Continue — projects
          </button>
        </div>
      </div>
    );
  }

  if (step === 5) {
    return (
      <form onSubmit={submitStep5} className="space-y-4 rounded-k-card border border-k-border bg-k-surface p-6 md:p-8">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Step 5 of 6</p>
          <p className="text-xs text-k-text-muted">Past projects</p>
        </div>
        <div className="h-1 rounded-full bg-k-surface-elevated"><div className="h-1 w-[83%] rounded-full bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6]" /></div>
        <p className="k-label">Step 5 — Team projects (optional, max 6)</p>
        {projects.map((p, i) => (
          <div
            key={p.name + i}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIdx == null || dragIdx === i) return;
              const next = [...projects];
              const [moved] = next.splice(dragIdx, 1);
              next.splice(i, 0, moved);
              setProjects(next);
              setDragIdx(null);
            }}
            className="space-y-2 rounded-k-btn border border-k-border p-3"
          >
            <div className="flex items-center justify-between text-xs text-k-text-muted">
              <span>Project {i + 1}</span>
              <div className="flex gap-2">
                <button type="button" className="text-[#4B9EFF] disabled:opacity-40" disabled={i === 0} onClick={() => {
                  const next = [...projects];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  setProjects(next);
                }}>Up</button>
                <button type="button" className="text-[#4B9EFF] disabled:opacity-40" disabled={i === projects.length - 1} onClick={() => {
                  const next = [...projects];
                  [next[i + 1], next[i]] = [next[i], next[i + 1]];
                  setProjects(next);
                }}>Down</button>
              </div>
            </div>
            <p className="text-[10px] text-k-text-muted">Drag card to reorder</p>
            <input
              className="w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
              style={{ borderWidth: "0.5px" }}
              placeholder="Project name"
              value={p.name}
              onChange={(e) => {
                const next = [...projects];
                next[i] = { ...next[i], name: e.target.value };
                setProjects(next);
              }}
            />
            <textarea
              maxLength={300}
              className="w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
              style={{ borderWidth: "0.5px" }}
              placeholder="Description"
              value={p.description}
              onChange={(e) => {
                const next = [...projects];
                next[i] = { ...next[i], description: e.target.value };
                setProjects(next);
              }}
            />
            <input
              className="w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
              style={{ borderWidth: "0.5px" }}
              placeholder="Link (optional)"
              value={p.url}
              onChange={(e) => {
                const next = [...projects];
                next[i] = { ...next[i], url: e.target.value };
                setProjects(next);
              }}
            />
          </div>
        ))}
        {projects.length < 6 ? (
          <button
            type="button"
            className="text-sm text-k-primary"
            onClick={() => setProjects([...projects, { name: "", description: "", url: "" }])}
          >
            + Add team project
          </button>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-k-btn border border-k-border px-4 py-2 text-sm"
            style={{ borderWidth: "0.5px" }}
            onClick={() => router.push(`/teams/create?teamId=${teamId}&step=4`)}
          >
            Back
          </button>
          <button type="submit" disabled={loading} className="flex-1 rounded-k-btn bg-k-primary py-3 text-sm text-white">
            Continue — review
          </button>
        </div>
      </form>
    );
  }

  /* Step 6 */
  const pvMembers =
    (previewSnapshot?.members as { userId?: string; fullName: string; roleInTeam?: string | null }[]) ??
    [];
  const pvSkills = (previewSnapshot?.skills as string[]) ?? [];

  return (
    <div className="space-y-4 rounded-k-card border border-k-border bg-k-surface p-6 md:p-8">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.12em] text-k-text-muted">Step 6 of 6</p>
        <p className="text-xs text-k-text-muted">Preview and publish</p>
      </div>
      <div className="h-1 rounded-full bg-k-surface-elevated"><div className="h-1 w-full rounded-full bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6]" /></div>
      <p className="k-label">Step 6 — Review &amp; publish</p>
      <p className="text-sm text-k-text-secondary">
        When you publish, your team becomes visible to employers (requires two active members who have
        accepted their invitations).
      </p>

      <div className="rounded-k-btn border border-k-primary/30 bg-k-primary-light/40 p-4" style={{ borderWidth: "0.5px" }}>
        <p className="text-xs font-semibold uppercase tracking-wide text-k-primary">Team preview</p>
        <p className="mt-1 text-xs text-k-text-secondary">
          This is how your profile data looks before publishing (same as the live team page for you as
          leader). Member photos on cards will match the catalog after publish.
        </p>
        {previewError ? (
          <p className="mt-3 text-sm text-amber-900">{previewError}</p>
        ) : null}
        {!previewSnapshot && !previewError ? (
          <p className="mt-3 text-sm text-k-text-muted">Loading preview…</p>
        ) : null}
        {previewSnapshot ? (
          <div className="mt-4 space-y-3 border-t border-k-border pt-4 text-sm">
            <div>
              <p className="text-lg font-medium text-k-text">{String(previewSnapshot.teamName ?? "")}</p>
              {previewSnapshot.tagline ? (
                <p className="text-k-text-secondary italic">&ldquo;{String(previewSnapshot.tagline)}&rdquo;</p>
              ) : null}
              <p className="mt-1 text-xs text-k-text-muted">
                {[previewSnapshot.city, previewSnapshot.category].filter(Boolean).join(" · ")}
              </p>
            </div>
            {previewSnapshot.description ? (
              <p className="text-k-text-secondary line-clamp-4">{String(previewSnapshot.description)}</p>
            ) : null}
            {pvSkills.length ? (
              <div className="flex flex-wrap gap-1.5">
                {pvSkills.slice(0, 12).map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-k-primary-mid bg-k-surface px-2 py-0.5 text-xs text-k-primary"
                    style={{ borderWidth: "0.5px" }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : null}
            <div>
              <p className="text-xs uppercase text-k-text-muted">Members ({pvMembers.length})</p>
              <ul className="mt-1 space-y-1">
                {pvMembers.map((m, i) => (
                  <li key={m.userId ?? `${m.fullName}-${i}`}>
                    {m.fullName}
                    {m.roleInTeam ? <span className="text-k-text-muted"> — {m.roleInTeam}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-k-text-muted">
              {previewSnapshot.listable
                ? "Listed on browse (public & 2+ members)."
                : "Not on browse yet — publish below when you have two active members."}
            </p>
          </div>
        ) : null}
      </div>

      <Link
        href={`/teams/${teamId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm font-medium text-k-primary"
      >
        Open full team page in a new tab →
      </Link>
      <p className="text-xs text-k-text-muted">
        The full page requires you to stay logged in while the team is still a draft.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-k-btn border border-k-border px-4 py-2 text-sm"
          style={{ borderWidth: "0.5px" }}
          onClick={() => router.push(`/teams/create?teamId=${teamId}&step=5`)}
        >
          Back
        </button>
        <button
          type="button"
          disabled={loading}
          className="rounded-k-btn bg-k-primary px-6 py-3 text-sm font-medium text-white"
          onClick={publish}
        >
          Publish team profile
        </button>
      </div>
    </div>
  );
}
