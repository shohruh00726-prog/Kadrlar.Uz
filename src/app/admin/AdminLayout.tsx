"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: "◉" },
  { href: "/admin/users", label: "Users", icon: "◎" },
  { href: "/admin/verifications", label: "Verifications", icon: "◇" },
  { href: "/admin/profiles", label: "Profiles", icon: "◈" },
  { href: "/admin/teams", label: "Teams", icon: "◆" },
  { href: "/admin/reviews", label: "Reviews", icon: "★" },
  { href: "/admin/categories", label: "Categories", icon: "▦" },
  { href: "/admin/analytics", label: "Analytics", icon: "◐" },
  { href: "/admin/reports", label: "Reports", icon: "▤" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-k-page">
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-k-border bg-k-surface p-4 md:flex">
        <Link href="/admin" className="mb-6 block text-lg font-bold">
          <span className="text-k-text">Kadrlar</span>
          <span className="bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] bg-clip-text text-transparent">.uz</span>
          <span className="ml-1 text-xs text-k-text-muted">Admin</span>
        </Link>
        <nav className="space-y-1">
          {adminLinks.map((l) => {
            const active = pathname === l.href || (l.href !== "/admin" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm transition-colors ${active ? "bg-[#4B9EFF]/15 font-medium text-[#4B9EFF]" : "text-k-text-secondary hover:bg-k-surface-elevated hover:text-k-text"}`}
              >
                <span className="w-5 text-center">{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-6">
          <button
            type="button"
            className="w-full rounded-[8px] px-3 py-2 text-left text-sm text-k-text-muted hover:text-red-400"
            onClick={async () => {
              await fetch("/api/admin/auth/logout", { method: "POST" });
              window.location.href = "/admin/login";
            }}
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
