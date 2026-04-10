"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { LandingAmbientBackground } from "./LandingAmbientBackground";
import { useScrollReveal } from "./useScrollReveal";

const REVEAL =
  "k-landing-reveal-allow transition-[opacity,transform] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export function SiteFooter() {
  const { t } = useTranslation();
  const { ref, visible } = useScrollReveal<HTMLElement>(0);
  const year = 2026;

  const links = [
    { href: "#how-it-works", label: t("nav.howItWorks") },
    { href: "#for-employers", label: t("nav.forEmployers") },
    { href: "#teams", label: t("nav.teams") },
    { href: "#", label: t("footer.privacy") },
    { href: "#", label: t("footer.terms") },
    { href: "#", label: t("footer.contact") },
  ];

  return (
    <footer
      ref={ref}
      className="relative overflow-hidden border-t border-[rgba(255,255,255,0.05)] bg-[#060A14] px-8 py-12"
    >
      <LandingAmbientBackground variant="footer" />
      <div className="relative z-10 mx-auto grid max-w-[1200px] gap-10 md:grid-cols-3 md:items-center md:gap-8">
        <Link
          href="/"
          className={`${REVEAL} justify-self-start text-lg font-extrabold ${
            visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <span className="text-white">Kadrlar</span>
          <span className="k-gradient-text">.uz</span>
        </Link>

        <p
          className={`${REVEAL} text-center text-xs text-[rgba(255,255,255,0.45)] md:order-0 ${
            visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
          style={{ transitionDelay: visible ? "0.1s" : "0s" }}
        >
          {t("footer.copyright", { year })}
        </p>

        <nav
          className={`${REVEAL} flex flex-wrap justify-end gap-x-5 gap-y-2 md:justify-self-end ${
            visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
          style={{ transitionDelay: visible ? "0.18s" : "0s" }}
        >
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[13px] text-[rgba(255,255,255,0.55)] transition-colors duration-200 hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
      <p
        className={`${REVEAL} relative z-10 mx-auto mt-8 max-w-2xl text-center text-[11px] leading-relaxed text-[rgba(255,255,255,0.35)] md:mt-10 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        style={{ transitionDelay: visible ? "0.26s" : "0s" }}
      >
        {t("footer.note")}
      </p>
    </footer>
  );
}
