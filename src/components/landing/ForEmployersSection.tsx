"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { LandingAmbientBackground } from "./LandingAmbientBackground";
import { useScrollReveal } from "./useScrollReveal";
import { avatarGradientForName, initialFromName } from "@/lib/avatar-style";

const REVEAL =
  "k-landing-reveal-allow transition-[opacity,transform] duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export function ForEmployersSection() {
  const { t } = useTranslation();
  const { ref, visible } = useScrollReveal<HTMLElement>(0);

  const cards = [
    { key: "sarvar", nameKey: "forEmployers.miniSarvar", roleKey: "forEmployers.miniSarvarRole" },
    { key: "malika", nameKey: "forEmployers.miniMalika", roleKey: "forEmployers.miniMalikaRole" },
    { key: "dilnoza", nameKey: "forEmployers.miniDilnoza", roleKey: "forEmployers.miniDilnozaRole" },
    { key: "bobur", nameKey: "forEmployers.miniBobur", roleKey: "forEmployers.miniBoburRole" },
  ] as const;

  return (
    <section
      id="for-employers"
      ref={ref}
      className="relative overflow-hidden bg-[#0A0F1E] px-8 py-[60px]"
    >
      <LandingAmbientBackground variant="employers" />

      <div className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div
          className={`${REVEAL} ${
            visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#A78BFA]">
            {t("forEmployers.eyebrow")}
          </p>
          <h2 className="mt-2 text-[28px] font-extrabold leading-tight text-white md:text-[30px]">
            {t("forEmployers.title")}
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-[rgba(255,255,255,0.55)] md:text-[15px]">
            {t("forEmployers.body")}
          </p>
          <Link
            href="/browse"
            className="k-btn-text mt-8 inline-flex min-h-11 items-center justify-center rounded-k-btn bg-[linear-gradient(135deg,#4B9EFF,#7B6FFF)] px-7 py-3 text-white transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(75,158,255,0.35)] active:scale-[0.97]"
          >
            {t("forEmployers.cta")}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {cards.map((c, i) => {
            const name = t(c.nameKey);
            const role = t(c.roleKey);
            const g = avatarGradientForName(name);
            return (
              <article
                key={c.key}
                className={`${REVEAL} rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D1426] p-3 hover:border-[rgba(75,158,255,0.35)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.35)] ${
                  visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                }`}
                style={{ transitionDelay: visible ? `${0.08 + i * 0.11}s` : "0s" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    style={{
                      background: `linear-gradient(145deg, ${g.from}, ${g.to})`,
                      color: g.text,
                    }}
                  >
                    {initialFromName(name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{name}</p>
                    <p className="truncate text-xs text-[rgba(255,255,255,0.45)]">{role}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
