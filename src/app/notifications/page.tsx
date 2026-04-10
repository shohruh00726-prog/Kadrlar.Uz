"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Skeleton";

type N = { id: string; title: string; body: string; type: string; relatedId: string | null; createdAt: string; isRead: boolean };

async function fetchNotifications(signal?: AbortSignal): Promise<N[]> {
  const r = await fetch("/api/notifications", { signal });
  const j = await r.json();
  return j.notifications ?? [];
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "new_message" || type === "candidate_reply") {
    return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4B9EFF26] text-[#4B9EFF]">◔</span>;
  }
  if (type === "profile_viewed") {
    return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-k-surface-elevated text-white/50">◉</span>;
  }
  if (type === "profile_saved") {
    return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EF9F2726] text-[#EF9F27]">▮</span>;
  }
  if (type === "contact_viewed") {
    return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1D9E7526] text-[#1D9E75]">◌</span>;
  }
  if (type === "team_invite" || type === "team_viewed" || type === "team_saved") {
    return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#A78BFA26] text-[#A78BFA]">◎</span>;
  }
  if (type === "review_request") {
    return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-400">★</span>;
  }
    return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-k-surface-elevated text-white/50">•</span>;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);
  const grouped = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(startOfToday);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const out: { label: string; items: N[] }[] = [
      { label: "Today", items: [] },
      { label: "This week", items: [] },
      { label: "Earlier", items: [] },
    ];
    for (const n of rows) {
      const at = new Date(n.createdAt);
      if (at >= startOfToday) out[0].items.push(n);
      else if (at >= weekAgo) out[1].items.push(n);
      else out[2].items.push(n);
    }
    return out.filter((g) => g.items.length > 0);
  }, [rows]);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setRows(await fetchNotifications(ac.signal));
        setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  async function load() {
    setRows(await fetchNotifications());
  }

  function routeByNotification(n: N) {
    if (n.type === "new_message" || n.type === "candidate_reply") {
      if (n.relatedId) router.push(`/messages/${n.relatedId}`);
    } else if (n.type === "review_request" && n.relatedId) {
      router.push(`/reviews/new?conversationId=${n.relatedId}`);
    } else if (n.type === "team_invite" && n.relatedId) {
      router.push(`/invitations/${n.relatedId}`);
    }
  }

  return (
    <AppChrome>
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-bold text-k-text">Notifications</h1>
        <button
          type="button"
          className="text-sm text-[#4B9EFF]"
          onClick={async () => {
            await fetch("/api/notifications/read", { method: "POST" });
            void load();
          }}
        >
          Mark all read
        </button>
      </div>
      <div className="mt-6 space-y-6">
        {loading ? <PageSkeleton /> : grouped.length === 0 ? <EmptyState title="No notifications yet" description="When employers view or save your profile, you'll see it here." /> : null}
        {!loading &&
          grouped.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-k-text-muted">{group.label}</p>
              <div className="space-y-2">
                {group.items.map((n) => (
                  <button
                    type="button"
                    key={n.id}
                    className={`flex w-full items-start gap-3 rounded-[12px] border p-4 text-left text-sm ${n.isRead ? "border-k-border bg-k-surface" : "border-[#4B9EFF]/30 bg-[#4B9EFF]/5"}`}
                    onClick={() => routeByNotification(n)}
                  >
                    <NotificationIcon type={n.type} />
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold ${n.isRead ? "text-k-text" : "text-k-text"}`}>{n.title}</p>
                      <p className={`mt-0.5 ${n.isRead ? "text-k-text-muted" : "text-k-text-secondary"}`}>{n.body}</p>
                      <p className="mt-1 text-xs text-k-text-muted">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>
      <Link href="/dashboard" className="mt-6 inline-block text-sm text-k-primary">
        ← Back
      </Link>
    </AppChrome>
  );
}
