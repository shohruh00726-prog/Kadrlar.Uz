"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "./LanguageToggle";

export function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="k-landing-nav-in sticky top-0 z-100 h-[58px] border-b border-[rgba(255,255,255,0.06)] bg-[rgba(10,15,30,0.8)] backdrop-blur-[20px]">
      <div className="relative mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 md:px-8">
        <Link href="/" className="shrink-0 text-[18px] font-extrabold tracking-tight">
          <span className="text-white">Kadrlar</span>
          <span className="k-gradient-text">.uz</span>
        </Link>

        <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 md:flex">
          <a
            href="#how-it-works"
            className="text-[13px] text-[rgba(255,255,255,0.45)] transition-colors duration-200 hover:text-[rgba(255,255,255,0.9)]"
          >
            {t("nav.howItWorks")}
          </a>
          <a
            href="#for-employers"
            className="text-[13px] text-[rgba(255,255,255,0.45)] transition-colors duration-200 hover:text-[rgba(255,255,255,0.9)]"
          >
            {t("nav.forEmployers")}
          </a>
          <a
            href="#teams"
            className="text-[13px] text-[rgba(255,255,255,0.45)] transition-colors duration-200 hover:text-[rgba(255,255,255,0.9)]"
          >
            {t("nav.teams")}
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle />
          <Link
            href="/login"
            className="k-btn-text hidden h-10 items-center justify-center rounded-k-btn border border-[rgba(255,255,255,0.18)] bg-transparent px-4 text-[13px] text-[rgba(255,255,255,0.85)] transition-colors duration-200 hover:border-[rgba(255,255,255,0.35)] hover:text-white sm:inline-flex"
          >
            {t("nav.logIn")}
          </Link>
          <Link
            href="/register"
            className="k-btn-text inline-flex h-10 items-center justify-center rounded-k-btn bg-white px-4 text-[13px] font-bold text-[#0A0F1E] transition-opacity hover:opacity-95"
          >
            {t("nav.signUp")}
          </Link>
        </div>
      </div>
    </header>
  );
}
