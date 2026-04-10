"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LanguageToggle } from "@/components/landing/LanguageToggle";
import { useSession } from "@/components/providers/SessionProvider";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  relatedId: string | null;
  createdAt: string;
  isRead: boolean;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "new_message" || type === "candidate_reply") {
    return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4B9EFF26] text-[#4B9EFF]">◔</span>;
  }
  if (type === "profile_viewed") {
    return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-k-surface-elevated text-k-text-muted">◉</span>;
  }
  if (type === "profile_saved") {
    return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EF9F2726] text-[#EF9F27]">▮</span>;
  }
  if (type === "contact_viewed") {
    return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1D9E7526] text-[#1D9E75]">◌</span>;
  }
  if (type === "team_invite") {
    return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#A78BFA26] text-[#A78BFA]">◎</span>;
  }
  return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-k-surface-elevated text-k-text-muted">•</span>;
}

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user: sessionUser, isLoading: sessionLoading } = useSession();
  const me = sessionLoading ? undefined : sessionUser;
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [pulse, setPulse] = useState(false);
  const prevUnreadRef = useRef(0);
  const bellWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!me) return;
    try {
      const stored = localStorage.getItem("k-theme");
      if (!stored && me.theme) {
        const safe = me.theme === "light" || me.theme === "dark" || me.theme === "system" ? me.theme : "light";
        document.documentElement.setAttribute("data-theme", safe);
        localStorage.setItem("k-theme", safe);
      }
    } catch { /* no-op */ }
  }, [me]);

  useEffect(() => {
    if (!me) return;
    let cancel = false;
    const load = async () => {
      try {
        const r = await fetch("/api/notifications");
        const j = await r.json();
        if (cancel) return;
        const nextUnread = Number(j.unread ?? 0);
        setRows((j.notifications ?? []).slice(0, 5));
        setUnread(nextUnread);
        if (nextUnread > prevUnreadRef.current) {
          setPulse(true);
          setTimeout(() => setPulse(false), 800);
        }
        prevUnreadRef.current = nextUnread;
      } catch {
        if (!cancel) {
          setRows([]);
          setUnread(0);
        }
      }
    };
    void load();
    const timer = window.setInterval(load, 20_000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [me]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!bellWrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const previewItems = useMemo(() => rows.slice(0, 5), [rows]);

  if (me === undefined) {
    return (
      <header className="h-[56px] border-b border-k-nav-edge bg-k-page/95 backdrop-blur-[20px]" />
    );
  }

  if (!me) {
    return (
      <header className="sticky top-0 z-40 h-[56px] border-b border-k-nav-edge bg-k-page/95 backdrop-blur-[20px]">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 md:px-7">
          <Link href="/" className="text-[18px] font-bold">
            <span className="text-k-text">Kadrlar</span>
            <span className="k-gradient-text">.uz</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link href="/login" className="text-sm text-k-text-secondary hover:text-white">
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-k-btn bg-white px-3 py-2 text-sm font-bold text-k-page"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>
    );
  }

  const isEmployee = me.userType === "employee";
  const links = isEmployee
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/profile/edit", label: "My profile" },
        { href: "/messages", label: "Messages" },
        { href: "/notifications", label: "Notifications" },
        { href: "/teams", label: "Teams" },
        { href: "/settings", label: "Settings" },
      ]
    : [
        { href: "/browse", label: "Browse" },
        { href: "/saved", label: "Saved" },
        { href: "/saved-searches", label: "Radars" },
        { href: "/messages", label: "Messages" },
        { href: "/notifications", label: "Notifications" },
        { href: "/dashboard", label: "Dashboard" },
        { href: "/settings", label: "Settings" },
      ];
  const bellColor = open ? "text-k-text" : "text-k-text-secondary hover:text-k-text";
  const hasUnread = unread > 0;

  function routeForNotification(n: NotificationRow) {
    if (n.type === "new_message" || n.type === "candidate_reply") {
      if (n.relatedId) router.push(`/messages/${n.relatedId}`);
      return;
    }
    if (n.type === "review_request" && n.relatedId) {
      router.push(`/reviews/new?conversationId=${n.relatedId}`);
      return;
    }
    if (n.type === "team_invite" && n.relatedId) {
      router.push(`/invitations/${n.relatedId}`);
      return;
    }
    router.push("/notifications");
  }

  return (
    <header className="sticky top-0 z-40 h-[56px] border-b border-k-nav-edge bg-k-page/95 backdrop-blur-[20px]">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-2 px-2 md:px-7">
        <Link href="/home" className="shrink-0 text-[18px] font-bold">
          <span className="text-k-text">Kadrlar</span>
          <span className="k-gradient-text">.uz</span>
        </Link>
        <nav className="hidden flex-1 flex-wrap justify-end gap-3 md:flex lg:gap-5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-[13px] ${pathname === l.href ? "font-semibold text-k-primary" : "text-k-text-muted hover:text-k-text"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <div className="relative" ref={bellWrapRef}>
            <button
              type="button"
              className={`relative p-1 ${bellColor}`}
              aria-label="Notifications"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="text-base">◍</span>
              {hasUnread ? (
                <span
                  className="absolute -right-1 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-1 text-[10px] font-semibold text-white"
                  style={pulse ? { animation: "pulse 0.75s ease-out 1" } : undefined}
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
            </button>
            <div className={`absolute right-0 top-10 z-50 w-[340px] origin-top-right rounded-[16px] border border-k-border bg-k-surface transition-all duration-200 ease-in-out ${open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-2 scale-95 opacity-0"}`}>
              <div className="flex items-center justify-between border-b border-k-border px-4 py-3">
                <p className="font-bold text-k-text">Notifications</p>
                <button
                  type="button"
                  className="text-xs text-[#4B9EFF]"
                  onClick={async () => {
                    await fetch("/api/notifications/read", { method: "POST" });
                    setUnread(0);
                    setRows((prev) => prev.map((x) => ({ ...x, isRead: true })));
                  }}
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-[420px] overflow-y-auto p-2">
                {previewItems.length === 0 ? (
                  <p className="p-3 text-xs text-k-text-muted">No notifications yet.</p>
                ) : (
                  previewItems.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => routeForNotification(n)}
                      className={`mb-1 flex w-full items-start gap-2 rounded-[12px] px-2 py-2 text-left ${n.isRead ? "bg-transparent" : "border-l-2 border-l-[#4B9EFF] bg-[#4B9EFF0D]"}`}
                    >
                      <NotificationIcon type={n.type} />
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-xs font-semibold text-k-text">{n.title}</p>
                        <p className="line-clamp-2 text-[11px] text-k-text-secondary">{n.body}</p>
                        <p className="text-[10px] text-k-text-muted">{timeAgo(n.createdAt)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="border-t border-k-border px-4 py-2">
                <Link href="/notifications" className="text-xs text-[#4B9EFF]">
                  See all
                </Link>
              </div>
            </div>
          </div>
          <span className="hidden max-w-[120px] truncate text-[12px] text-k-text-muted lg:inline">{me.fullName}</span>
          <button
            type="button"
            className="text-[12px] text-k-text-muted hover:text-k-primary"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/";
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-k-page">
      <TopNav />
      <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-7">{children}</div>
    </div>
  );
}
