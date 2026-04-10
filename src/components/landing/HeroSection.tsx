"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { HeroParticleCanvas } from "./HeroParticleCanvas";
import { avatarGradientForName, initialFromName } from "@/lib/avatar-style";

function runCountUp(
  target: number,
  durationMs: number,
  onUpdate: (n: number) => void,
  onDone?: () => void,
) {
  const steps = Math.max(1, Math.ceil(durationMs / 16));
  const step = target / steps;
  let count = 0;
  const id = window.setInterval(() => {
    count++;
    const v = Math.min(target, Math.round(step * count));
    onUpdate(v);
    if (count >= steps || v >= target) {
      window.clearInterval(id);
      onUpdate(target);
      onDone?.();
    }
  }, 16);
  return id;
}

export function HeroSection() {
  const { t } = useTranslation();
  const line2Ref = useRef<HTMLSpanElement>(null);
  const [candidates, setCandidates] = useState(0);
  const [employers, setEmployers] = useState(0);
  const [categories, setCategories] = useState(0);
  const [cities, setCities] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = line2Ref.current;
    if (!el) return;

    if (reduced) {
      el.style.backgroundPosition = "0% 50%";
      return;
    }

    let pos = 0;
    const id = window.setInterval(() => {
      pos = (pos + 0.5) % 200;
      el.style.backgroundPosition = `${pos}% 50%`;
    }, 30);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      queueMicrotask(() => {
        setCandidates(2400);
        setEmployers(340);
        setCategories(18);
        setCities(12);
      });
      return;
    }

    const t0 = window.setTimeout(() => {
      runCountUp(2400, 1200, setCandidates);
      runCountUp(340, 1000, setEmployers);
      runCountUp(18, 800, setCategories);
      runCountUp(12, 700, setCities);
    }, 1000);
    return () => window.clearTimeout(t0);
  }, []);

  const fmtCandidates =
    candidates >= 2400 ? "2,400+" : candidates.toLocaleString("en-US");
  const fmtEmployers = employers >= 340 ? "340+" : employers.toLocaleString("en-US");

  return (
    <section className="relative overflow-hidden bg-[#0A0F1E] px-8 pb-[60px] pt-[80px] text-center">
      <HeroParticleCanvas className="absolute inset-0 z-0 h-full w-full opacity-100" />

      <div
        className="pointer-events-none absolute left-1/2 top-0 z-1 h-[min(82vw,620px)] w-[min(155vw,1000px)] -translate-x-1/2 rounded-full k-landing-hero-ambient-glow"
        style={{
          background:
            "radial-gradient(circle, rgba(75,158,255,0.3) 0%, rgba(75,158,255,0.09) 36%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-[18%] top-[2%] z-1 h-[min(48vw,500px)] w-[min(48vw,500px)] rounded-full k-landing-hero-ambient-glow-delay-1"
        style={{
          background:
            "radial-gradient(circle, rgba(167,139,250,0.24) 0%, rgba(167,139,250,0.07) 40%, transparent 72%)",
        }}
      />
      <div
        className="pointer-events-none absolute -left-[18%] bottom-[-5%] z-1 h-[min(52vw,520px)] w-[min(52vw,520px)] rounded-full k-landing-hero-ambient-glow-delay-2"
        style={{
          background: "radial-gradient(circle, rgba(29,158,117,0.16) 0%, rgba(29,158,117,0.05) 42%, transparent 72%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-[8%] right-[8%] z-1 h-[min(38vw,380px)] w-[min(38vw,380px)] rounded-full k-landing-hero-ambient-glow-delay-3"
        style={{
          background: "radial-gradient(circle, rgba(123,111,255,0.11) 0%, transparent 68%)",
        }}
      />

      <div className="relative z-10 mx-auto flex max-w-[720px] flex-col items-center">
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(75,158,255,0.25)] bg-[rgba(75,158,255,0.1)] px-4 py-2 text-xs font-semibold leading-snug text-[#4B9EFF] k-landing-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          <span
            className="ml-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#4B9EFF]"
            style={{ animation: "k-landing-badge-dot-pulse 2s ease-in-out infinite both" }}
            aria-hidden
          />
          {t("hero.badge")}
        </div>

        <h1 className="max-w-[22ch] text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-5xl md:max-w-none md:text-[56px]">
          <span
            className="block text-white k-landing-slide-up"
            style={{ animationDelay: "0.4s" }}
          >
            {t("hero.line1")}
          </span>
          <span
            ref={line2Ref}
            className="mt-1 block bg-[linear-gradient(90deg,#4B9EFF_0%,#A78BFA_50%,#4B9EFF_100%)] bg-clip-text text-transparent k-landing-slide-up"
            style={{
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              backgroundSize: "200% 100%",
              backgroundPosition: "0% 50%",
              animationDelay: "0.55s",
            }}
          >
            {t("hero.line2")}
          </span>
        </h1>

        <p
          className="mt-6 max-w-[400px] text-[14px] leading-relaxed text-[rgba(255,255,255,0.42)] k-landing-slide-up"
          style={{ animationDelay: "0.7s" }}
        >
          {t("hero.sub")}
        </p>

        <div
          className="mt-8 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:flex-row sm:gap-4"
        >
          <Link
            href="/register/employer"
            className="k-btn-text k-landing-glow-pulse inline-flex min-h-11 items-center justify-center rounded-k-btn bg-[linear-gradient(135deg,#4B9EFF,#7B6FFF)] px-6 py-3 text-center text-white transition-[transform,box-shadow] k-landing-slide-up hover:-translate-y-0.5 hover:shadow-[0_0_48px_rgba(75,158,255,0.45)] active:scale-[0.97]"
            style={{ animationDelay: "0.85s" }}
          >
            {t("hero.ctaHire")}
          </Link>
          <Link
            href="/register/employee"
            className="k-btn-text k-landing-glow-pulse-red inline-flex min-h-11 items-center justify-center rounded-k-btn bg-[linear-gradient(135deg,#FB7185,#EF4444)] px-6 py-3 text-center text-white transition-[transform,box-shadow] k-landing-slide-up hover:-translate-y-0.5 hover:shadow-[0_0_48px_rgba(239,68,68,0.45)] active:scale-[0.97]"
            style={{ animationDelay: "0.85s" }}
          >
            {t("hero.ctaProfile")}
          </Link>
        </div>

        <div className="relative mt-12 w-full max-w-[900px] md:h-[180px] k-landing-fade-cards">
          <div className="flex flex-col items-center gap-4 md:absolute md:inset-x-0 md:top-0 md:flex-row md:items-start md:justify-between md:gap-3 md:px-1">
            <article
              className="k-hero-float-card w-full max-w-[280px] p-3.5 text-left text-[11px] md:mt-2 md:w-[min(100%,260px)] md:max-w-[260px] k-landing-float"
              style={{ animationDelay: "0s" }}
            >
              <div className="k-hero-float-card__inner">
                <p className="truncate font-semibold text-white">{t("hero.floatCard1Name")}</p>
                <p className="mt-0.5 truncate text-[rgba(255,255,255,0.5)]">{t("hero.floatCard1Role")}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" aria-hidden />
                  {t("hero.floatAvailable")}
                </p>
                <p className="mt-1.5 text-[10px] text-[rgba(255,255,255,0.38)]">
                  {t("hero.floatSkills")}:{" "}
                  <span className="text-[rgba(147,197,253,0.85)]">{t("hero.floatCard1Skills")}</span>
                </p>
                <p className="mt-1.5 bg-[linear-gradient(90deg,#fff,#94a3b8)] bg-clip-text font-medium tabular-nums text-transparent">
                  {t("hero.floatCard1Salary")}
                </p>
              </div>
            </article>

            <article
              className="k-hero-float-card k-hero-float-card--team z-2 w-full max-w-[280px] p-3.5 text-left text-[11px] md:max-w-[280px] k-landing-float"
              style={{ animationDelay: "0.8s" }}
            >
              <div className="k-hero-float-card__inner">
                <span className="inline-block rounded-md bg-[linear-gradient(135deg,#4B9EFF,#7B6FFF)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-[0_0_14px_rgba(75,158,255,0.45)]">
                  {t("hero.floatTeamBadge")}
                </span>
                <p className="mt-2 truncate font-semibold text-white">{t("hero.floatCard2Name")}</p>
                <p className="mt-0.5 truncate text-[rgba(186,230,253,0.65)]">{t("hero.floatCard2Tagline")}</p>
                <div className="mt-2 flex -space-x-2">
                  {["Sardor", "Madina", "Bobur"].map((name, i) => {
                    const g = avatarGradientForName(name);
                    return (
                      <div
                        key={name}
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[rgba(10,15,30,0.95)] text-[9px] font-medium shadow-md"
                        style={{
                          background: `linear-gradient(145deg, ${g.from}, ${g.to})`,
                          color: g.text,
                          zIndex: 3 - i,
                        }}
                      >
                        {initialFromName(name)}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 bg-[linear-gradient(90deg,#e0e7ff,#93c5fd)] bg-clip-text font-medium tabular-nums text-transparent">
                  {t("hero.floatCard2Salary")}
                </p>
              </div>
            </article>

            <article
              className="k-hero-float-card w-full max-w-[280px] p-3.5 text-left text-[11px] md:mt-2 md:w-[min(100%,260px)] md:max-w-[260px] k-landing-float"
              style={{ animationDelay: "1.6s" }}
            >
              <div className="k-hero-float-card__inner">
                <p className="truncate font-semibold text-white">{t("hero.floatCard3Name")}</p>
                <p className="mt-0.5 truncate text-[rgba(255,255,255,0.5)]">{t("hero.floatCard3Role")}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" aria-hidden />
                  {t("hero.floatAvailable")}
                </p>
                <p className="mt-1.5 text-[10px] text-[rgba(255,255,255,0.38)]">
                  {t("hero.floatSkills")}:{" "}
                  <span className="text-[rgba(147,197,253,0.85)]">{t("hero.floatCard3Skills")}</span>
                </p>
                <p className="mt-1.5 bg-[linear-gradient(90deg,#fff,#94a3b8)] bg-clip-text font-medium tabular-nums text-transparent">
                  {t("hero.floatCard3Salary")}
                </p>
              </div>
            </article>
          </div>
        </div>

        <div
          className="mt-10 w-full max-w-[720px] rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] px-4 py-5 sm:px-6 k-landing-slide-up"
          style={{ animationDelay: "1.2s" }}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-2">
            <div className="text-center">
              <div
                className="bg-[linear-gradient(180deg,#ffffff_0%,rgba(255,255,255,0.6)_100%)] bg-clip-text text-xl font-bold tabular-nums text-transparent sm:text-2xl"
                style={{ WebkitBackgroundClip: "text" }}
              >
                {fmtCandidates}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.35)]">
                {t("hero.statCandidates")}
              </div>
            </div>
            <div className="text-center">
              <div
                className="bg-[linear-gradient(180deg,#ffffff_0%,rgba(255,255,255,0.6)_100%)] bg-clip-text text-xl font-bold tabular-nums text-transparent sm:text-2xl"
                style={{ WebkitBackgroundClip: "text" }}
              >
                {fmtEmployers}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.35)]">
                {t("hero.statEmployers")}
              </div>
            </div>
            <div className="text-center">
              <div
                className="bg-[linear-gradient(180deg,#ffffff_0%,rgba(255,255,255,0.6)_100%)] bg-clip-text text-xl font-bold tabular-nums text-transparent sm:text-2xl"
                style={{ WebkitBackgroundClip: "text" }}
              >
                {categories}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.35)]">
                {t("hero.statCategories")}
              </div>
            </div>
            <div className="text-center">
              <div
                className="bg-[linear-gradient(180deg,#ffffff_0%,rgba(255,255,255,0.6)_100%)] bg-clip-text text-xl font-bold tabular-nums text-transparent sm:text-2xl"
                style={{ WebkitBackgroundClip: "text" }}
              >
                {cities}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.35)]">
                {t("hero.statCities")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
