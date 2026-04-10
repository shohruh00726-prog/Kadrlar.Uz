"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { AdminLayout } from "../AdminLayout";

type Item = {
  notificationId: string;
  userId: string;
  userName: string;
  userType: string;
  submittedAt: string;
  type: string;
  waitingHours: number;
  slaBreached: boolean;
};

export default function AdminVerificationsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);

  async function load() {
    const r = await fetch("/api/admin/verifications");
    if (!r.ok) return setItems([]);
    const j = await r.json();
    setItems(j.items ?? []);
  }

  async function review(notificationId: string, action: "approve" | "reject" | "request_more_info") {
    let reason: string | undefined;
    if (action !== "approve") {
      const entered = window.prompt("Reason");
      if (entered === null) return;
      reason = entered;
    }
    const r = await fetch("/api/admin/verifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId, action, reason }),
    });
    if (!r.ok) toast("Action failed", "error");
    await load();
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const r = await fetch("/api/admin/verifications");
      if (!r.ok) return;
      const j = await r.json();
      if (active) setItems(j.items ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminLayout>
    <div>
      <h1 className="k-h1">Verifications</h1>
      <p className="mt-1 text-sm text-k-text-secondary">Pending ID and business verification queue.</p>
      <div className="mt-4 space-y-2">
        {items.map((x) => (
          <div key={x.notificationId} className="rounded-k-card border border-k-border bg-k-surface p-4">
            <p className="font-medium text-k-text">{x.userName}</p>
            <p className="text-sm text-k-text-secondary">{x.type} · waiting {x.waitingHours}h</p>
            <p className={`text-xs ${x.slaBreached ? "text-red-600" : "text-emerald-700"}`}>
              {x.slaBreached ? "SLA breached (>24h)" : "Within SLA"}
            </p>
            <div className="mt-2 flex gap-2">
              <button className="rounded-k-btn bg-emerald-600 px-3 py-1 text-xs text-white" onClick={() => review(x.notificationId, "approve")}>Approve</button>
              <button className="rounded-k-btn border border-red-300 px-3 py-1 text-xs text-red-700" onClick={() => review(x.notificationId, "reject")}>Reject</button>
              <button className="rounded-k-btn border border-k-border px-3 py-1 text-xs" onClick={() => review(x.notificationId, "request_more_info")}>Request more info</button>
            </div>
          </div>
        ))}
      </div>
    </div>
    </AdminLayout>
  );
}
