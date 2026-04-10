"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

export default function AdminUserDetailPage() {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [note, setNote] = useState("");

  async function load() {
    const r = await fetch(`/api/admin/users/${id}`);
    if (!r.ok) return setData(null);
    setData(await r.json());
  }

  async function run(action: Record<string, unknown>) {
    const r = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      toast(String(j.error || "Action failed"), "error");
      return;
    }
    await load();
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const r = await fetch(`/api/admin/users/${id}`);
      if (!r.ok) return;
      const j = await r.json();
      if (active) setData(j);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const user = (data?.user as Record<string, unknown>) || null;
  const stats = (data?.stats as Record<string, unknown>) || null;
  const notes = (data?.adminNotes as { id: string; notes: string; performedAt: string; by: string }[]) || [];

  if (!user) return <p className="text-sm text-k-text-muted">Loading...</p>;

  return (
    <div>
      <h1 className="k-h1">User Detail</h1>
      <div className="mt-4 rounded-k-card border border-k-border bg-k-surface p-4">
        <p className="text-k-text font-medium">{String(user.fullName)}</p>
        <p className="text-sm">{String(user.email)}</p>
        <p className="text-sm">Type: {String(user.userType)} · City: {String(user.city || "-")}</p>
        <p className="text-sm">Last active: {user.lastActive ? new Date(String(user.lastActive)).toLocaleString() : "-"}</p>
        <p className="text-sm">Registered: {new Date(String(user.createdAt)).toLocaleString()}</p>
        <p className="text-sm">Suspended: {String(Boolean(user.isSuspended))}</p>
      </div>

      <div className="mt-4 rounded-k-card border border-k-border bg-k-surface p-4">
        <p className="k-label">Activity overview</p>
        <p className="mt-2 text-sm">Profile views: {String(stats?.profileViews ?? 0)}</p>
        <p className="text-sm">Messages sent: {String(stats?.messagesSent ?? 0)}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-k-btn bg-k-primary px-3 py-2 text-sm text-white" onClick={() => run({ action: "verify_user" })}>Verify user</button>
        <button className="rounded-k-btn border border-k-border px-3 py-2 text-sm" onClick={() => {
          const reason = window.prompt("Suspend reason");
          if (reason) void run({ action: "suspend_user", reason });
        }}>Suspend</button>
        <button className="rounded-k-btn border border-k-border px-3 py-2 text-sm" onClick={() => run({ action: "unsuspend_user" })}>Unsuspend</button>
        <button className="rounded-k-btn border border-red-300 px-3 py-2 text-sm text-red-700" onClick={() => {
          if (window.confirm("Delete permanently?")) void run({ action: "delete_user", confirm: "DELETE" });
        }}>Delete permanently</button>
      </div>

      <div className="mt-4 rounded-k-card border border-k-border bg-k-surface p-4">
        <p className="k-label">Internal admin notes</p>
        <div className="mt-2 flex gap-2">
          <input className="w-full rounded-k-btn border border-k-border px-3 py-2 text-sm" placeholder="Write internal note" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="rounded-k-btn bg-k-primary px-3 py-2 text-sm text-white" onClick={async () => {
            if (!note.trim()) return;
            await run({ action: "admin_note", notes: note });
            setNote("");
          }}>Add note</button>
        </div>
        <div className="mt-3 space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-k-btn border border-k-border bg-k-page p-2 text-sm">
              <p className="text-k-text">{n.notes}</p>
              <p className="text-xs text-k-text-muted">{n.by} · {new Date(n.performedAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
