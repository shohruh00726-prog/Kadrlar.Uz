"use client";

import { useEffect, useRef } from "react";

/** Lighter field than hero — same motion language, fewer nodes, pauses off-screen. */
const N = 38;
const CONNECT_DIST = 72;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  w: number,
  h: number,
) {
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i];
      const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d < CONNECT_DIST && d > 0) {
        const t = 0.05 * (1 - d / CONNECT_DIST);
        ctx.strokeStyle = `rgba(75,158,255,${t})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
  for (const p of particles) {
    ctx.fillStyle = `rgba(75,158,255,${p.a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function SectionParticleCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const inViewRef = useRef(true);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(
      ([e]) => {
        inViewRef.current = e?.isIntersecting ?? false;
      },
      { rootMargin: "12% 0px 12% 0px", threshold: 0 },
    );
    io.observe(parent);

    let raf = 0;
    let particles: Particle[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      particles = Array.from({ length: N }, () => ({
        x: Math.random() * Math.max(w, 1),
        y: Math.random() * Math.max(h, 1),
        vx: rand(-0.22, 0.22),
        vy: rand(-0.22, 0.22),
        r: rand(0.25, 1.5),
        a: rand(0.08, 0.32),
      }));

      if (reducedMotion) {
        drawFrame(ctx, particles, w, h);
      }
    };

    const tick = () => {
      if (document.hidden || !inViewRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 2 || h < 2) {
        raf = requestAnimationFrame(tick);
        return;
      }

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x += w;
        if (p.x > w) p.x -= w;
        if (p.y < 0) p.y += h;
        if (p.y > h) p.y -= h;
      }

      drawFrame(ctx, particles, w, h);
      raf = requestAnimationFrame(tick);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    if (!reducedMotion) {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={className}
      aria-hidden
      style={{ pointerEvents: "none" }}
    />
  );
}
