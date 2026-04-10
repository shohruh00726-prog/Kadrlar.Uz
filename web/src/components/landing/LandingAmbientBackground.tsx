"use client";

import { SectionParticleCanvas } from "./SectionParticleCanvas";

/**
 * Hero-parity motion: particle network + large radial glows that breathe via scale (not faded opacity).
 */
export function LandingAmbientBackground({
  variant,
}: {
  variant: "howItWorks" | "employers" | "teams" | "banner" | "footer";
}) {
  const particleLayer =
    variant === "banner" ? (
      <SectionParticleCanvas className="absolute inset-0 z-0 h-full w-full opacity-70" />
    ) : (
      <SectionParticleCanvas className="absolute inset-0 z-0 h-full w-full opacity-90" />
    );

  if (variant === "howItWorks") {
    return (
      <>
        {particleLayer}
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-0 h-[min(72vw,520px)] w-[min(135vw,920px)] -translate-x-1/2 rounded-full k-landing-ambient-glow"
          style={{
            background: "radial-gradient(circle, rgba(75,158,255,0.22) 0%, rgba(75,158,255,0.06) 42%, transparent 72%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-[15%] top-[15%] z-0 h-[min(62vw,440px)] w-[min(62vw,440px)] rounded-full k-landing-ambient-glow-delay-1"
          style={{
            background: "radial-gradient(circle, rgba(167,139,250,0.18) 0%, rgba(167,139,250,0.05) 45%, transparent 72%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-[15%] -left-[8%] z-0 h-[min(55vw,400px)] w-[min(55vw,400px)] rounded-full k-landing-ambient-glow-delay-2"
          style={{
            background: "radial-gradient(circle, rgba(29,158,117,0.12) 0%, transparent 70%)",
          }}
          aria-hidden
        />
      </>
    );
  }

  if (variant === "employers") {
    return (
      <>
        {particleLayer}
        <div
          className="pointer-events-none absolute -left-[8%] top-[5%] z-0 h-[min(58vw,460px)] w-[min(58vw,460px)] rounded-full k-landing-ambient-glow"
          style={{
            background: "radial-gradient(circle, rgba(75,158,255,0.2) 0%, rgba(75,158,255,0.06) 40%, transparent 72%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-[8%] top-1/2 z-0 h-[min(88vw,560px)] w-[min(88vw,560px)] -translate-y-1/2 rounded-full k-landing-ambient-glow-delay-1"
          style={{
            background: "radial-gradient(circle, rgba(167,139,250,0.22) 0%, rgba(167,139,250,0.07) 42%, transparent 70%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[-18%] left-[20%] z-0 h-[min(45vw,340px)] w-[min(45vw,340px)] rounded-full k-landing-ambient-glow-delay-2"
          style={{
            background: "radial-gradient(circle, rgba(75,158,255,0.1) 0%, transparent 68%)",
          }}
          aria-hidden
        />
      </>
    );
  }

  if (variant === "teams") {
    return (
      <>
        {particleLayer}
        <div
          className="pointer-events-none absolute -right-[5%] top-0 z-0 h-[min(75vw,500px)] w-[min(75vw,500px)] rounded-full k-landing-ambient-glow"
          style={{
            background: "radial-gradient(circle, rgba(75,158,255,0.2) 0%, rgba(75,158,255,0.06) 38%, transparent 70%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-[22%] -left-[12%] z-0 h-[min(58vw,420px)] w-[min(58vw,420px)] rounded-full k-landing-ambient-glow-delay-1"
          style={{
            background: "radial-gradient(circle, rgba(29,158,117,0.16) 0%, rgba(29,158,117,0.05) 45%, transparent 72%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/3 top-[40%] z-0 h-[min(40vw,320px)] w-[min(40vw,320px)] -translate-x-1/2 rounded-full k-landing-ambient-glow-delay-2"
          style={{
            background: "radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)",
          }}
          aria-hidden
        />
      </>
    );
  }

  if (variant === "banner") {
    return (
      <>
        {particleLayer}
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          aria-hidden
        >
          <div
            className="absolute left-[20%] top-1/2 h-[180%] w-[90%] -translate-y-1/2 k-landing-ambient-glow"
            style={{
              background: "radial-gradient(ellipse at 35% 45%, rgba(75,158,255,0.16) 0%, transparent 58%)",
            }}
          />
          <div
            className="absolute right-[10%] top-1/2 h-[160%] w-[75%] -translate-y-1/2 k-landing-ambient-glow-delay-1"
            style={{
              background: "radial-gradient(ellipse at 65% 55%, rgba(167,139,250,0.14) 0%, transparent 55%)",
            }}
          />
        </div>
      </>
    );
  }

  /* footer: glows only (no canvas — keep end of page calm) */
  return (
    <>
      <div
        className="pointer-events-none absolute -left-[25%] bottom-[-40px] z-0 h-[260px] w-[260px] rounded-full k-landing-ambient-glow-delay-2"
        style={{
          background: "radial-gradient(circle, rgba(75,158,255,0.14) 0%, transparent 72%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-[20%] -top-[30px] z-0 h-[240px] w-[240px] rounded-full k-landing-ambient-glow-delay-1"
        style={{
          background: "radial-gradient(circle, rgba(167,139,250,0.11) 0%, transparent 72%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 bottom-0 z-0 h-[120px] w-[min(80vw,480px)] -translate-x-1/2 rounded-full k-landing-ambient-glow"
        style={{
          background: "radial-gradient(ellipse, rgba(75,158,255,0.08) 0%, transparent 75%)",
        }}
        aria-hidden
      />
    </>
  );
}
