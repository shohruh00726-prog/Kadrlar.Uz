"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { useToast } from "@/components/ui/Toast";
import {
  CITIES,
  JOB_CATEGORIES,
  TEAM_AVAILABILITY,
  TEAM_WORK_OPTIONS,
} from "@/lib/constants";
import { readResponseJson } from "@/lib/read-response-json";
import { routeParam } from "@/lib/route-params";

type ManageTeam = {
  id: string;
  teamName: string;
  teamLogoUrl: string | null;
  tagline: string | null;
  description: string | null;
  category: string | null;
  city: string | null;
  availability: string | null;
  isPublic: boolean;
  listable: boolean;
  teamViews: number;
  skills: string[];
  workTypes: string[];
  priceMin: number | null;
  priceMax: number | null;
  priceNegotiable: boolean;
  priceType: string;
  leader: { userId: string; fullName: string };
  members: {
    userId: string;
    fullName: string;
    roleInTeam: string | null;
    status: string;
    isLeader: boolean;
  }[];
  allMembers?: {
    userId: string;
    fullName: string;
    roleInTeam: string | null;
    status: string;
    joinedAt: string;
    isLeader: boolean;
  }[];
  pendingInvites?: { id: string; fullName: string; userId: string }[];
};

async function fetchManageTeam(
  teamId: string,
  signal?: AbortSignal,
): Promise<ManageTeam | null> {
  const r = await fetch(`/api/teams/${teamId}?manage=1`, {
    credentials: "include",
    signal,
  });
  const j = await readResponseJson(r);
  if (r.ok && j.team) return j.team as ManageTeam;
  return null;
}

