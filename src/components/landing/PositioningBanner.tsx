"use client";

import { Trans, useTranslation } from "react-i18next";
import { LandingAmbientBackground } from "./LandingAmbientBackground";
import { useScrollReveal } from "./useScrollReveal";

const REVEAL =
  "k-landing-reveal-allow transition-[opacity,transform] duration-[750ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export function PositioningBanner() {
  const { t } = useTranslation();
  const { ref, visible } = useScrollReveal<HTMLElement>(0);

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden border-y border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-8 py-6 text-center"
      aria-label={t("positioning.aria")}
    >
      <LandingAmbientBackground variant="banner" />
      <p
        className={`${REVEAL} relative z-10 mx-auto max-w-3xl text-sm leading-relaxed text-[rgba(255,255,255,0.2)] ${
          visible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
        }`}
      >
        <Trans
          i18nKey="positioning.banner"
          components={{
            hh: <span className="text-[rgba(75,158,255,0.5)]" />,
            olx: <span className="text-[rgba(75,158,255,0.5)]" />,
          }}
        />
      </p>
    </section>
  );
}
