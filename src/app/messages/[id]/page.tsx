"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppChrome } from "@/components/app/TopNav";
import { useToast } from "@/components/ui/Toast";
import { initialFromName } from "@/lib/avatar-style";

type Msg = { id: string; senderId: string; content: string; sentAt: string };
type Row = {
  id: string;
  peerName: string;
  peerSubtitle: string;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount?: number;
  status?: string;
};

async function fetchMessageThread(
  conversationId: string,
  signal?: AbortSignal,
): Promise<{ messages: Msg[]; meId: string | null; peerName: string; otherLastRead: string | null }> {
  const mRes = await fetch(`/api/conversations/${conversationId}/messages`, { signal });
  const mj = await mRes.json();
  return {
    messages: mj.messages ?? [],
    meId: mj.meId ?? null,
    peerName: mj.peerName ?? "Chat",
    otherLastRead: mj.otherLastRead ?? null,
  };
}

export default function MessageThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [peerName, setPeerName] = useState("Chat");
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "unread" | "archived">("all");
  const [otherLastRead, setOtherLastRead] = useState<string | null>(null);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) return;
    const ac = new AbortController();
    (async () => {
      try {
        const [thread, conv] = await Promise.all([
          fetchMessageThread(id, ac.signal),
          fetch("/api/conversations", { signal: ac.signal }).then((r) => r.json().catch(() => ({ conversations: [] }))),
        ]);
        const ms = thread.messages;
        const mid = thread.meId;
        setMessages(ms);
        setMeId(mid);
        setPeerName(thread.peerName);
        setOtherLastRead(thread.otherLastRead);
        setRows(conv.conversations ?? []);
      } catch {
        /* aborted or network error — ignore on unmount */
      }
    })();
    return () => ac.abort();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const timer = window.setInterval(async () => {
      try {
        const thread = await fetchMessageThread(id);
        setMessages(thread.messages);
        setOtherLastRead(thread.otherLastRead);
      } catch {
        /* ignore polling errors */
      }
    }, 8000);
    return () => window.clearInterval(timer);
  }, [id]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!text.trim() || !id) return;
    const r = await fetch(`/api/conversations/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast(String((j as { error?: string }).error || "Message could not be sent"), "error");
      return;
    }
    setText("");
    const { messages: ms, meId: mid, otherLastRead: olr } = await fetchMessageThread(id);
    setMessages(ms);
    setMeId(mid);
    setOtherLastRead(olr);
  }

  const grouped = useMemo(() => {
    const out: { label: string; items: Msg[] }[] = [];
    const dayKey = (iso: string) => new Date(iso).toDateString();
    const today = new Date().toDateString();
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = y.toDateString();
    for (const m of messages) {
      const key = dayKey(m.sentAt);
      let label = new Date(m.sentAt).toLocaleDateString();
      if (key === today) label = "Today";
      else if (key === yesterday) label = "Yesterday";
      const g = out[out.length - 1];
      if (g && g.label === label) g.items.push(m);
      else out.push({ label, items: [m] });
    }
    return out;
  }, [messages]);

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

  const formatTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

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
                <button key={t} type="button" onClick={() => setTab(t)} className={`flex-1 rounded-full px-2 py-1 capitalize ${tab === t ? "bg-[#4B9EFF26] text-[#4B9EFF]" : "text-k-text-secondary"}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1">
              {visibleRows.map((x) => {
                const active = x.id === id;
                return (
                  <Link
                    key={x.id}
                    href={`/messages/${x.id}`}
                    className={`block rounded-[10px] px-2 py-2 ${active ? "border-l-2 border-l-[#4B9EFF] bg-[#4B9EFF14]" : "hover:bg-k-surface-elevated"}`}
                  >
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
                );
              })}
            </div>
          </aside>

          <section className="m-[12px] flex min-h-[420px] flex-col rounded-[16px] border border-k-border bg-k-surface">
            <div className="flex items-center gap-2 border-b border-k-border px-4 py-3">
              <Link href="/messages" className="text-k-text-muted hover:text-white md:hidden">←</Link>
              <span className="text-sm font-semibold text-k-text">{peerName}</span>
            </div>
            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
              <div className="space-y-3">
                {grouped.map((g) => (
                  <div key={g.label}>
                    <div className="mb-3 flex justify-center">
                      <span className="rounded-full bg-k-surface-elevated px-2.5 py-1 text-[10px] text-k-text-muted">{g.label}</span>
                    </div>
                    <div className="space-y-2">
                      {g.items.map((m) => {
                        const mine = m.senderId === meId;
                        const read = mine && otherLastRead ? new Date(m.sentAt) <= new Date(otherLastRead) : false;
                        return (
                          <div key={m.id} className={`max-w-[85%] px-3 py-2 text-sm ${mine ? "ml-auto rounded-[14px_14px_3px_14px] bg-linear-to-r from-[#4B9EFF] to-[#7B6FFF] text-white" : "rounded-[14px_14px_14px_3px] border border-k-border bg-k-surface-elevated text-k-text"}`}>
                            <p>{m.content}</p>
                            <p className={`mt-1 text-[10px] ${mine ? "text-white/80" : "text-k-text-muted"}`}>
                              {formatTime(m.sentAt)} {mine ? <span className={read ? "text-[#4B9EFF]" : "text-k-text-secondary"}>✓✓</span> : null}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-k-border p-3">
              <input
                className="flex-1 rounded-k-pill border border-k-border bg-k-surface-elevated px-4 py-2 text-sm text-k-text placeholder:text-k-text-muted focus:border-[#4B9EFF80] focus:shadow-[0_0_0_3px_rgba(75,158,255,0.15)] focus:outline-none"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a message..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="button"
                className="h-[34px] w-[34px] rounded-full bg-linear-to-r from-[#4B9EFF] to-[#7B6FFF] text-sm text-white disabled:opacity-30"
                onClick={send}
                disabled={!text.trim()}
              >
                {" >"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </AppChrome>
  );
}
