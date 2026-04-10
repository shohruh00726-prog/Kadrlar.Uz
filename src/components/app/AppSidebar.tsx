"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "@/components/landing/LanguageToggle";

type SidebarLink = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
};

type Props = {
  userType: "employee" | "employer";
  displayName: string;
  avatarUrl?: string | null;
  unreadMessages?: number;
  unreadNotifications?: number;
  teamId?: string | null;
  hasTeam?: boolean;
  userId?: string;
  children: React.ReactNode;
};

export function AppSidebarLayout({
  userType,
  displayName,
  avatarUrl,
  unreadMessages = 0,
  unreadNotifications = 0,
  teamId,
  hasTeam,
  userId,
  children,
}: Props) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const employeeLinks: SidebarLink[] = [
    { href: "/home", label: t("common.home"), icon: "⌂" },
    { href: "/profile/edit", label: t("employeeHome.myProfile"), icon: "◉" },
    { href: "/messages", label: t("common.messages"), icon: "◔", badge: unreadMessages },
    { href: "/notifications", label: t("common.notifications"), icon: "◍", badge: unreadNotifications },
    hasTeam && teamId
      ? { href: `/teams/${teamId}`, label: t("employeeHome.myTeam"), icon: "◎" }
      : { href: "/teams/create", label: t("employeeHome.createTeam"), icon: "◎" },
    { href: "/settings", label: t("common.settings"), icon: "⚙" },
  ];

  const employerLinks: SidebarLink[] = [
    { href: "/home", label: t("common.home"), icon: "⌂" },
    { href: "/browse", label: t("common.browseCandidates"), icon: "⊞" },
    { href: "/saved", label: t("employerHome.savedCandidates"), icon: "★" },
    { href: "/saved-searches", label: t("savedSearches.title"), icon: "🔖" },
    { href: "/messages", label: t("common.messages"), icon: "◔", badge: unreadMessages },
    { href: "/notifications", label: t("common.notifications"), icon: "◍", badge: unreadNotifications },
    { href: "/settings", label: t("employerHome.companyProfile"), icon: "◧" },
    { href: "/settings", label: t("common.settings"), icon: "⚙" },
  ];

  const links = userType === "employee" ? employeeLinks : employerLinks;

  return (
    <div className="flex min-h-screen bg-k-page">
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col border-e border-k-border bg-k-surface md:flex">
        <div className="flex items-center gap-3 border-b border-k-border px-4 py-4">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-[#4B9EFF] to-[#8B5CF6] text-sm font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-k-text">{displayName}</p>
            <p className="text-[11px] text-k-text-muted">{userType === "employee" ? "Employee" : "Employer"}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/home" && pathname.startsWith(link.href));
            return (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] transition-colors ${
                  active
                    ? "bg-[#4B9EFF15] font-semibold text-[#4B9EFF]"
                    : "text-k-text-muted hover:bg-k-surface-elevated hover:text-k-text-secondary"
                }`}
              >
                <span className="w-5 text-center">{link.icon}</span>
                <span className="flex-1">{link.label}</span>
                {link.badge && link.badge > 0 ? (
                  <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-linear-to-r from-[#4B9EFF] to-[#8B5CF6] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {link.badge > 99 ? "99+" : link.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-k-border px-4 py-3">
          {userType === "employee" && (
            <Link
              href={`/candidates/${userId}`}
              className="mb-2 flex items-center gap-1.5 text-xs text-k-text-muted hover:text-[#4B9EFF]"
            >
              <span>↗</span> {t("employeeHome.viewPublicProfile")}
            </Link>
          )}
          <LanguageToggle variant="onDark" />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className={`mx-auto px-4 py-8 md:px-8 ${userType === "employer" ? "max-w-[1000px]" : "max-w-[900px]"}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