export default function TeamManagePage() {
  const params = useParams();
  const id = routeParam(params.id as string | string[] | undefined);
  const { toast } = useToast();
  const [team, setTeam] = useState<ManageTeam | null>(null);
  const [email, setEmail] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  async function reload() {
    if (!id) return;
    const t = await fetchManageTeam(id);
    if (t) setTeam(t);
  }

  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    (async () => {
      try {
        const t = await fetchManageTeam(id, ac.signal);
        if (t) setTeam(t);
      } catch {
        /* aborted */
      }
    })();
    return () => ac.abort();
  }, [id]);

  async function inviteEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    const r = await fetch(`/api/teams/${id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const j = await readResponseJson(r);
    if (r.ok) {
      toast("Invite sent", "success");
      setEmail("");
      void reload();
    } else {
      toast(String(j.error || "Error"), "error");
    }
  }

  async function patch(body: Record<string, unknown>) {
    if (!id) return;
    const r = await fetch(`/api/teams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await readResponseJson(r);
    if (!r.ok) {
      toast(String(j.error || "Failed to save"), "error");
      return;
    }
    toast("Saved!", "success");
    void reload();
  }

  async function removeMember(userId: string, name: string) {
    if (!id) return;
    if (!confirm(`Remove ${name} from this team? They will return to individual status.`)) return;
    const r = await fetch(`/api/teams/${id}/members/${userId}`, { method: "DELETE" });
    const j = await readResponseJson(r);
    if (!r.ok) {
      toast(String(j.error || "Failed"), "error");
    } else {
      void reload();
    }
  }

  async function cancelInvite(inviteId: string) {
    if (!id) return;
    const r = await fetch(`/api/teams/${id}/invites/${inviteId}`, { method: "DELETE" });
    if (!r.ok) toast("Could not cancel", "error");
    else void reload();
  }

  async function deleteTeam() {
    if (!id || !team || deleteConfirm !== team.teamName) {
      toast("Type the exact team name to confirm deletion.", "error");
      return;
    }
    const r = await fetch(`/api/teams/${id}`, { method: "DELETE" });
    if (!r.ok) toast("Failed to delete team", "error");
    else window.location.href = "/dashboard";
  }

  if (!id) {
    return (
      <AppChrome>
        <p className="text-sm text-k-text-muted">Invalid team link.</p>
      </AppChrome>
    );
  }

  if (!team) {
    return (
      <AppChrome>
        <p className="text-sm text-k-text-muted">Loading…</p>
      </AppChrome>
    );
  }

  const active = (team.allMembers ?? team.members).filter((m) => m.status === "active");

  return (
    <AppChrome>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="k-h1">Manage team</h1>
          <p className="mt-1 text-sm text-k-text-secondary">{team.teamName}</p>
        </div>
        <Link href={`/teams/${id}`} className="text-sm font-medium text-k-primary">
          View public page →
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-k-card border border-k-border bg-k-surface p-4" style={{ borderWidth: "0.5px" }}>
          <p className="text-xs uppercase text-k-text-muted">Views (total)</p>
          <p className="mt-2 text-2xl font-medium text-k-primary">{team.teamViews}</p>
        </div>
        <div className="rounded-k-card border border-k-border bg-k-surface p-4" style={{ borderWidth: "0.5px" }}>
          <p className="text-xs uppercase text-k-text-muted">Status</p>
          <p className="mt-2 text-sm text-k-text">
            {team.listable ? "Live on browse (2+ members, public)" : "Not listed — add members & publish"}
          </p>
        </div>
        <div className="rounded-k-card border border-k-border bg-k-surface p-4" style={{ borderWidth: "0.5px" }}>
          <p className="text-xs uppercase text-k-text-muted">Quick links</p>
          <Link href={`/teams/create?teamId=${id}&step=4`} className="mt-2 block text-sm text-k-primary">
            Open invite wizard →
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="rounded-k-card border border-k-border bg-k-surface p-5" style={{ borderWidth: "0.5px" }}>
          <h2 className="k-h3">Member management</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {active.map((m) => (
              <li key={m.userId} className="flex items-center justify-between gap-2 border-b border-k-border pb-2">
                <span>
                  {m.fullName}
                  {m.isLeader ? " · Leader" : ""}
                </span>
                {!m.isLeader ? (
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() => removeMember(m.userId, m.fullName)}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <form className="mt-4 space-y-2 border-t border-k-border pt-4" onSubmit={inviteEmail}>
            <p className="text-xs text-k-text-muted">Invite by email (registered employee)</p>
            <input
              type="email"
              className="w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
              style={{ borderWidth: "0.5px" }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.uz"
            />
            <button type="submit" className="rounded-k-btn bg-k-primary px-4 py-2 text-sm text-white">
              Invite member
            </button>
          </form>
          {team.pendingInvites?.length ? (
            <div className="mt-4">
              <p className="text-xs uppercase text-k-text-muted">Pending invitations</p>
              <ul className="mt-2 space-y-1 text-sm">
                {team.pendingInvites.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>{p.fullName}</span>
                    <button type="button" className="text-xs text-k-primary" onClick={() => cancelInvite(p.id)}>
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="rounded-k-card border border-k-border bg-k-surface p-5" style={{ borderWidth: "0.5px" }}>
            <h2 className="k-h3">Visibility</h2>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={team.isPublic}
                onChange={(e) => void patch({ isPublic: e.target.checked })}
              />
              Public (visible when 2+ active members)
            </label>
          </div>
          <div className="rounded-k-card border border-k-border bg-k-surface p-5" style={{ borderWidth: "0.5px" }}>
            <h2 className="k-h3">Danger zone</h2>
            <p className="mt-2 text-xs text-k-text-secondary">
              Deleting this team is permanent. All members return to individual status.
            </p>
            <input
              className="mt-3 w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm"
              style={{ borderWidth: "0.5px" }}
              placeholder={`Type “${team.teamName}” to confirm`}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            <button
              type="button"
              className="mt-2 rounded-k-btn border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
              style={{ borderWidth: "0.5px" }}
              onClick={deleteTeam}
            >
              Delete team
            </button>
          </div>
        </section>
      </div>

      <section className="mt-10 rounded-k-card border border-k-border bg-k-surface p-5" style={{ borderWidth: "0.5px" }}>
        <h2 className="k-h3">Edit profile fields</h2>
        <TeamEditForm team={team} onSave={patch} />
      </section>
    </AppChrome>
  );
}

function TeamEditForm({
  team,
  onSave,
}: {
  team: ManageTeam;
  onSave: (b: Record<string, unknown>) => void | Promise<void>;
}) {
  const [teamName, setTeamName] = useState(team.teamName);
  const [tagline, setTagline] = useState(team.tagline ?? "");
  const [description, setDescription] = useState(team.description ?? "");
  const [category, setCategory] = useState(team.category ?? "");
  const [city, setCity] = useState(team.city ?? "");
  const [availability, setAvailability] = useState(team.availability ?? "");
  const [workTypes, setWorkTypes] = useState<string[]>(team.workTypes);
  const [skills, setSkills] = useState<string>(team.skills.join(", "));
  const [priceMin, setPriceMin] = useState(team.priceMin ?? "");
  const [priceMax, setPriceMax] = useState(team.priceMax ?? "");
  const [priceNegotiable, setPriceNegotiable] = useState(team.priceNegotiable);
  const [priceType, setPriceType] = useState(team.priceType);
  const [teamLogoUrl, setTeamLogoUrl] = useState(team.teamLogoUrl ?? "");

  return (
    <form
      className="mt-4 grid gap-3 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const skillList = skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 20);
        void onSave({
          teamName,
          tagline: tagline || null,
          description: description || null,
          category: category || null,
          city: city || null,
          availability: availability || null,
          workTypes,
          skills: skillList,
          priceMin:
            priceNegotiable ? null : priceMin === "" ? null : Number(priceMin),
          priceMax:
            priceNegotiable ? null : priceMax === "" ? null : Number(priceMax),
          priceNegotiable,
          priceType,
          teamLogoUrl: teamLogoUrl || null,
        });
      }}
    >
      <input className="rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm md:col-span-2" style={{ borderWidth: "0.5px" }} value={teamName} onChange={(e) => setTeamName(e.target.value)} />
      <input className="rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm md:col-span-2" style={{ borderWidth: "0.5px" }} placeholder="Logo URL" value={teamLogoUrl} onChange={(e) => setTeamLogoUrl(e.target.value)} />
      <input className="rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm md:col-span-2" style={{ borderWidth: "0.5px" }} placeholder="Tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
      <textarea className="md:col-span-2 rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm" style={{ borderWidth: "0.5px" }} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      <select className="rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm" style={{ borderWidth: "0.5px" }} value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="">Category</option>
        {JOB_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select className="rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm" style={{ borderWidth: "0.5px" }} value={city} onChange={(e) => setCity(e.target.value)}>
        {CITIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select className="md:col-span-2 rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm" style={{ borderWidth: "0.5px" }} value={availability} onChange={(e) => setAvailability(e.target.value)}>
        {TEAM_AVAILABILITY.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      <div className="md:col-span-2">
        <p className="text-xs text-k-text-muted">Work types</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {TEAM_WORK_OPTIONS.map((w) => (
            <button
              type="button"
              key={w}
              className={`rounded-full border px-2 py-1 text-xs ${workTypes.includes(w) ? "border-k-primary bg-k-primary text-white" : "border-k-border"}`}
              style={{ borderWidth: "0.5px" }}
              onClick={() =>
                setWorkTypes(workTypes.includes(w) ? workTypes.filter((x) => x !== w) : [...workTypes, w])
              }
            >
              {w}
            </button>
          ))}
        </div>
      </div>
      <div className="md:col-span-2">
        <input className="w-full rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm" style={{ borderWidth: "0.5px" }} placeholder="Skills (comma-separated, max 20)" value={skills} onChange={(e) => setSkills(e.target.value)} />
      </div>
      <div className="flex gap-2 md:col-span-2">
        <button type="button" className={priceType === "monthly" ? "rounded-k-btn bg-k-primary px-3 py-1 text-xs text-white" : "rounded-k-btn border px-3 py-1 text-xs"} style={priceType === "monthly" ? undefined : { borderWidth: "0.5px" }} onClick={() => setPriceType("monthly")}>
          Monthly
        </button>
        <button type="button" className={priceType === "project" ? "rounded-k-btn bg-k-primary px-3 py-1 text-xs text-white" : "rounded-k-btn border px-3 py-1 text-xs"} style={priceType === "project" ? undefined : { borderWidth: "0.5px" }} onClick={() => setPriceType("project")}>
          Per project
        </button>
      </div>
      <label className="md:col-span-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={priceNegotiable} onChange={(e) => setPriceNegotiable(e.target.checked)} />
        Negotiable pricing
      </label>
      {!priceNegotiable ? (
        <>
          <input type="number" className="rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm" style={{ borderWidth: "0.5px" }} placeholder="Min" value={priceMin} onChange={(e) => setPriceMin(e.target.value === "" ? "" : Number(e.target.value))} />
          <input type="number" className="rounded-k-btn border border-k-border bg-k-page px-3 py-2 text-sm" style={{ borderWidth: "0.5px" }} placeholder="Max" value={priceMax} onChange={(e) => setPriceMax(e.target.value === "" ? "" : Number(e.target.value))} />
        </>
      ) : null}
      <button type="submit" className="md:col-span-2 rounded-k-btn bg-k-primary py-2.5 text-sm text-white">
        Save changes
      </button>
    </form>
  );
}
