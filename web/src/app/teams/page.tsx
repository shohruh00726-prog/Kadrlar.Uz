"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function TeamsHubPage() {
  const [me, setMe] = useState<Record<string, unknown> | null>(null);
  const [teams, setTeams] = useState<{ id: string; teamName: string; memberCount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [u, t] = await Promise.all([
        fetch("/api/auth/me").then((r) => r.json()),
        fetch("/api/teams").then((r) => r.json()),
      ]);
      setMe(u.user);
      setTeams(t.teams ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <AppChrome>
      <h1 className="k-h1">Teams</h1>
      {me?.userType === "employee" ? (
        <Link
          href="/teams/create"
          className="mt-4 inline-block rounded-k-btn bg-k-primary px-4 py-2 text-sm text-white"
        >
          Create a team
        </Link>
      ) : null}
      {loading ? (
        <div className="mt-8">
          <PageSkeleton />
        </div>
      ) : teams.length === 0 ? (
        <EmptyState
          title="No teams yet"
          description="Freelance teams can list as one unit for employers."
          action={
            <Link
              href="/teams/create"
              className="rounded-k-btn bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white"
            >
              Create a Team
            </Link>
          }
        />
      ) : (
        <div className="mt-8 space-y-3">
          <p className="k-label">Public teams</p>
          {teams.map((t) => (
            <Link
              key={t.id}
              href={`/teams/${t.id}`}
              className="block rounded-k-card border border-k-border bg-k-surface p-4 text-sm hover:border-k-border-hover"
              style={{ borderWidth: "0.5px" }}
            >
              <span className="font-medium text-k-text">{t.teamName}</span>
              <span className="ml-2 text-k-text-muted">{t.memberCount} members</span>
            </Link>
          ))}
        </div>
      )}
    </AppChrome>
  );
}
