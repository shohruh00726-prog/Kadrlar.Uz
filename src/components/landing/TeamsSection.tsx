"use client";

import { useTranslation } from "react-i18next";
import { LandingAmbientBackground } from "./LandingAmbientBackground";
import { MockTeamCard } from "./MockTeamCard";
import { useScrollReveal } from "./useScrollReveal";

const REVEAL =
  "k-landing-reveal-allow transition-[opacity,transform] duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export function TeamsSection() {
  const { t } = useTranslation();
  const { ref, visible } = useScrollReveal<HTMLElement>(0);

  return (
    <section
      id="teams"
      ref={ref}
      className="relative overflow-hidden border-t border-[rgba(255,255,255,0.05)] bg-[#0D1426] px-8 py-[60px] text-center"
    >
      <LandingAmbientBackground variant="teams" />
      <span
        className={`${REVEAL} relative z-10 inline-block rounded-full bg-[rgba(29,158,117,0.15)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1D9E75] ${
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
        style={{ transitionDelay: visible ? "0.05s" : "0s" }}
      >
        {t("teams.badge")}
      </span>
      <h2
        className={`${REVEAL} relative z-10 mt-4 text-[24px] font-extrabold text-white md:text-[28px] ${
          visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
        style={{ transitionDelay: visible ? "0.12s" : "0s" }}
      >
        {t("teams.title")}
      </h2>
      <p
        className={`${REVEAL} relative z-10 mx-auto mt-4 max-w-[560px] text-sm leading-relaxed text-[rgba(255,255,255,0.55)] md:text-[15px] ${
          visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
        style={{ transitionDelay: visible ? "0.2s" : "0s" }}
      >
        {t("teams.body")}
      </p>

      <div
        className={`${REVEAL} relative z-10 mx-auto mt-10 max-w-md text-left ${
          visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
        }`}
        style={{ transitionDelay: visible ? "0.32s" : "0s" }}
      >
        <div className="k-landing-glow-pulse rounded-k-card">
          <MockTeamCard
            variant="landingDark"
            teamLabel={t("teams.teamLabel")}
            name={t("teams.teamName")}
            tagline={t("teams.teamTagline")}
            members={[
              { fullName: "Sardor", initial: "S" },
              { fullName: "Madina", initial: "M" },
              { fullName: "Bobur", initial: "B" },
            ]}
            skills={["UI/UX", "React", "PM"]}
            priceMin={2000}
            priceMax={3500}
            priceType="project"
            viewTeamLabel={t("teams.viewTeam")}
            membersLabel={t("teams.members", { count: 3 })}
            href="/browse?tab=teams"
          />
        </div>
      </div>
    </section>
  );
}
