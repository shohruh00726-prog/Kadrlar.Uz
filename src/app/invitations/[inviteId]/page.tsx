"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { avatarGradientForName, initialFromName } from "@/lib/avatar-style";
import { useToast } from "@/components/ui/Toast";

export default function TeamInvitationPage() {
  const { toast } = useToast();
  const { inviteId } = useParams<{ inviteId: string }>();
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/team-invites/${inviteId}`);
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Not found");
        setData(null);
        return;
      }
      setData(j.invite as Record<string, unknown>);
      setErr(null);
    })();
  }, [inviteId]);

  async function respond(action: "accept" | "decline") {
    const r = await fetch(`/api/team-invites/${inviteId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const j = await r.json();
    if (!r.ok) {
      toast(String(j.error || "Something went wrong"), "error");
      return;
    }
    if (action === "accept" && j.teamId) router.push(`/teams/${j.teamId}`);
    else router.push("/notifications");
  }

  if (err) {
    return (
      <AppChrome>
        <p className="text-sm text-k-text-muted">{err}</p>
        <Link href="/dashboard" className="mt-4 text-sm text-k-primary">
          Dashboard
        </Link>
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

  const team = data.team as Record<string, unknown>;
  const leader = team.leader as Record<string, unknown>;
  const members = (team.members as Record<string, unknown>[]) ?? [];
  const teamName = String(team.teamName ?? "");

  const lg = avatarGradientForName(String(leader.fullName ?? ""));

  return (
    <AppChrome>
      <h1 className="k-h1">Team invitation</h1>
      <p className="mt-2 text-sm text-k-text-secondary">
        You have been invited to join <strong>{teamName}</strong> on Kadrlar.uz.
      </p>

      <div className="mt-6 rounded-k-card border border-k-border bg-k-surface p-5" style={{ borderWidth: "0.5px" }}>
        <p className="text-xs uppercase text-k-text-muted">Team</p>
        <p className="mt-1 text-lg font-medium text-k-text">{teamName}</p>
        {team.description ? (
          <p className="mt-2 text-sm text-k-text-secondary">{String(team.description)}</p>
        ) : null}

        <div className="mt-6 flex gap-3 border-t border-k-border pt-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-medium"
            style={{
              background: `linear-gradient(145deg, ${lg.from}, ${lg.to})`,
              color: lg.text,
            }}
          >
            {initialFromName(String(leader.fullName ?? ""))}
          </div>
          <div>
            <p className="text-xs uppercase text-k-text-muted">Team leader</p>
            <p className="font-medium text-k-text">{String(leader.fullName)}</p>
            <p className="text-xs text-k-text-muted">{String(leader.jobTitle ?? "")}</p>
          </div>
        </div>

        <p className="k-label mt-6">Current members</p>
        <ul className="mt-2 space-y-1 text-sm">
          {members.map((m) => (
            <li key={String(m.userId)}>
              {String(m.fullName)} — {String(m.roleInTeam ?? "")}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-k-btn bg-k-primary px-6 py-2.5 text-sm text-white"
          onClick={() => respond("accept")}
        >
          Accept invitation
        </button>
        <button
          type="button"
          className="rounded-k-btn border border-k-border bg-k-surface px-6 py-2.5 text-sm"
          style={{ borderWidth: "0.5px" }}
          onClick={() => respond("decline")}
        >
          Decline
        </button>
      </div>
    </AppChrome>
  );
}
