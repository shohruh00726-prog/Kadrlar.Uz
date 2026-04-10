"use client";

import { useTranslation } from "react-i18next";
import { LandingAmbientBackground } from "./LandingAmbientBackground";
import { useScrollReveal } from "./useScrollReveal";

const REVEAL =
  "k-landing-reveal-allow transition-[opacity,transform] duration-[680ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export function HowItWorksSection() {
  const { t } = useTranslation();
  const { ref, visible } = useScrollReveal<HTMLElement>(0);

  const steps = [
    { n: "1", title: t("howItWorks.step1Title"), body: t("howItWorks.step1Body") },
    { n: "2", title: t("howItWorks.step2Title"), body: t("howItWorks.step2Body") },
    { n: "3", title: t("howItWorks.step3Title"), body: t("howItWorks.step3Body") },
  ];

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="relative overflow-hidden border-t border-[rgba(255,255,255,0.05)] bg-[#0D1426] px-8 py-[60px]"
    >
      <LandingAmbientBackground variant="howItWorks" />
      <div className="relative z-10 mx-auto max-w-[1200px]">
        <div
          className={`${REVEAL} ${
            visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[#4B9EFF]">
            {t("howItWorks.eyebrow")}
          </p>
          <h2 className="mt-2 text-center text-[30px] font-extrabold text-white">
            {t("howItWorks.heading")}
          </h2>
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((s, i) => (
            <div
              key={s.n}
              className={`${REVEAL} flex flex-col items-center text-center ${
                visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
              }`}
              style={{ transitionDelay: visible ? `${0.12 + i * 0.14}s` : "0s" }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(75,158,255,0.2)] bg-[rgba(75,158,255,0.1)] text-sm font-bold text-[#4B9EFF] transition-[box-shadow,background-color,transform] duration-300 hover:scale-105 hover:bg-[rgba(75,158,255,0.2)] hover:shadow-[0_0_20px_rgba(75,158,255,0.25)]"
                style={{ width: 44, height: 44 }}
              >
                {s.n}
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{s.title}</h3>
              <p className="mt-2 w-full max-w-[280px] text-sm leading-relaxed text-[rgba(255,255,255,0.55)]">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
