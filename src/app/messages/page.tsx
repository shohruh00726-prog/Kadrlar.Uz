"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { initialFromName } from "@/lib/avatar-style";

type Row = {
  id: string;
  peerName: string;
  peerSubtitle: string;
  peerBadge?: "business" | "email" | null;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount?: number;
  status?: string;
};

export default function MessagesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "unread" | "archived">("all");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/conversations");
      if (!r.ok) return setRows([]);
      const j = await r.json();
      setRows(j.conversations ?? []);
    })();
  }, []);

  const unreadTotal = rows.reduce((acc, x) => acc + (x.unreadCount ?? 0), 0);
  const visibleRows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((x) => {
      if (tab === "unread" && !(x.unreadCount && x.unreadCount > 0)) return false;
      if (tab === "archived" && x.status !== "archived") return false;
      if (tab === "all" && x.status === "archived") return false;
      if (!qq) return true;
      return (
        x.peerName.toLowerCase().includes(qq) ||
        x.peerSubtitle.toLowerCase().includes(qq) ||
        x.lastMessage.toLowerCase().includes(qq)
      );
    });
  }, [q, rows, tab]);

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <AppChrome>
      <div className="min-h-[calc(100vh-92px)] rounded-k-card bg-k-page p-3">
        <div className="grid min-h-[calc(100vh-116px)] grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
          <aside className="rounded-k-card border-r border-k-border bg-k-surface p-3">
            <div className="mb-3 flex items-center justify-between">
              <h1 className="text-[16px] font-bold text-k-text">Messages</h1>
              <span className="rounded-full bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-2 py-0.5 text-[11px] font-semibold text-white">
                {unreadTotal}
              </span>
            </div>
            <input
              className="w-full rounded-full border border-k-border bg-k-surface-elevated px-3 py-2 text-xs text-k-text placeholder:text-k-text-muted focus:border-[#4B9EFF80] focus:shadow-[0_0_0_3px_rgba(75,158,255,0.15)] focus:outline-none"
              placeholder="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="mt-3 flex rounded-full border border-k-border bg-k-surface-elevated p-1 text-[11px]">
              {(["all", "unread", "archived"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-full px-2 py-1 capitalize ${tab === t ? "bg-[#4B9EFF26] text-[#4B9EFF]" : "text-k-text-secondary"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1">
              {visibleRows.length === 0 ? (
                <p className="px-1 py-3 text-xs text-k-text-muted">No conversations yet.</p>
              ) : (
                visibleRows.map((x) => (
                  <Link key={x.id} href={`/messages/${x.id}`} className="block rounded-[10px] px-2 py-2 hover:bg-k-surface-elevated">
                    <div className="flex items-start gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-k-text">
                        {initialFromName(x.peerName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-k-text">{x.peerName}</p>
                          <p className="text-[10px] text-k-text-muted">{formatTime(x.lastMessageAt)}</p>
                        </div>
                        <p className="line-clamp-1 text-[11px] text-k-text-muted">{x.lastMessage || "No messages yet"}</p>
                      </div>
                      {(x.unreadCount ?? 0) > 0 ? (
                        <span className="rounded-full bg-[#4B9EFF] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {x.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </aside>
          <section className="m-[12px] hidden rounded-[16px] border border-k-border bg-k-surface p-6 md:block">
            <p className="text-sm text-k-text-secondary">Select a conversation to start chatting.</p>
          </section>
        </div>
      </div>
    </AppChrome>
  );
}
