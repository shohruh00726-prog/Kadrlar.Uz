"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  ["Dashboard", "/admin"],
  ["Users", "/admin/users"],
  ["Profiles", "/admin/profiles"],
  ["Verifications", "/admin/verifications"],
  ["Reviews", "/admin/reviews"],
  ["Reports", "/admin/reports"],
  ["Teams", "/admin/teams"],
  ["Categories", "/admin/categories"],
  ["Settings", "/admin/settings"],
  ["Analytics", "/admin/analytics"],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-k-page">
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-0 h-screen w-64 border-r border-k-border bg-k-surface p-4">
          <p className="k-label">Kadrlar.uz Staff</p>
          <h1 className="mt-1 text-lg font-medium text-k-text">Admin panel</h1>
          <nav className="mt-6 space-y-1">
            {NAV.map(([label, href]) => (
              <Link key={href} href={href} className="block rounded-k-btn px-3 py-2 text-sm text-k-text hover:bg-k-page">
                {label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            className="mt-6 rounded-k-btn border border-k-border px-3 py-2 text-xs"
            onClick={async () => {
              await fetch("/api/admin/auth/logout", { method: "POST" });
              window.location.href = "/admin/login";
            }}
          >
            Sign out
          </button>
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
