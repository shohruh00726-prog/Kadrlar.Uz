"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";

type Metrics = {
  totalUsers: number;
  totalUsersBreakdown: { employees: number; employers: number };
  newToday: number;
  newTodayBreakdown: { employees: number; employers: number };
  activeProfiles: number;
  avgCompletionRate: number;
  pendingVerifications: number;
  flaggedContent: number;
  messagesToday: number;
  weeklyGrowth: { usersPercent: number; profilesPercent: number };
};

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/admin/dashboard/metrics");
      if (!r.ok) return;
      const j = await r.json();
      setMetrics(j.metrics ?? null);
    })();
  }, []);

  const card = (label: string, value: string | number, note?: string) => (
    <div className="rounded-k-card border border-k-border bg-k-surface p-4" style={{ borderWidth: "0.5px" }}>
      <p className="text-xs uppercase text-k-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-medium text-k-primary">{value}</p>
      {note ? <p className="mt-1 text-xs text-k-text-secondary">{note}</p> : null}
    </div>
  );

  return (
    <AdminLayout>
    <div>
      <h1 className="k-h1">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-k-text-secondary">Platform overview and moderation signals.</p>
      {!metrics ? (
        <p className="mt-4 text-sm text-k-text-muted">Loading...</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {card(
            "Total users",
            metrics.totalUsers,
            `Employees ${metrics.totalUsersBreakdown.employees} · Employers ${metrics.totalUsersBreakdown.employers}`,
          )}
          {card(
            "New today",
            metrics.newToday,
            `Employees ${metrics.newTodayBreakdown.employees} · Employers ${metrics.newTodayBreakdown.employers}`,
          )}
          {card(
            "Active profiles",
            metrics.activeProfiles,
            `Avg completion ${metrics.avgCompletionRate}%`,
          )}
          {card("Pending verifications", metrics.pendingVerifications, "Target SLA: < 24h")}
          {card("Flagged content", metrics.flaggedContent, "Requires moderation")}
          {card("Messages today", metrics.messagesToday)}
          {card(
            "Weekly growth",
            `${metrics.weeklyGrowth.usersPercent}% users`,
            `${metrics.weeklyGrowth.profilesPercent}% profiles`,
          )}
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
